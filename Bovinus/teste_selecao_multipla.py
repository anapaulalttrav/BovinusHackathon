"""Testa pedidos com várias carnes e migração da versão anterior (sem necessidade de Internet)."""
import os
import sqlite3
import sys
import tempfile
from pathlib import Path
from uuid import uuid4

DB = Path(tempfile.gettempdir()) / ('bovinus_multi_' + uuid4().hex + '.sqlite3')
os.environ['BOVINUS_DB_PATH'] = str(DB)
os.environ['BOVINUS_PAINEL_PIN'] = 'pin-teste-456'
from fastapi.testclient import TestClient
from app import app
import grill

client = TestClient(app)
headers = {'X-Staff-Pin':'pin-teste-456'}
items = [
    {'corte_id':'picanha', 'ponto':'Ao ponto', 'quantidade':2},
    {'corte_id':'fraldinha', 'ponto':'Bem-passada', 'quantidade':1},
    {'corte_id':'linguica', 'ponto':'Ponto da casa', 'quantidade':1},
]
payload={'cliente_id':'cliente_'+uuid4().hex, 'numero_comanda':'1579', 'itens': items}
r=client.post('/api/churrasqueira/pedidos',json=payload)
assert r.status_code==201, r.text
data = r.json()
assert len(data['itens'])==3, data
assert data['total_porcoes']==4
assert [i['quantidade'] for i in data['itens']]==[2,1,1]
code=data['codigo']
assert client.get('/api/churrasqueira/pedidos/'+code).json()['itens']==data['itens']
panel=client.get('/api/churrasqueira/painel',headers=headers)
assert panel.status_code==200
shown=next(i for i in panel.json()['pedidos'] if i['codigo']==code)
assert len(shown['itens'])==3
for act in ['atender','chegou','pronto','entregar']:
    r=client.patch('/api/churrasqueira/painel/pedidos/'+code,headers=headers,json={'acao':act})
    assert r.status_code==200, r.text
assert r.json()['status']=='entregue'
# Repetição ou lista vazia não passam
for bad in [[], [items[0],items[0]], items*2, [{'corte_id':'picanha','quantidade':4}], [{'corte_id':'nao_existe'}]]:
    bad_payload={**payload,'cliente_id':'cliente_'+uuid4().hex,'numero_comanda':str(3000+len(bad)),'itens':bad}
    # different valid comanda numbers
    bad_payload['numero_comanda']=str(5000+len(bad))
    assert client.post('/api/churrasqueira/pedidos',json=bad_payload).status_code in (409,422)
# API legada continua aceitando pedido com um corte
legacy=client.post('/api/churrasqueira/pedidos',json={
    'cliente_id':'cliente_'+uuid4().hex,'numero_comanda':'1411',
    'corte_id':'alcatra','ponto':'Ao ponto'})
assert legacy.status_code==201, legacy.text
assert len(legacy.json()['itens'])==1
# Banco de v0.5: simula uma linha antiga ainda sem itens
with grill.conn() as db:
    old_id=str(uuid4())
    db.execute("INSERT INTO pedidos(id,codigo,cliente_id,numero_comanda,corte_id,ponto,status,criado_em) VALUES(?,?,?,?,?,?,?,?)", (old_id,'ABC123','old_'+uuid4().hex,'1531','frango','Ao ponto','solicitado',grill.now()))
grill.init_db()
old=client.get('/api/churrasqueira/pedidos/ABC123')
assert old.status_code==200, old.text
assert len(old.json()['itens'])==1
assert old.json()['itens'][0]['corte_nome']=='Frango'
# disable any cut in a multi order, new orders may not include it
r=client.patch('/api/churrasqueira/painel/cortes/linguica',headers=headers,json={'disponivel':False})
assert r.status_code==200
invalid=client.post('/api/churrasqueira/pedidos',json={'cliente_id':'cliente_'+uuid4().hex,'numero_comanda':'7777', 'itens':items})
assert invalid.status_code==409
print('OK: múltiplas carnes, itens no painel, status, bloqueios, API legada, migração e disponibilidade.')
client.close()
try:
    DB.unlink()
except OSError:
    pass
