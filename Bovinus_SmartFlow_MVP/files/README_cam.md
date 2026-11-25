# SmartQueue Cam

## Instalar
    python -m pip install -r requirements_cam.txt
(Na primeira execução o ultralytics baixa o yolov8n.pt, ~6 MB. Faça isso com internet, antes da demo.)

## Passo a passo
1. **Marcar zonas** (clique nos cantos da área onde a fila se forma; Enter confirma):
       python camera_queue.py --source 0 --calibrar balanca churrasqueira
2. **Rodar**:
       python camera_queue.py --source 0 --mostrar --vazao-padrao 2
   Com o app: acrescente `--api http://127.0.0.1:8000` e cole `fastapi_queue_endpoints.py` no app.py.
3. **Celular antigo como câmera**: instale um app de câmera IP (ex.: "IP Webcam") e use
   `--source http://IP_DO_CELULAR:8080/video`.
4. **Sem câmera**: use um vídeo gravado por vocês: `--source video.mp4`.

## Como o número é calculado
- **Fila**: pessoas cujos pés estão dentro da zona (mediana a cada 5 s, para não oscilar).
- **Vazão**: saídas da zona de quem ficou ≥ 3 s, por minuto, numa janela de 5 min. Enquanto há
  poucas saídas, usa `--vazao-padrao` e o CSV marca `vazao_fonte = padrao`.
- **Espera estimada** = fila ÷ vazão × 60 (segundos). É uma estimativa, não cronômetro.

## Posição da câmera
Alta, em ângulo diagonal, com o corredor da fila inteiro visível e pouca gente se sobrepondo.
Evite contraluz. Câmera de frente para o rosto não é necessária e não deve ser buscada.

## Validar antes de apresentar números
Compare com contagem manual em 20+ momentos (e, se possível, 20 clientes cronometrados):
erro médio absoluto da fila (pessoas) e da espera (segundos). Sem isso, apresente como protótipo.

## Limites conhecidos
- Pessoas muito sobrepostas ou fora do campo de visão são subcontadas.
- Quem está sendo servido na balança entra na contagem da zona (fila + atendimento).
- Se o ID de rastreamento se perde, a vazão pode ser subestimada ou superestimada.
- Dados de teste/vídeo ficam com `fonte = video`; nunca os chame de dados da Bovinu's.
