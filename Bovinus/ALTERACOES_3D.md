# Bovinus — maquete 3D da unidade Augusta (v0.3)

## O que mudou

O restaurante genérico do Sketchfab foi substituído por um modelo 3D próprio, construído **a partir do mapa esquemático fornecido na reunião**. A versão inclui palco e DJ à esquerda, salão inferior (~20 mesas), principal (~30 mesas), superior (~40 mesas), churrasqueira e balanças próximos ao buffet, três ilhas (sobremesas, quentes e saladas), distribuição de pratos, copa de bebidas, caixas, bar/espera, entrada e saída.

## O que é funcional

- Rotação por arraste do mouse; zoom com rolagem; botão **Vista geral**.
- Botões/hotspots para churrasqueira, balança, cubas e entrada, com foco aproximado.
- Cores dinâmicas (verde/amarelo/vermelho) calculadas pela mesma simulação por faixas de cinco minutos.
- Aba **Mapa real** permanece disponível para comparação com o desenho original.
- O novo 3D funciona tanto no servidor do VS Code quanto em `backup_offline.html` sem internet.

## O que é aproximado

A planta não é arquitetônica, então **nenhuma dimensão ou altura é confirmada**. A maquete é uma representação espacial conceitual para a demonstração; não é uma reprodução fotográfica do restaurante. O modelo de filas permanece baseado em hipóteses ilustrativas, não dados reais capturados na unidade.

## Arquivos

- `augusta_3d.js` — geometria da cena 3D, câmera e hotspots, editáveis em código.
- `modelo_augusta_conceitual.glb` — modelo 3D exportado, para abrir em Blender e outros softwares compatíveis.
- `layout_augusta_conceitual.json` — objetos e dimensões relativas; permite ajustar a maquete.
- `simulador.html` — tela integrada.
- `backup_offline.html` — demonstração sem servidor ou internet.
- `planta_augusta_recorte.png` — recorte do mapa que fundamentou o trabalho.

## Abrindo no VS Code

Na pasta `Bovinus`, use:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn app:app --reload
```

Acesse `http://127.0.0.1:8000/simulador` e clique em **3D da Augusta**. Alternativa offline: abra `backup_offline.html`.

## Demonstração recomendada

Mostre primeiro a **planta enviada pela Bovinu's**, alterne para **3D da Augusta** e selecione **Churrasqueira**. Mova a linha do tempo para o pico e compare as cores da churrasqueira, balança e cubas. Por fim, mostre como o alerta muda quando a capacidade de atendimento é alterada.
