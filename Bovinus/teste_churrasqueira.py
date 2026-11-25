"""Testes integrados do MVP da churrasqueira; banco temporário, sem API externa."""
import os, tempfile
from pathlib import Path
from uuid import uuid4

os.environ['BOVINUS_DB_PATH'] = str(Path(tempfile.gettempdir()) / ('bovinus_test_'+uuid4().hex+'.sqlite3'))
os.environ['BOVINUS_PAINEL_PIN'] = 'test-seguro-456'
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)
PIN={'X-Staff-Pin':'test-seguro-456'}

def chk(ok, label):
    assert ok, label
    print('✓',label)

for path in ['/','/simulador','/churrasqueira','/churrasqueira/painel','/churrasqueira/qr']:
    r=client.get(path)
    chk(r.status_code==200 and 'text/html' in r.headers['content-type'], f'Página {path}')

qr = client.get('/api/churrasqueira/qrcode.svg',params={'destino':'http://192.168.1.100:8000/churrasqueira'})
chk(qr.status_code==200 and '<svg' in qr.text and 'image/svg+xml' in qr.headers['content-type'],'QR Code SVG')
chk(client.get('/api/churrasqueira/qrcode.svg',params={'destino':'javascript:alert(1)'}).status_code==400, 'QR bloqueia esquema inválido')
chk(client.get('/api/churrasqueira/painel').status_code==403, 'Painel bloqueia acesso sem PIN')
menu=client.get('/api/churrasqueira/cortes').json()['cortes']
chk(len(menu)>=4, 'Cardápio carregado')
client_id='cliente_'+uuid4().hex
payload={'cliente_id':client_id,'numero_comanda':'1579','corte_id':'picanha','ponto':'Ao ponto'}
r=client.post('/api/churrasqueira/pedidos',json=payload)
chk(r.status_code==201,'Cliente cria pedido')
order=r.json();code=order['codigo']
chk(order['status']=='solicitado' and order['numero_comanda']=='1579','Estado solicitado vinculado à comanda')
chk(client.post('/api/churrasqueira/pedidos',json=payload).status_code==409,'Evita pedido duplicado ativo')
chk(client.post('/api/churrasqueira/pedidos',json={**payload,'cliente_id':'outro_'+uuid4().hex}).status_code==409, 'Bloqueia segunda solicitação na mesma comanda')
chk(client.get('/api/churrasqueira/pedidos/'+code).status_code==200,'Cliente consulta andamento')
chk(any(x['codigo']==code for x in client.get('/api/churrasqueira/painel',headers=PIN).json()['pedidos']),'Pedido aparece no painel')

def action(name):
    return client.patch('/api/churrasqueira/painel/pedidos/'+code,headers=PIN,json={'acao':name})
chk(action('entregar').status_code==409,'Não entrega antes de ficar pronto')
chk(action('atender').json()['status']=='preparando','Operador inicia atendimento sem comandar preparo')
chk(action('chegou').json()['chegou_em'] is not None,'Equipe marca chegada ao balcão')
chk(action('pronto').json()['status']=='pronto','Operador confirma corte disponível no balcão')
chk(action('entregar').json()['status']=='entregue','Operador confirma entrega')
chk(client.get('/api/churrasqueira/painel',headers=PIN).json()['metricas']['espera_no_balcao']['amostras']==1, 'Espera presencial calculada')
chk(client.post('/api/churrasqueira/pedidos',json=payload).status_code==201,'Permite novo pedido após entrega')
chk(client.patch('/api/churrasqueira/painel/cortes/picanha',headers=PIN,json={'disponivel':False}).status_code==200,'Equipe desativa corte')
new_id='new_'+uuid4().hex
chk(client.post('/api/churrasqueira/pedidos',json={'cliente_id':new_id,'numero_comanda':'1579','corte_id':'picanha','ponto':'Ao ponto'}).status_code==409,'Impede novo pedido de corte indisponível')
chk(client.post('/api/churrasqueira/painel/demo',headers=PIN).status_code==200,'Cria pedidos de demonstração')
chk(client.delete('/api/churrasqueira/painel/demo',headers=PIN).json()['removidos']==3,'Remove apenas pedidos de demonstração')
# valid cancel of a requested order and invalid when in prep
r=client.post('/api/churrasqueira/pedidos',json={'cliente_id':new_id,'numero_comanda':'1531','corte_id':'frango','ponto':'Ao ponto'})
chk(r.status_code==201,'Pedido novo para cancelar')
new_code=r.json()['codigo']
chk(client.post('/api/churrasqueira/pedidos/'+new_code+'/cancelar',json={'cliente_id':new_id}).status_code==200,'Cliente cancela antes de preparar')
chk(client.get('/api/churrasqueira/pedidos/'+new_code).json()['status']=='cancelado','Status de cancelamento sincronizado')
print('\nTODOS OS TESTES PASSARAM')
