"""Testes executáveis sem câmera e sem chave de API: python -m pytest teste_balanca.py -q"""
import os
import sys
from pathlib import Path
from fastapi.testclient import TestClient
sys.path.insert(0, str(Path(__file__).parent))
import app as backend


def client(tmp_path, monkeypatch):
    monkeypatch.setattr(backend, 'DB', tmp_path / 'testes.db')
    with backend.connect():
        pass
    return TestClient(backend.app)


def sample(**changes):
    return dict(peso_g=540, preco_kg=119, origem='demo', observacao='teste',
                percentuais={'carne':40,'acompanhamentos':30,'saladas':20,'outros':10},
                custos_kg={'carne':65,'acompanhamentos':18,'saladas':14,'outros':28}) | changes


def test_pages_and_health(tmp_path, monkeypatch):
    c=client(tmp_path,monkeypatch)
    assert c.get('/').status_code==200
    assert c.get('/balanca-3d').status_code==200
    assert c.get('/balanca3d.js').status_code==200
    assert c.get('/painel').status_code==200
    health=c.get('/api/health').json()
    assert health['ok'] and not health['balanca_fisica_integrada']


def test_calculos_and_dashboard(tmp_path, monkeypatch):
    c=client(tmp_path,monkeypatch)
    r=c.post('/api/pesagens',json=sample())
    assert r.status_code==201,r.text
    data=r.json()
    assert data['receita']==64.26
    assert data['custo_alimentar']==19.98
    assert 31<data['cmv_percent']<32
    d=c.get('/api/dashboard').json()
    assert d['total_pesagens']==1 and d['pesagens_demo']==1
    assert d['categorias'][0]['categoria']=='carne'
    assert c.get('/api/pesagens').json()['pesagens'][0]['percentuais']['carne']==40
    assert 'carne_pct' in c.get('/api/exportar.csv').text
    assert c.delete('/api/pesagens/demo').json()['apagadas']==1
    assert c.get('/api/dashboard').json()['total_pesagens']==0


def test_validation(tmp_path, monkeypatch):
    c=client(tmp_path, monkeypatch)
    assert c.post('/api/pesagens',json=sample(peso_g=-1)).status_code==422
    assert c.post('/api/pesagens',json=sample(percentuais={'carne':50,'acompanhamentos':30,'saladas':20,'outros':10})).status_code==422
    assert c.post('/api/pesagens',json=sample(custos_kg={'carne':-1,'acompanhamentos':30,'saladas':10,'outros':5})).status_code==422
    assert c.post('/api/analisar',json={'imagem':'texto-invalido'*20}).status_code==400


def test_camera_api_requires_key(tmp_path, monkeypatch):
    c=client(tmp_path,monkeypatch)
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    import base64
    dummy='data:image/jpeg;base64,'+base64.b64encode(b'\xff\xd8'+b'abcdef'*35).decode()
    r=c.post('/api/analisar',json={'imagem':dummy})
    assert r.status_code==503
    assert 'OPENAI_API_KEY' in r.text
