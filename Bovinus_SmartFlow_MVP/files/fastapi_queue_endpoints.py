"""
Cole no app.py do SmartFlow (depois de `app = FastAPI()`).
Guarda só números em memória — nenhuma imagem passa por aqui.
"""
from collections import deque
from typing import Optional

from pydantic import BaseModel

QUEUE_SAMPLES = deque(maxlen=5000)


class QueueSample(BaseModel):
    ts: str
    zona: str
    fila: float
    vazao_por_min: Optional[float] = None
    vazao_fonte: str = "insuficiente"      # medida | padrao | insuficiente
    espera_est_s: Optional[float] = None
    fonte: str = "camera"                  # camera | video | simulado


@app.post("/api/queue/sample")
def queue_sample(s: QueueSample):
    QUEUE_SAMPLES.append(s.model_dump())   # pydantic v1: s.dict()
    return {"ok": True}


@app.get("/api/queue/latest")
def queue_latest():
    latest = {}
    for s in QUEUE_SAMPLES:
        latest[s["zona"]] = s
    return latest


@app.get("/api/queue/history")
def queue_history(zona: Optional[str] = None, limit: int = 300):
    data = [s for s in QUEUE_SAMPLES if zona is None or s["zona"] == zona]
    return data[-limit:]
