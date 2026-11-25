"""Bovinus — Balança Inteligente 3D (protótipo separado do sistema principal).
Captura pela câmera do navegador, análise visual opcional via API e métricas em SQLite.
Não controla a balança física, caixa, cozinha, compras nem estoque.
"""
from __future__ import annotations
import base64
import csv
import io
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field, field_validator

BASE = Path(__file__).resolve().parent
DB = Path(os.getenv('BOVINUS_BALANCA_DB', str(BASE / 'pesagens_local.db')))
CATEGORIES = ('carne', 'acompanhamentos', 'saladas', 'outros')
DEFAULT_COSTS = {'carne': 65.0, 'acompanhamentos': 18.0, 'saladas': 14.0, 'outros': 28.0}
PRICE_KG = 119.0  # valor informado na reunião; alterável no formulário
MODEL = os.getenv('OPENAI_MODEL', 'gpt-4.1-mini')
app = FastAPI(title='Bovinus — Balança Inteligente 3D', version='1.0.0')


def connect():
    DB.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB, timeout=10)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA journal_mode=WAL')
    con.execute('''CREATE TABLE IF NOT EXISTS pesagens (
        id INTEGER PRIMARY KEY AUTOINCREMENT, horario TEXT NOT NULL,
        peso_g INTEGER NOT NULL, preco_kg REAL NOT NULL,
        origem TEXT NOT NULL, observacao TEXT,
        percentuais TEXT NOT NULL, custos_kg TEXT NOT NULL,
        receita REAL NOT NULL, custo_alimentar REAL NOT NULL,
        cmv_percent REAL NOT NULL
    )''')
    con.commit()
    return con


@app.get('/')
def home():
    return FileResponse(BASE / 'index.html')


@app.get('/balanca-3d')
def balanca():
    return FileResponse(BASE / 'balanca.html')


@app.get('/balanca3d.js')
def js():
    return FileResponse(BASE / 'balanca3d.js', media_type='application/javascript')


@app.get('/painel')
def painel():
    return FileResponse(BASE / 'painel.html')


@app.get('/api/health')
def health():
    return {'ok': True, 'camera_navegador': True, 'ia_habilitada': bool(os.getenv('OPENAI_API_KEY')),
            'modelo': MODEL, 'balanca_fisica_integrada': False}


@app.get('/api/config')
def config():
    return {'custos_kg': DEFAULT_COSTS, 'preco_kg': PRICE_KG,
            'ia_habilitada': bool(os.getenv('OPENAI_API_KEY')), 'modelo': MODEL,
            'aviso': 'Pesos físicos não são medidos automaticamente. Custos de ingredientes são ilustrativos até preenchimento com dados reais.'}


class ImageRequest(BaseModel):
    imagem: str = Field(min_length=100, max_length=7_000_000)


def validar_imagem(dataurl: str) -> None:
    prefixes = ('data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,')
    if not dataurl.startswith(prefixes):
        raise HTTPException(400, 'Use imagem JPEG, PNG ou WEBP.')
    try:
        decoded = base64.b64decode(dataurl.split(',', 1)[1], validate=True)
    except Exception as ex:
        raise HTTPException(400, 'A imagem enviada é inválida.') from ex
    if len(decoded) > 4_000_000:
        raise HTTPException(413, 'Imagem muito grande. Reduza a resolução antes de analisar.')
    if len(decoded) < 100:
        raise HTTPException(400, 'Imagem vazia ou incompleta.')


