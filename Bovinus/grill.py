"""Bovinus: pré-seleção de vários cortes e identificação por comanda no balcão.

Não controla nem solicita preparo na cozinha. Cortes existentes continuam sendo
produzidos e servidos conforme a rotina atual. O painel somente organiza pedidos
de atendimento/retirada, com validação humana da disponibilidade.
"""
from __future__ import annotations

import hmac
import io
import os
import secrets
import sqlite3
from datetime import datetime, timezone
from contextlib import contextmanager
from pathlib import Path
from statistics import median
from urllib.parse import urlparse
from uuid import uuid4

import qrcode
import qrcode.image.svg
from fastapi import APIRouter, Header, HTTPException, Query, Request
from fastapi.responses import FileResponse, HTMLResponse, Response
from pydantic import BaseModel, Field

BASE = Path(__file__).resolve().parent
DB = Path(os.getenv('BOVINUS_DB_PATH', str(BASE / 'bovinus_churrasqueira.sqlite3')))
PIN_DEFAULT = '2468'  # APENAS demo; configurar BOVINUS_PAINEL_PIN para uso em rede
router = APIRouter()
STATES = ('solicitado', 'preparando', 'pronto', 'entregue', 'cancelado')
DONENESS = ('Ponto da casa', 'Malpassada', 'Ao ponto', 'Bem-passada')
DEMO_CUTS = [
    ('picanha', 'Picanha', 'Corte de demonstração'),
    ('alcatra', 'Alcatra', 'Corte de demonstração'),
    ('fraldinha', 'Fraldinha', 'Corte de demonstração'),
    ('maminha', 'Maminha', 'Corte de demonstração'),
    ('frango', 'Frango', 'Corte de demonstração'),
    ('linguica', 'Linguiça', 'Corte de demonstração'),
    ('costela', 'Costela', 'Corte de demonstração'),
    ('contrafile', 'Contra-filé', 'Corte de demonstração'),
    ('cupim', 'Cupim', 'Corte de demonstração'),
    ('coracao', 'Coração de frango', 'Corte de demonstração'),
]


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


@contextmanager
def conn():
    DB.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB, timeout=15, isolation_level=None)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA busy_timeout=15000')
    try:
        yield connection
    finally:
        connection.close()


def init_db():
    with conn() as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('''CREATE TABLE IF NOT EXISTS cortes (
           id TEXT PRIMARY KEY, nome TEXT NOT NULL, descricao TEXT NOT NULL DEFAULT '',
           disponivel INTEGER NOT NULL DEFAULT 1 CHECK (disponivel IN (0, 1))
        )''')
        db.execute('''CREATE TABLE IF NOT EXISTS pedidos (
           id TEXT PRIMARY KEY, codigo TEXT UNIQUE NOT NULL,
           cliente_id TEXT NOT NULL, numero_comanda TEXT, corte_id TEXT NOT NULL, ponto TEXT NOT NULL,
           status TEXT NOT NULL, criado_em TEXT NOT NULL,
           preparando_em TEXT, pronto_em TEXT, chegou_em TEXT, entregue_em TEXT,
           cancelado_em TEXT, origem TEXT NOT NULL DEFAULT 'real',
           FOREIGN KEY(corte_id) REFERENCES cortes(id)
        )''')
        # Migração não destrutiva de instalações v0.4 já existentes.
        cols = {r['name'] for r in db.execute('PRAGMA table_info(pedidos)')}
        if 'numero_comanda' not in cols:
            db.execute('ALTER TABLE pedidos ADD COLUMN numero_comanda TEXT')
        db.execute('''CREATE TABLE IF NOT EXISTS pedido_itens (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           pedido_id TEXT NOT NULL,
           corte_id TEXT NOT NULL,
           ponto TEXT NOT NULL,
           quantidade INTEGER NOT NULL DEFAULT 1 CHECK(quantidade BETWEEN 1 AND 3),
           UNIQUE(pedido_id, corte_id),
           FOREIGN KEY(pedido_id) REFERENCES pedidos(id),
           FOREIGN KEY(corte_id) REFERENCES cortes(id)
        )''')
        # Preserva solicitações criadas por versões antigas, com um único corte.
        db.execute('''INSERT OR IGNORE INTO pedido_itens(pedido_id,corte_id,ponto,quantidade)
                      SELECT id,corte_id,ponto,1 FROM pedidos''')
        db.execute('CREATE INDEX IF NOT EXISTS idx_itens_pedido ON pedido_itens(pedido_id)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status, criado_em)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id, status)')
        for cid, name, desc in DEMO_CUTS:
            db.execute('INSERT OR IGNORE INTO cortes(id,nome,descricao) VALUES (?,?,?)', (cid, name, desc))


