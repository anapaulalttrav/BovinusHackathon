# Redesenho da Balança Inteligente 3D — Bovinus

## Mudanças visuais
- Base compacta em grafite fosco e aço escovado, com plataforma de pesagem e prato.
- Coluna traseira única, fixada ao visor e à base.
- Visor grande interativo no corpo da balança.
- **Câmera embutida na borda superior central do visor**, orientada para o centro do prato; nenhum braço pendurado.
- Representação ilustrativa dos alimentos sobre o prato em formato volumétrico.
- Controle de frente, vista 3/4, topo, traseira, zoom e rotação.
- Alternativa CSS 3D funcional quando o WebGL não está disponível.

## Operação preservada
- Permissão de webcam real via navegador; capturar foto e enviá-la à API apenas ao clicar em Analisar com IA.
- IA depende da variável de ambiente `OPENAI_API_KEY`, e seu uso deve ser validado com fotos reais.
- Peso total deve ser informado manualmente; sem sensor de balança física.
- Custos por categoria editáveis; resultados estimados e demonstrativos identificados.
- Painel gerencial, CSV e registro de pesagens continuam disponíveis.

## Executar
No terminal PowerShell da pasta que contém `app.py` e `requirements.txt`:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn app:app --port 8002
```

Abra http://127.0.0.1:8002/balanca-3d e http://127.0.0.1:8002/painel

## Aviso
A mini câmera da maquete **não é um dispositivo conectado**. A captura usa a webcam real do computador/celular. No ambiente físico, o sensor deverá ser instalado e calibrado apontando para a região de pesagem, respeitando normas de segurança e privacidade.