@app.post('/api/analisar')
def analisar(payload: ImageRequest):
    validar_imagem(payload.imagem)
    key = os.getenv('OPENAI_API_KEY')
    if not key:
        raise HTTPException(503, 'IA não configurada. Defina OPENAI_API_KEY no terminal. A câmera real continua funcionando; use demonstração sem IA ou configure a chave.')
    schema = {'type': 'object', 'properties': {
        'carne': {'type': 'number'}, 'acompanhamentos': {'type': 'number'},
        'saladas': {'type': 'number'}, 'outros': {'type': 'number'},
        'confianca': {'type': 'string', 'enum': ['baixa', 'media', 'alta']},
        'observacao': {'type': 'string'}},
        'required': ['carne', 'acompanhamentos', 'saladas', 'outros', 'confianca', 'observacao'],
        'additionalProperties': False}
    prompt = (
        'Você analisa SOMENTE alimentos visíveis em um prato de restaurante por quilo. '
        'Estime a participação VISUAL em quatro categorias: carne (inclui churrasco), '
        'acompanhamentos (arroz, feijão, massas, batatas), saladas e outros (incertos e molhos). '
        'Os números devem somar cerca de 100; não são gramas e não são medida de peso. '
        'Não invente ingredientes ocultos nem informe lucratividade sem custos. '
        'Se não houver um prato de comida identificável, coloque tudo em outros e diga que a imagem é inadequada. '
        'Informe incertezas e a confiança. Não descreva pessoas nem identifique ninguém.'
    )
    body = {'model': MODEL, 'input': [{'role': 'user', 'content': [
        {'type': 'input_text', 'text': prompt},
        {'type': 'input_image', 'image_url': payload.imagem}
    ]}], 'text': {'format': {'type': 'json_schema', 'name': 'composicao_bovinus',
                           'strict': True, 'schema': schema}}, 'max_output_tokens': 350}
    try:
        with httpx.Client(timeout=50) as client:
            response = client.post('https://api.openai.com/v1/responses', json=body,
                headers={'Authorization': 'Bearer ' + key})
        response.raise_for_status()
        raw = response.json()
        output = ''.join(part.get('text', '') for msg in raw.get('output', [])
                         for part in msg.get('content', []) if part.get('type') == 'output_text')
        result = json.loads(output)
        vals = {cat: max(0, min(100, float(result[cat]))) for cat in CATEGORIES}
        total = sum(vals.values())
        if total <= 0:
            raise ValueError('IA não retornou composição válida.')
        vals = {c: round(v * 100 / total, 1) for c, v in vals.items()}
        vals['outros'] = round(vals['outros'] + (100 - sum(vals.values())), 1)
        return {'percentuais': vals, 'confianca': result['confianca'],
                'observacao': str(result['observacao'])[:260], 'origem': 'ia_real',
                'aviso': 'Estimativa visual. Percentuais não são peso medido; valores e CMV precisam de validação humana.'}
    except httpx.HTTPStatusError as ex:
        err = ''
        try:
            err = str(ex.response.json().get('error', {}).get('message', ''))[:230]
        except Exception:
            pass
        raise HTTPException(502, 'Falha ao analisar imagem com IA. ' + err) from ex
    except (httpx.RequestError, ValueError, KeyError, json.JSONDecodeError) as ex:
        raise HTTPException(502, 'Falha na análise de imagem: ' + str(ex)[:190]) from ex


class Pesagem(BaseModel):
    peso_g: int = Field(ge=1, le=2000)
    preco_kg: float = Field(gt=0, le=1000)
    percentuais: dict[str, float]
    custos_kg: dict[str, float]
    origem: Literal['ia_real', 'manual', 'demo']
    observacao: str = Field(default='', max_length=400)

    @field_validator('percentuais')
    @classmethod
    def pct_valid(cls, value: dict[str, float]):
        if set(value) != set(CATEGORIES) or not all(0 <= v <= 100 for v in value.values()):
            raise ValueError('São necessárias as quatro categorias, cada percentual entre 0 e 100.')
        if abs(sum(value.values()) - 100) > 0.11:
            raise ValueError('Os percentuais precisam somar 100%.')
        return value

    @field_validator('custos_kg')
    @classmethod
    def costs_valid(cls, value: dict[str, float]):
        if set(value) != set(CATEGORIES) or not all(0 <= v <= 1000 for v in value.values()):
            raise ValueError('Informe custo/kg válido para as quatro categorias.')
        return value


def calculate(p: Pesagem):
    kg = p.peso_g / 1000
    revenue = round(kg * p.preco_kg, 2)
    cat_costs = {k: round(kg * p.percentuais[k] / 100 * p.custos_kg[k], 2) for k in CATEGORIES}
    total_cost = round(sum(kg * p.percentuais[k] / 100 * p.custos_kg[k] for k in CATEGORIES), 2)
    cmv = round(100 * total_cost / revenue, 2) if revenue else 0
    return revenue, total_cost, cmv, cat_costs


