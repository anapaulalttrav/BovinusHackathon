"""Tablet de mesa e painel de atendimento do salão — demonstração Bovinus.

Escopo estrito: chamados do salão, pedidos de bebida e feedback. Não altera cozinha,
churrasqueira, caixa, comanda ou pagamentos. As bebidas são apenas solicitações
para atendimento manual no salão/copa, sem integração de estoque ou preços.
"""
from __future__ import annotations

import hmac
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from contextlib import contextmanager
from uuid import uuid4

from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, model_validator

DIR = Path(__file__).resolve().parent
DB = Path(os.getenv('BOVINUS_SALAO_DB_PATH', str(DIR / 'bovinus_salao.sqlite3')))
router = APIRouter()
TIPOS = {
    'garcom': 'Chamar garçom',
    'talheres': 'Pedir talheres',
    'guardanapos': 'Pedir guardanapos',
    'limpeza': 'Limpar a mesa',
    'prato': 'Trocar prato',
    'ajuda': 'Pedir ajuda',
    'bebida': 'Pedido de bebida',
}
BEBIDAS = {'agua': 'Água', 'refrigerante': 'Refrigerante', 'suco': 'Suco', 'cafe': 'Café'}
STATUS = {'pendente', 'em_atendimento', 'concluido'}


def agora():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


@contextmanager
def conexao():
    DB.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB, timeout=10, isolation_level=None)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA busy_timeout=10000')
    try:
        yield con
    finally:
        con.close()


def iniciar_banco():
    with conexao() as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('''CREATE TABLE IF NOT EXISTS chamados (
           id TEXT PRIMARY KEY, mesa INTEGER NOT NULL CHECK(mesa BETWEEN 1 AND 90),
           tipo TEXT NOT NULL, bebida TEXT, quantidade INTEGER,
           status TEXT NOT NULL, criado_em TEXT NOT NULL, iniciado_em TEXT, concluido_em TEXT
        )''')
        db.execute('CREATE INDEX IF NOT EXISTS idx_chamados_status ON chamados(status, criado_em)')
        db.execute('''CREATE TABLE IF NOT EXISTS avaliacoes (
           id TEXT PRIMARY KEY, mesa INTEGER NOT NULL CHECK(mesa BETWEEN 1 AND 90),
           atendimento TEXT NOT NULL, espera_longa INTEGER NOT NULL,
           mesa_limpa INTEGER NOT NULL, criado_em TEXT NOT NULL
        )''')

iniciar_banco()


class NovoChamado(BaseModel):
    mesa: int = Field(ge=1, le=90)
    tipo: str
    bebida: str | None = None
    quantidade: int | None = Field(default=None, ge=1, le=5)

    @model_validator(mode='after')
    def validar(self):
        if self.tipo not in TIPOS:
            raise ValueError('Tipo de solicitação inválido.')
        if self.tipo == 'bebida':
            if self.bebida not in BEBIDAS or self.quantidade is None:
                raise ValueError('Escolha a bebida e a quantidade.')
        elif self.bebida is not None or self.quantidade is not None:
            raise ValueError('Bebida e quantidade só são aceitas no pedido de bebida.')
        return self


class MudancaStatus(BaseModel):
    status: str


class Avaliacao(BaseModel):
    mesa: int = Field(ge=1, le=90)
    atendimento: str
    espera_longa: bool
    mesa_limpa: bool

    @model_validator(mode='after')
    def validar(self):
        if self.atendimento not in {'otimo', 'bom', 'ruim'}:
            raise ValueError('Avaliação de atendimento inválida.')
        return self


def painel_autorizado(x_salao_pin: str = Header(default='')):
    configurado = os.getenv('BOVINUS_SALAO_PIN', '2468')
    if not x_salao_pin or not hmac.compare_digest(configurado, x_salao_pin):
        raise HTTPException(403, 'PIN do atendimento incorreto.')


def normalizar(row):
    item = dict(row)
    item['descricao'] = TIPOS.get(item['tipo'], item['tipo'])
    if item['bebida']:
        item['bebida_nome'] = BEBIDAS.get(item['bebida'], item['bebida'])
    return item


@router.get('/tablet')
def pagina_tablet():
    return FileResponse(DIR / 'tablet_mesa.html', media_type='text/html; charset=utf-8')


@router.get('/salao/painel')
def painel():
    return FileResponse(DIR / 'salao_painel.html', media_type='text/html; charset=utf-8')