# Garante o banco tanto ao iniciar o servidor quanto ao executar os testes.
init_db()


def require_pin(x_staff_pin: str = Header(default='')):
    correct = os.getenv('BOVINUS_PAINEL_PIN', PIN_DEFAULT)
    if not x_staff_pin or not hmac.compare_digest(x_staff_pin, correct):
        raise HTTPException(403, 'PIN do painel incorreto.')


def serialize_order(db, row):
    result = dict(row)
    result.pop('cliente_id', None)
    items = db.execute('''SELECT pi.corte_id, c.nome AS corte_nome, pi.ponto, pi.quantidade
        FROM pedido_itens pi JOIN cortes c ON c.id=pi.corte_id
        WHERE pi.pedido_id=? ORDER BY pi.id ASC''', (row['id'],)).fetchall()
    result['itens'] = [dict(item) for item in items]
    result['total_porcoes'] = sum(item['quantidade'] for item in items)
    return result


def order_by_code(db, codigo: str):
    return db.execute('''SELECT p.*,c.nome AS corte_nome
                         FROM pedidos p JOIN cortes c ON c.id=p.corte_id
                         WHERE p.codigo=?''', (codigo,)).fetchone()


class CutChoice(BaseModel):
    corte_id: str = Field(min_length=2, max_length=40)
    ponto: str = Field(default='Ponto da casa')
    quantidade: int = Field(default=1, ge=1, le=3)


class NewOrder(BaseModel):
    cliente_id: str = Field(min_length=16, max_length=100, pattern=r'^[a-zA-Z0-9_-]+$')
    numero_comanda: str = Field(pattern=r'^\d{4,6}$', description='Número impresso no cartão consumo')
    # Compatibilidade com versões antigas que enviam somente corte_id e ponto.
    itens: list[CutChoice] | None = Field(default=None, min_length=1, max_length=5)
    corte_id: str | None = Field(default=None, min_length=2, max_length=40)
    ponto: str = Field(default='Ponto da casa')


class UpdateOrder(BaseModel):
    acao: str = Field(pattern=r'^(preparar|atender|pronto|entregar|chegou|cancelar)$')


class Availability(BaseModel):
    disponivel: bool


class CancelOrder(BaseModel):
    cliente_id: str = Field(min_length=16, max_length=100, pattern=r'^[a-zA-Z0-9_-]+$')


@router.get('/churrasqueira')
def customer_page():
    return FileResponse(BASE / 'churrasqueira_cliente.html', media_type='text/html; charset=utf-8')


@router.get('/churrasqueira/painel')
def staff_page():
    return FileResponse(BASE / 'churrasqueira_painel.html', media_type='text/html; charset=utf-8')


@router.get('/churrasqueira/qr', response_class=HTMLResponse)
def qr_page():
    return FileResponse(BASE / 'churrasqueira_qr.html', media_type='text/html; charset=utf-8')


