"""
SmartQueue Cam — fila medida por câmera (sem cronômetro).

Conta pessoas dentro de zonas marcadas (balança, churrasqueira) com YOLO,
estima a vazão pelas saídas da zona e calcula:

    espera_estimada = pessoas_na_fila / vazao_por_minuto   (Lei de Little)

Privacidade: nenhum frame é gravado. Só números (zona, fila, vazão, espera)
vão para o CSV e, opcionalmente, para a API. Com --mostrar a imagem aparece
apenas na tela local.

Uso:
  1) Marcar as zonas (uma vez por posição de câmera):
       python camera_queue.py --source 0 --calibrar balanca churrasqueira
  2) Rodar:
       python camera_queue.py --source 0 --api http://127.0.0.1:8000 --mostrar
     --source aceita: índice da webcam (0), arquivo de vídeo ou URL de
     celular usado como câmera IP (ex.: http://192.168.0.10:8080/video).
"""
import argparse
import csv
import json
import statistics
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import cv2
import numpy as np
import requests

COLORS = [(0, 200, 0), (0, 160, 255), (255, 120, 0), (200, 0, 200)]


def parse_args():
    ap = argparse.ArgumentParser(description="SmartQueue Cam")
    ap.add_argument("--source", default="0", help="webcam, vídeo ou URL de câmera IP")
    ap.add_argument("--calibrar", nargs="+", metavar="ZONA",
                    help="modo de marcação das zonas, ex.: balanca churrasqueira")
    ap.add_argument("--zonas", default="zones.json")
    ap.add_argument("--modelo", default="yolov8n.pt")
    ap.add_argument("--conf", type=float, default=0.35)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--fps", type=float, default=5, help="quadros analisados por segundo")
    ap.add_argument("--intervalo", type=float, default=5, help="segundos entre amostras")
    ap.add_argument("--janela-vazao", type=float, default=300,
                    help="janela (s) para medir vazão")
    ap.add_argument("--permanencia-min", type=float, default=3,
                    help="segundos mínimos na zona para contar como atendido")
    ap.add_argument("--tolerancia", type=float, default=2,
                    help="segundos sem ver a pessoa na zona até considerar que saiu")
    ap.add_argument("--vazao-padrao", type=float, default=None,
                    help="clientes/min usado enquanto não há saídas suficientes")
    ap.add_argument("--api", default=None, help="ex.: http://127.0.0.1:8000")
    ap.add_argument("--csv", default="fila_camera.csv")
    ap.add_argument("--mostrar", action="store_true", help="janela local (não grava)")
    return ap.parse_args()


def open_source(src):
    return cv2.VideoCapture(int(src) if str(src).isdigit() else src)


def is_live(src):
    s = str(src)
    return s.isdigit() or s.startswith(("rtsp://", "http://", "https://"))