@router.get('/api/salao/opcoes')
def opcoes():
    return {'tipos': TIPOS, 'bebidas': BEBIDAS, 'mesa_minima': 1, 'mesa_maxima': 90, 'demonstracao': True}


@router.post('/api/salao/chamados', status_code=201)
def criar_chamado(novo: NovoChamado):
    with conexao() as db:
        # Evita repetição por cliques sucessivos enquanto a mesma solicitação está aberta.
        atual = db.execute('''SELECT * FROM chamados WHERE mesa=? AND tipo=?
            AND IFNULL(bebida,'')=IFNULL(?, '') AND status IN ('pendente','em_atendimento')
            ORDER BY criado_em DESC LIMIT 1''', (novo.mesa, novo.tipo, novo.bebida)).fetchone()
        if atual:
            return {**normalizar(atual), 'ja_existia': True}
        ident = uuid4().hex
        db.execute('''INSERT INTO chamados(id,mesa,tipo,bebida,quantidade,status,criado_em)
                       VALUES (?,?,?,?,?,?,?)''',
                   (ident,novo.mesa,novo.tipo,novo.bebida,novo.quantidade,'pendente',agora()))
        row=db.execute('SELECT * FROM chamados WHERE id=?',(ident,)).fetchone()
    return {**normalizar(row), 'ja_existia': False}


@router.get('/api/salao/mesa/{numero}/chamados')
def chamados_da_mesa(numero: int):
    if not 1 <= numero <= 90:
        raise HTTPException(400,'Mesa inválida.')
    with conexao() as db:
        linhas=db.execute('''SELECT * FROM chamados WHERE mesa=? ORDER BY criado_em DESC LIMIT 12''',(numero,)).fetchall()
    return {'mesa':numero,'chamados':[normalizar(x) for x in linhas]}


@router.get('/api/salao/chamados')
def chamados_equipe(x_salao_pin: str = Header(default='')):
    painel_autorizado(x_salao_pin)
    with conexao() as db:
        rows=db.execute("SELECT * FROM chamados ORDER BY CASE status WHEN 'pendente' THEN 0 WHEN 'em_atendimento' THEN 1 ELSE 2 END, criado_em DESC LIMIT 180").fetchall()
    return {'chamados':[normalizar(x) for x in rows]}


@router.patch('/api/salao/chamados/{id_chamado}')
def mudar_chamado(id_chamado: str, mudanca: MudancaStatus, x_salao_pin: str = Header(default='')):
    painel_autorizado(x_salao_pin)
    if mudanca.status not in STATUS:
        raise HTTPException(400,'Status inválido.')
    with conexao() as db:
        atual=db.execute('SELECT * FROM chamados WHERE id=?',(id_chamado,)).fetchone()
        if not atual:
            raise HTTPException(404,'Solicitação não encontrada.')
        if atual['status']=='concluido' and mudanca.status != 'concluido':
            raise HTTPException(409,'Solicitação já concluída.')
        if mudanca.status=='em_atendimento':
            db.execute("UPDATE chamados SET status=?, iniciado_em=COALESCE(iniciado_em,?) WHERE id=?",(mudanca.status,agora(),id_chamado))
        elif mudanca.status=='concluido':
            db.execute("UPDATE chamados SET status=?, iniciado_em=COALESCE(iniciado_em,?), concluido_em=COALESCE(concluido_em,?) WHERE id=?",(mudanca.status,agora(),agora(),id_chamado))
        else:
            db.execute("UPDATE chamados SET status=? WHERE id=?",(mudanca.status,id_chamado))
        row=db.execute('SELECT * FROM chamados WHERE id=?',(id_chamado,)).fetchone()
    return normalizar(row)


@router.post('/api/salao/avaliacoes', status_code=201)
def registrar_avaliacao(av: Avaliacao):
    ident=uuid4().hex
    with conexao() as db:
        db.execute('''INSERT INTO avaliacoes(id,mesa,atendimento,espera_longa,mesa_limpa,criado_em)
                      VALUES(?,?,?,?,?,?)''',
                   (ident,av.mesa,av.atendimento,int(av.espera_longa),int(av.mesa_limpa),agora()))
    return {'id':ident,'registrado':True,'mensagem':'Obrigado pelo feedback!'}


@router.get('/api/salao/avaliacoes')
def avaliacoes_equipe(x_salao_pin: str = Header(default='')):
    painel_autorizado(x_salao_pin)
    with conexao() as db:
        rows=db.execute('SELECT * FROM avaliacoes ORDER BY criado_em DESC LIMIT 60').fetchall()
    return {'avaliacoes':[dict(x) for x in rows]}