@router.get('/api/churrasqueira/qrcode.svg')
def qr_image(request: Request, destino: str | None = Query(default=None, max_length=400)):
    target = destino or str(request.base_url).rstrip('/') + '/churrasqueira'
    parsed = urlparse(target)
    if parsed.scheme not in ('http', 'https') or not parsed.netloc or parsed.path != '/churrasqueira':
        raise HTTPException(400, 'Use um endereço http(s) terminado em /churrasqueira.')
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=3,
                       image_factory=qrcode.image.svg.SvgPathImage)
    qr.add_data(target)
    qr.make(fit=True)
    buffer = io.BytesIO()
    qr.make_image().save(buffer)
    return Response(buffer.getvalue(), media_type='image/svg+xml', headers={'Cache-Control':'no-store'})


@router.get('/api/churrasqueira/cortes')
def cuts():
    with conn() as db:
        rows = db.execute('SELECT id, nome, descricao, disponivel FROM cortes ORDER BY nome').fetchall()
        num = db.execute('SELECT COUNT(*) AS n FROM pedidos WHERE status IN (\'solicitado\',\'preparando\',\'pronto\')').fetchone()['n']
    return {'cortes':[dict(r) for r in rows], 'pedidos_ativos':num, 'catalogo_demonstrativo':True}


@router.post('/api/churrasqueira/pedidos', status_code=201)
def new_order(payload: NewOrder):
    selections = payload.itens if payload.itens is not None else (
        [CutChoice(corte_id=payload.corte_id, ponto=payload.ponto)] if payload.corte_id else [])
    if not 1 <= len(selections) <= 5:
        raise HTTPException(422, 'Escolha entre 1 e 5 tipos de carne por comanda.')
    if any(item.ponto not in DONENESS for item in selections):
        raise HTTPException(422, 'Escolha um ponto válido para cada carne.')
    if len({item.corte_id for item in selections}) != len(selections):
        raise HTTPException(422, 'Não repita cortes. Ajuste a quantidade em cada corte.')
    if sum(item.quantidade for item in selections) > 10:
        raise HTTPException(422, 'Limite de 10 porções por solicitação.')
    with conn() as db:
        db.execute('BEGIN IMMEDIATE')
        try:
            active = db.execute('''SELECT codigo FROM pedidos WHERE cliente_id=?
               AND status IN ('solicitado','preparando','pronto') ORDER BY criado_em DESC LIMIT 1''',
               (payload.cliente_id,)).fetchone()
            if active:
                raise HTTPException(409, {'mensagem':'Já existe um pedido ativo.', 'codigo':active['codigo']})
            used = db.execute("SELECT codigo FROM pedidos WHERE numero_comanda=? AND status IN ('solicitado','preparando','pronto')",
                              (payload.numero_comanda,)).fetchone()
            if used:
                raise HTTPException(409, 'Essa comanda já possui uma solicitação ativa; consulte o balcão.')
            for item in selections:
                cut = db.execute('SELECT id FROM cortes WHERE id=? AND disponivel=1', (item.corte_id,)).fetchone()
                if not cut:
                    raise HTTPException(409, 'Uma das carnes selecionadas está indisponível. Atualize as opções.')
            pedido_id = str(uuid4())
            for _ in range(5):
                code = secrets.token_hex(3).upper()
                if not db.execute('SELECT 1 FROM pedidos WHERE codigo=?', (code,)).fetchone():
                    break
            else:
                raise HTTPException(503, 'Tente novamente.')
            first = selections[0]
            db.execute('''INSERT INTO pedidos(id,codigo,cliente_id,numero_comanda,corte_id,ponto,status,criado_em)
                          VALUES (?,?,?,?,?,?,?,?)''',
                       (pedido_id,code,payload.cliente_id,payload.numero_comanda,
                        first.corte_id,first.ponto,'solicitado',now()))
            for item in selections:
                db.execute('''INSERT INTO pedido_itens(pedido_id,corte_id,ponto,quantidade)
                              VALUES (?,?,?,?)''',
                           (pedido_id,item.corte_id,item.ponto,item.quantidade))
            db.execute('COMMIT')
        except Exception:
            db.execute('ROLLBACK')
            raise
        order=order_by_code(db,code)
        return serialize_order(db,order)


