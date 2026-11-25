"""Aplicação INDEPENDENTE do tablet de mesa Bovinus. Não importa o sistema principal."""
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse
from salao import router as salao_router

BASE = Path(__file__).resolve().parent
app = FastAPI(title='Bovinus — Tablet de Mesa (projeto separado)', version='1.0.0')
app.include_router(salao_router)

@app.get('/')
def inicio():
    return FileResponse(BASE / 'inicio.html', media_type='text/html; charset=utf-8')

@app.get('/tablet-3d')
def tablet_3d():
    return FileResponse(BASE / 'tablet_3d.html', media_type='text/html; charset=utf-8')

@app.get('/maquete')
def maquete():
    return FileResponse(BASE / 'maquete.html', media_type='text/html; charset=utf-8')

@app.get('/augusta_3d.js')
def modelo():
    return FileResponse(BASE / 'augusta_3d.js', media_type='application/javascript; charset=utf-8')

@app.get('/api/health')
def health():
    return {'ok': True, 'aplicacao': 'tablet de mesa separado', 'independente': True}

@app.get('/tablet_3d_real.js')
def tablet_js():
    return FileResponse(BASE / 'tablet_3d_real.js', media_type='application/javascript; charset=utf-8')
