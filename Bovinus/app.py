"""Bovinus: protótipo de demonstração do hackathon.

Não grava fotografias no servidor. Requer OPENAI_API_KEY apenas para visão real;
sem chave, o front-end possui um modo DEMONSTRAÇÃO identificado.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import requests
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from grill import router as grill_router

APP_DIR = Path(__file__).resolve().parent
OPENAI_API_URL = "https://api.openai.com/v1/responses"
MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

app = FastAPI(title="Bovinus MVP", version="0.6.0")

class ImageRequest(BaseModel):
    image_data_url: str = Field(min_length=100, max_length=10_000_000)

@app.get("/")
def index():
    return FileResponse(APP_DIR / "index.html", media_type="text/html; charset=utf-8")

@app.get("/simulador")
def simulador():
    return FileResponse(APP_DIR / "simulador.html", media_type="text/html; charset=utf-8")

@app.get("/planta_augusta_recorte.png")
def planta():
    return FileResponse(APP_DIR / "planta_augusta_recorte.png", media_type="image/png")

@app.get("/augusta_3d.js")
def three_dimensional_view():
    return FileResponse(APP_DIR / "augusta_3d.js", media_type="application/javascript; charset=utf-8")

@app.get("/api/status")
def status():
    return {"ai_enabled": bool(os.getenv("OPENAI_API_KEY")), "model": MODEL}

@app.post("/api/analyze")
def analyze_image(payload: ImageRequest):
    key = os.getenv("OPENAI_API_KEY", "")
    if not key:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY não configurada. Use o modo demonstração ou configure a chave no servidor.",
        )
    allowed = ("data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,")
    if not payload.image_data_url.startswith(allowed):
        raise HTTPException(status_code=400, detail="Envie uma imagem JPEG, PNG ou WEBP codificada em base64.")

    schema = {
        "type": "object",
        "properties": {
            "categorias": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "nome": {"type": "string", "enum": ["carne", "acompanhamentos", "saladas", "outros"]},
                        "percentual": {"type": "number"},
                    },
                    "required": ["nome", "percentual"],
                    "additionalProperties": False,
                },
            },
            "observacao": {"type": "string"},
            "confianca": {"type": "string", "enum": ["baixa", "media", "alta"]},
        },
        "required": ["categorias", "observacao", "confianca"],
        "additionalProperties": False,
    }
    prompt = (
        "Analise SOMENTE os alimentos visíveis no prato na foto. "
        "Divida a aparência visual nas categorias carne, acompanhamentos "
        "(arroz, feijão, massas, batatas etc.), saladas (vegetais, folhas), "
        "e outros (alimentos incertos, molhos, misturas). "
        "Devolva as quatro categorias uma vez cada e percentuais aproximados que somem 100. "
        "Esses percentuais representam APENAS uma estimativa visual da composição, "
        "NÃO são medição de massa, preço ou gramas. Não invente ingredientes não visíveis. "
        "Sinalize incertezas de alimentos sobrepostos na observacao. "
        "Não descreva pessoas nem colete qualquer identidade."
    )
    body = {
        "model": MODEL,
        "input": [
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_image", "image_url": payload.image_data_url},
                ],
            }
        ],
        "text": {"format": {"type": "json_schema", "name": "mistura_prato", "strict": True, "schema": schema}},
        "max_output_tokens": 450,
    }
    try:
        response = requests.post(
            OPENAI_API_URL,
            json=body,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            timeout=45,
        )
        response.raise_for_status()
        raw = response.json()
        output_text = "".join(
            item.get("text", "")
            for msg in raw.get("output", [])
            for item in msg.get("content", [])
            if item.get("type") == "output_text"
        )
        if not output_text:
            raise ValueError("Modelo não retornou uma resposta textual.")
        result = json.loads(output_text)
        supplied = {part["nome"]: max(0.0, float(part["percentual"])) for part in result["categorias"]}
        total = sum(supplied.values())
        if total <= 0:
            raise ValueError("A análise não retornou categorias válidas.")
        result["categorias"] = [
            {"nome": k, "percentual": round(100 * supplied.get(k, 0.0) / total, 1)}
            for k in ("carne", "acompanhamentos", "saladas", "outros")
        ]
        result["origem"] = "ia_real"
        result["aviso"] = "Participações VISUAIS aproximadas; não equivalem a gramas comprovadas. Revise manualmente antes de calcular CMV."
        return result
    except requests.HTTPError as ex:
        detail = "Falha ao consultar a API de visão. Verifique a chave, o modelo e o saldo do projeto."
        if ex.response is not None:
            try:
                message = ex.response.json().get("error", {}).get("message", "")
                if message:
                    detail += f" Detalhe: {str(message)[:240]}"
            except ValueError:
                pass
        raise HTTPException(status_code=502, detail=detail) from ex
    except (requests.RequestException, ValueError, KeyError, TypeError, json.JSONDecodeError) as ex:
        raise HTTPException(status_code=502, detail=f"Não foi possível analisar a imagem: {str(ex)[:200]}") from ex


# Pedidos antecipados da churrasqueira: QR do cliente + painel da equipe.
app.include_router(grill_router)