@router.get('/api/churrasqueira/pedidos/{codigo}')
def get_order(codigo: str):
    if not (6 <= len(codigo) <= 18):
        raise HTTPException(404, 'Pedido não encontrado.')
    with conn() as db:
        order=order_by_code(db,codigo.upper())
        if not order:
            raise HTTPException(404, 'Pedido não encontrado.')
        return serialize_order(db,order)


@router.post('/api/churrasqueira/pedidos/{codigo}/cancelar')
def cancel_my_order(codigo: str, payload: CancelOrder):
    # Cliente cancela somente antes de iniciar a finalização.
    with conn() as db:
        db.execute('BEGIN IMMEDIATE')
        row=db.execute('SELECT * FROM pedidos WHERE codigo=? AND cliente_id=?',
                       (codigo.upper(),payload.cliente_id)).fetchone()
        if not row or row['status'] != 'solicitado':
            db.execute('ROLLBACK')
            raise HTTPException(409,'Cancelamento disponível apenas antes do preparo.')
        db.execute("UPDATE pedidos SET status='cancelado',cancelado_em=? WHERE id=?",(now(),row['id']))
        db.execute('COMMIT')
        return {'ok':True}


def duration(start,end):
    if not start or not end:
        return None
    return max(0,(datetime.fromisoformat(end)-datetime.fromisoformat(start)).total_seconds())


def metric(values):
    if not values:
        return {'amostras':0,'mediana_s':None,'p90_s':None}
    data=sorted(values)
    return {'amostras':len(data),'mediana_s':round(median(data),1),
            'p90_s':round(data[max(0, int((len(data)*0.9 + 0.999999)-1))],1)}


@router.get('/api/churrasqueira/painel')
def panel(x_staff_pin: str = Header(default='')):
    require_pin(x_staff_pin)
    with conn() as db:
        rows=db.execute('''SELECT p.*, c.nome AS corte_nome
                FROM pedidos p JOIN cortes c ON c.id=p.corte_id
                WHERE p.status IN ('solicitado','preparando','pronto')
                ORDER BY p.criado_em ASC''').fetchall()
        delivered=db.execute("SELECT * FROM pedidos WHERE status='entregue' ORDER BY entregue_em DESC LIMIT 300").fetchall()
        menu=db.execute('SELECT id,nome,descricao,disponivel FROM cortes ORDER BY nome').fetchall()
        serialized=[serialize_order(db,r) for r in rows]
    ready=[duration(r['criado_em'],r['pronto_em']) for r in delivered if r['pronto_em']]
    waits=[duration(r['chegou_em'],r['entregue_em']) for r in delivered if r['chegou_em']]
    return {'pedidos':serialized, 'cortes':[dict(r) for r in menu],
            'metricas':{'ate_pronto':metric([n for n in ready if n is not None]),
                        'espera_no_balcao':metric([n for n in waits if n is not None]),
                        'entregues':len(delivered)},
            'pin_padrao':os.getenv('BOVINUS_PAINEL_PIN') is None}