@app.post('/api/pesagens', status_code=201)
def nova_pesagem(p: Pesagem):
    revenue, total_cost, cmv, _ = calculate(p)
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    with connect() as con:
        cur = con.execute('''INSERT INTO pesagens(horario,peso_g,preco_kg,origem,observacao,
            percentuais,custos_kg,receita,custo_alimentar,cmv_percent)
            VALUES(?,?,?,?,?,?,?,?,?,?)''', (now, p.peso_g, p.preco_kg, p.origem,
            p.observacao, json.dumps(p.percentuais), json.dumps(p.custos_kg), revenue, total_cost, cmv))
        id_ = cur.lastrowid
    return {'id': id_, 'horario': now, 'receita': revenue, 'custo_alimentar': total_cost,
            'cmv_percent': cmv, 'margem_apos_insumos': round(revenue - total_cost, 2),
            'origem': p.origem}


@app.get('/api/pesagens')
def list_pesagens():
    with connect() as con:
        rows = con.execute('SELECT * FROM pesagens ORDER BY id DESC LIMIT 100').fetchall()
    return {'pesagens': [dict(row) | {'percentuais': json.loads(row['percentuais']),
                                    'custos_kg': json.loads(row['custos_kg'])} for row in rows]}


@app.get('/api/dashboard')
def dashboard():
    with connect() as con:
        rows = con.execute('SELECT * FROM pesagens ORDER BY id DESC').fetchall()
    categories = {k: {'categoria': k, 'kg_estimados': 0., 'gasto_estimado': 0.} for k in CATEGORIES}
    demos = 0
    revenue = total_cost = 0
    for row in rows:
        pcts, costs = json.loads(row['percentuais']), json.loads(row['custos_kg'])
        revenue += row['receita']
        total_cost += row['custo_alimentar']
        demos += row['origem'] == 'demo'
        for cat in CATEGORIES:
            kg = row['peso_g'] / 1000 * pcts[cat] / 100
            categories[cat]['kg_estimados'] += kg
            categories[cat]['gasto_estimado'] += kg * costs[cat]
    for cat in categories.values():
        cat['kg_estimados'] = round(cat['kg_estimados'], 3)
        cat['gasto_estimado'] = round(cat['gasto_estimado'], 2)
    return {'total_pesagens': len(rows), 'pesagens_demo': demos,
            'receita': round(revenue, 2), 'custo_alimentar': round(total_cost, 2),
            'cmv_percent': round(total_cost / revenue * 100, 2) if revenue else 0,
            'margem_apos_insumos': round(revenue - total_cost, 2),
            'categorias': sorted(categories.values(), key=lambda x: x['gasto_estimado'], reverse=True),
            'aviso': 'Estimativas com peso total informado e percentuais visuais. Não equivalem a lucro líquido nem à quantidade real por ingrediente.'}


@app.delete('/api/pesagens/demo')
def clear_demo():
    with connect() as con:
        deleted = con.execute("DELETE FROM pesagens WHERE origem = 'demo'").rowcount
    return {'apagadas': deleted}


@app.get('/api/exportar.csv')
def export_csv():
    with connect() as con:
        rows = con.execute('SELECT * FROM pesagens ORDER BY id DESC').fetchall()
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(['id', 'horario', 'peso_g', 'origem', 'receita', 'custo_alimentar', 'cmv_percent',
                     'carne_pct', 'acompanhamentos_pct', 'saladas_pct', 'outros_pct'])
    for row in rows:
        p = json.loads(row['percentuais'])
        writer.writerow([row['id'], row['horario'], row['peso_g'], row['origem'],
                         row['receita'], row['custo_alimentar'], row['cmv_percent'],
                         *[p[c] for c in CATEGORIES]])
    out.seek(0)
    return StreamingResponse(iter([out.getvalue()]), media_type='text/csv; charset=utf-8',
                             headers={'Content-Disposition': 'attachment; filename="pesagens_bovinus.csv"'})


# Create the local database when the app is imported; do not write photo assets.
with connect():
    pass
