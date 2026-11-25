"""Teste do tablet isolado. Executar: python teste_tablet_independente.py"""
import importlib
import os
from pathlib import Path
import sys
import tempfile

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent))

def run():
    with tempfile.TemporaryDirectory() as tmp:
        os.environ['BOVINUS_SALAO_DB_PATH'] = str(Path(tmp) / 'teste.sqlite3')
        os.environ['BOVINUS_SALAO_PIN'] = '9876'
        import salao
        importlib.reload(salao)
        import app
        importlib.reload(app)
        client = TestClient(app.app)
        for r in ['/', '/tablet?mesa=12','/salao/painel','/maquete','/tablet-3d?mesa=12','/augusta_3d.js','/api/health']:
            resp=client.get(r)
            assert resp.status_code == 200, (r,resp.text)
        assert 'tablet_3d_real.js' in client.get('/tablet-3d?mesa=12').text
        assert client.get('/tablet_3d_real.js').status_code==200
        assert '/tablet-3d?mesa=' in client.get('/maquete').text
        assert client.get('/api/salao/chamados').status_code == 403
        r=client.post('/api/salao/chamados',json={'mesa':12,'tipo':'guardanapos'})
        assert r.status_code==201,r.text
        id=r.json()['id']
        assert client.post('/api/salao/chamados',json={'mesa':12,'tipo':'guardanapos'}).json()['ja_existia'] is True
        b=client.post('/api/salao/chamados',json={'mesa':12,'tipo':'bebida','bebida':'cafe','quantidade':2})
        assert b.status_code==201,b.text
        assert client.post('/api/salao/chamados',json={'mesa':12,'tipo':'carne'}).status_code==422
        headers={'X-Salao-Pin':'9876'}
        assert len(client.get('/api/salao/chamados',headers=headers).json()['chamados'])==2
        assert client.patch('/api/salao/chamados/'+id,json={'status':'em_atendimento'},headers=headers).status_code==200
        assert client.patch('/api/salao/chamados/'+id,json={'status':'concluido'},headers=headers).status_code==200
        assert client.post('/api/salao/avaliacoes',json={'mesa':12,'atendimento':'bom','espera_longa':False,'mesa_limpa':True}).status_code==201
        assert len(client.get('/api/salao/avaliacoes',headers=headers).json()['avaliacoes'])==1
        assert 'chamados' in client.get('/api/salao/mesa/12/chamados').json()
        print('OK: standalone, tablet, painel, maquete, chamado, bebida, PIN, feedback')

if __name__=='__main__':run()