@router.patch('/api/churrasqueira/painel/pedidos/{codigo}')
def update_order(codigo: str, payload: UpdateOrder, x_staff_pin: str = Header(default='')):
    require_pin(x_staff_pin)
    allowed={'solicitado':('preparar','atender','pronto','chegou','cancelar'),
             'preparando':('pronto','chegou','cancelar'),
             'pronto':('chegou','entregar','cancelar')}
    with conn() as db:
        db.execute('BEGIN IMMEDIATE')
        row=order_by_code(db,codigo.upper())
        if not row:
            db.execute('ROLLBACK')
            raise HTTPException(404, 'Pedido inexistente.')
        action=payload.acao
        if action == 'chegou':
            if row['status'] not in allowed or row['chegou_em']:
                db.execute('ROLLBACK')
                raise HTTPException(409,'Chegada já registrada ou pedido encerrado.')
            db.execute('UPDATE pedidos SET chegou_em=? WHERE id=?',(now(),row['id']))
        else:
            if action not in allowed.get(row['status'], ()):
                db.execute('ROLLBACK')
                raise HTTPException(409, 'Transição inválida: recarregue o painel.')
            if action=='entregar' and not row['chegou_em']:
                db.execute('ROLLBACK')
                raise HTTPException(409, 'Registre a chegada do cliente para medir a espera antes de entregar.')
            next_state={'preparar':'preparando','atender':'preparando','pronto':'pronto',
                        'entregar':'entregue','cancelar':'cancelado'}[action]
            timestamp_col={'preparar':'preparando_em','atender':'preparando_em','pronto':'pronto_em',
                           'entregar':'entregue_em','cancelar':'cancelado_em'}[action]
            db.execute(f'UPDATE pedidos SET status=?, {timestamp_col}=? WHERE id=?',
                       (next_state,now(),row['id']))
        db.execute('COMMIT')
        changed=order_by_code(db,codigo.upper())
        return serialize_order(db,changed)


@router.patch('/api/churrasqueira/painel/cortes/{corte_id}')
def change_cut(corte_id: str, payload: Availability, x_staff_pin: str = Header(default='')):
    require_pin(x_staff_pin)
    with conn() as db:
        cur=db.execute('UPDATE cortes SET disponivel=? WHERE id=?', (int(payload.disponivel),corte_id))
        if cur.rowcount!=1:
            raise HTTPException(404,'Corte não encontrado.')
    return {'id':corte_id,'disponivel':payload.disponivel}


@router.post('/api/churrasqueira/painel/demo')
def demo_orders(x_staff_pin: str = Header(default='')):
    require_pin(x_staff_pin)
    samples=[('picanha','Ao ponto'),('frango','Ponto da casa'),('fraldinha','Bem-passada')]
    codes=[]
    with conn() as db:
        db.execute('BEGIN IMMEDIATE')
        for cut,ponto in samples:
            code=secrets.token_hex(3).upper()
            demo_id=str(uuid4())
            db.execute('''INSERT INTO pedidos(id,codigo,cliente_id,numero_comanda,corte_id,ponto,status,criado_em,origem)
                          VALUES (?,?,?,?,?,?,?,?,?)''',
                       (demo_id,code,'demo_'+secrets.token_hex(10),str(9001+len(codes)),cut,ponto,
                        'solicitado',now(),'demonstracao'))
            if cut=='picanha':
                db.execute('INSERT INTO pedido_itens(pedido_id,corte_id,ponto,quantidade) VALUES (?,?,?,?)',
                           (demo_id,cut,ponto,1))
                db.execute('INSERT INTO pedido_itens(pedido_id,corte_id,ponto,quantidade) VALUES (?,?,?,?)',
                           (demo_id,'linguica','Ponto da casa',1))
            else:
                db.execute('INSERT INTO pedido_itens(pedido_id,corte_id,ponto,quantidade) VALUES (?,?,?,?)',
                           (demo_id,cut,ponto,1))
            codes.append(code)
        db.execute('COMMIT')
    return {'codigos':codes,'aviso':'Pedidos de demonstração claramente identificados.'}


@router.delete('/api/churrasqueira/painel/demo')
def clear_demo(x_staff_pin: str = Header(default='')):
    require_pin(x_staff_pin)
    with conn() as db:
        db.execute("DELETE FROM pedido_itens WHERE pedido_id IN (SELECT id FROM pedidos WHERE origem='demonstracao')")
        cur=db.execute("DELETE FROM pedidos WHERE origem='demonstracao'")
    return {'removidos':cur.rowcount}