# ---------------------------------------------------------------- calibração
def calibrate(source, names, path):
    cap = open_source(source)
    ok, frame = False, None
    for _ in range(40):  # webcams costumam entregar quadros pretos no início
        ok_i, frame_i = cap.read()
        if ok_i:
            ok, frame = True, frame_i
        time.sleep(0.03)
    cap.release()
    if not ok:
        sys.exit("Não consegui ler a câmera/vídeo.")
    zones = {}
    for name in names:
        pts = []
        win = f"Calibrar {name}"
        cv2.namedWindow(win)
        cv2.setMouseCallback(
            win, lambda ev, x, y, fl, pr: pts.append([x, y]) if ev == cv2.EVENT_LBUTTONDOWN else None)
        while True:
            img = frame.copy()
            for p in pts:
                cv2.circle(img, tuple(p), 4, (0, 255, 255), -1)
            if len(pts) > 1:
                cv2.polylines(img, [np.array(pts, np.int32)], len(pts) > 2, (0, 255, 255), 2)
            cv2.putText(img, f"{name}: clique nos cantos | z = desfazer | Enter = ok",
                        (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            cv2.imshow(win, img)
            k = cv2.waitKey(20) & 0xFF
            if k == ord("z") and pts:
                pts.pop()
            elif k in (10, 13) and len(pts) >= 3:
                break
            elif k == 27:
                sys.exit("Calibração cancelada.")
        cv2.destroyWindow(win)
        zones[name] = {"polygon": pts}
    h, w = frame.shape[:2]
    Path(path).write_text(json.dumps({"frame_size": [w, h], "zones": zones}, indent=2))
    print(f"Zonas salvas em {path}")


# ---------------------------------------------------------------------- zona
class Zone:
    def __init__(self, name, polygon, min_dwell, grace):
        self.name = name
        self.poly = np.array(polygon, np.int32).reshape(-1, 1, 2)
        self.min_dwell, self.grace = min_dwell, grace
        self.seen = {}      # track_id -> [primeira_vez, ultima_vez]
        self.served = []    # instantes (s) em que alguém saiu da zona após ficar tempo suficiente
        self.counts = []    # contagens desde a última amostra
        self.t0 = None

    def contains(self, pt):
        return cv2.pointPolygonTest(self.poly, (float(pt[0]), float(pt[1])), False) >= 0

    def update(self, now, ids_in_zone, n):
        if self.t0 is None:
            self.t0 = now
        for i in ids_in_zone:
            if i in self.seen:
                self.seen[i][1] = now
            else:
                self.seen[i] = [now, now]
        for i, (first, last) in list(self.seen.items()):
            if now - last > self.grace:
                if last - first >= self.min_dwell:
                    self.served.append(now)
                del self.seen[i]
        self.counts.append(n)

    def sample(self, now, window, default):
        fila = statistics.median(self.counts) if self.counts else 0
        self.counts = []
        self.served = [t for t in self.served if now - t <= window]
        elapsed = now - (now if self.t0 is None else self.t0)
        if len(self.served) >= 3 and elapsed >= 60:
            vazao, fonte = len(self.served) / min(window, elapsed) * 60, "medida"
        elif default:
            vazao, fonte = default, "padrao"
        else:
            vazao, fonte = None, "insuficiente"
        espera = round(fila / vazao * 60, 1) if vazao else None
        return {"zona": self.name, "fila": float(fila),
                "vazao_por_min": round(vazao, 2) if vazao else None,
                "vazao_fonte": fonte, "espera_est_s": espera}


# -------------------------------------------------------------------- main
def main():
    a = parse_args()
    if a.calibrar:
        return calibrate(a.source, a.calibrar, a.zonas)
    if not Path(a.zonas).exists():
        sys.exit("Rode primeiro: python camera_queue.py --calibrar balanca churrasqueira")

    from ultralytics import YOLO  # import tardio: calibrar não precisa dele
    model = YOLO(a.modelo)
    cfg = json.loads(Path(a.zonas).read_text())

    cap = open_source(a.source)
    w = cap.get(cv2.CAP_PROP_FRAME_WIDTH) or cfg["frame_size"][0]
    h = cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or cfg["frame_size"][1]
    sx, sy = w / cfg["frame_size"][0], h / cfg["frame_size"][1]
    zones = [Zone(n, [[x * sx, y * sy] for x, y in z["polygon"]],
                  a.permanencia_min, a.tolerancia) for n, z in cfg["zones"].items()]

    live = is_live(a.source)
    fonte = "camera" if live else "video"
    src_fps = cap.get(cv2.CAP_PROP_FPS) or 30
    wall0, start_dt = time.time(), datetime.now()
    idx, last_proc, last_emit = 0, -1e9, None

    new_csv = not Path(a.csv).exists()
    f = open(a.csv, "a", newline="", encoding="utf-8")
    cols = ["ts", "zona", "fila", "vazao_por_min", "vazao_fonte", "espera_est_s", "fonte"]
    writer = csv.DictWriter(f, fieldnames=cols)
    if new_csv:
        writer.writeheader()

    last_view = {}
    print("Rodando. Ctrl+C (ou 'q' na janela) para parar. Nenhuma imagem é gravada.")
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            idx += 1
            now = (time.time() - wall0) if live else idx / src_fps
            if now - last_proc < 1.0 / a.fps:
                continue
            last_proc = now

            res = model.track(frame, persist=True, classes=[0], conf=a.conf,
                              imgsz=a.imgsz, tracker="bytetrack.yaml", verbose=False)[0]
            boxes = res.boxes
            xyxy = boxes.xyxy.cpu().numpy() if len(boxes) else np.empty((0, 4))
            tids = boxes.id.int().tolist() if boxes.id is not None else [None] * len(xyxy)

            for z in zones:
                ids, n = [], 0
                for (x1, y1, x2, y2), tid in zip(xyxy, tids):
                    if z.contains(((x1 + x2) / 2, y2)):   # ponto dos pés
                        n += 1
                        if tid is not None:
                            ids.append(tid)
                z.update(now, ids, n)
                last_view[z.name] = n

            if last_emit is None:
                last_emit = now
            if now - last_emit >= a.intervalo:
                ts = (start_dt + timedelta(seconds=now)).isoformat(timespec="seconds")
                for z in zones:
                    rec = {"ts": ts, **z.sample(now, a.janela_vazao, a.vazao_padrao), "fonte": fonte}
                    writer.writerow(rec)
                    f.flush()
                    print(rec)
                    if a.api:
                        try:
                            requests.post(f"{a.api}/api/queue/sample", json=rec, timeout=2)
                        except requests.RequestException as e:
                            print("API indisponível:", e)
                last_emit = now

            if a.mostrar:
                img = frame.copy()
                for c, z in enumerate(zones):
                    cv2.polylines(img, [z.poly], True, COLORS[c % 4], 2)
                    p = z.poly[0][0]
                    cv2.putText(img, f"{z.name}: {last_view.get(z.name, 0)}",
                                (int(p[0]), int(p[1]) - 8), cv2.FONT_HERSHEY_SIMPLEX,
                                0.7, COLORS[c % 4], 2)
                for (x1, y1, x2, y2) in xyxy:
                    cv2.rectangle(img, (int(x1), int(y1)), (int(x2), int(y2)), (255, 255, 255), 1)
                cv2.imshow("SmartQueue Cam (local)", img)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
    except KeyboardInterrupt:
        pass
    finally:
        cap.release()
        f.close()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()