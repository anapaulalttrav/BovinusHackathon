# Bovinus — Tablet 3D realmente interativo (projeto separado)

Este projeto é independente do sistema principal Bovinus e não modifica o módulo da churrasqueira, o caixa nem a cozinha.

## O que foi desenvolvido

O endereço `/tablet-3d?mesa=12` mostra **um único tablet manipulável em 3D**, com o aplicativo Bovinus **dentro da tela do objeto** — não ao lado. É possível:

- **Arrastar para girar**, usar o scroll ou o controle de zoom, virar para a traseira e retornar à frente;
- **Tocar nos botões diretamente na tela do 3D** para navegar entre Atendimento, Bebidas e Feedback;
- Solicitar **garçom, talheres, guardanapos, limpeza da mesa, troca de prato ou ajuda**;
- Pedir **água, refrigerante, suco ou café**, com quantidade de 1 a 5;
- Dar feedback sobre **atendimento, tempo de espera e limpeza**;
- Visualizar os chamados recebidos no painel dos garçons em `/salao/painel`;
- Abrir o tablet vinculado a uma mesa ilustrativa na maquete 3D em `/maquete`.

O tablet principal é uma **geometria autoral renderizada com WebGL**, com frente, verso, espessura, laterais, câmera e botões. Sua tela é uma textura dinâmica desenhada em um canvas, com mapeamento dos cliques para as funções reais de salão. **Não precisa do Sketchfab nem de conexão com a internet.** Se o navegador não oferecer WebGL, aparece um modo compatível com perspectiva 3D e a tela funcional incorporada ao tablet; o painel continua funcionando normalmente. Esse modo compatível pode ter menor realismo geométrico.

## Abrir no VS Code (Windows)

1. Extraia `Bovinus_Tablet_3D_Interativo.zip`.
2. No VS Code, use **File → Open Folder** e abra a pasta interna **`Bovinus_Tablet_3D_Interativo`**, onde estão `app.py` e `requirements.txt`.
3. Em um terminal PowerShell **dentro dessa pasta**, execute **um comando por vez**:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn app:app --host 127.0.0.1 --port 8001
```

4. Espere aparecer `Application startup complete.` **e mantenha o terminal aberto**.
5. Acesse os links:

| Página | Endereço |
|---|---|
| Tablet 3D real e clicável | http://127.0.0.1:8001/tablet-3d?mesa=12 |
| Painel dos garçons | http://127.0.0.1:8001/salao/painel |
| Maquete 3D das mesas | http://127.0.0.1:8001/maquete |
| Tela plana de emergência | http://127.0.0.1:8001/tablet?mesa=12 |
| Início | http://127.0.0.1:8001/ |

**PIN local de demonstração do painel:** `2468`. Antes de publicar na internet, configure outro PIN via variável `BOVINUS_SALAO_PIN` e implemente autenticação adequada; o PIN simples não é suficiente para um sistema público.

## Teste do fluxo

1. No tablet 3D, clique em **Frente** e toque na opção **TALHERES** dentro da tela.
2. Abra `/salao/painel` em outra aba, entre com o PIN `2468` e veja o pedido da mesa 12.
3. Volte ao tablet, selecione **BEBIDAS**, escolha café, aumente a quantidade para 2 e toque em **SOLICITAR BEBIDA**.
4. Confira o novo chamado no painel e finalize os atendimentos.
5. Selecione **FEEDBACK**, responda às 3 perguntas e envie; confira no painel.
6. Teste **Traseira**, **Vista 3/4**, **Giro automático**, **Zoom** e **Arraste**.

## Notas técnicas e limites

- Renderização 3D em `tablet_3d_real.js` (WebGL nativo); frontend em `tablet_3d.html`.
- API e persistência local: FastAPI + SQLite em `salao.py`.
- Arquivo SQLite local é criado automaticamente e **não deve ser enviado para um repositório público**.
- O modelo 3D é conceitual e não reproduz um Samsung exato ou outra marca de tablet.
- Chamados e bebidas são solicitações à equipe do salão; **não** criam ordens para cozinha, pagamentos ou estoque.
- Os testes de API e sintaxe passaram. A renderização WebGL real **não pôde ser validada visualmente nesta sessão**, porque o navegador de teste não disponibilizou WebGL; o modo compatível foi verificado visualmente. Faça o teste final no Chrome/Edge do seu computador.
- O servidor local deve permanecer rodando enquanto as páginas estiverem abertas. A porta 8001 permite usar o Bovinus principal separadamente na porta 8000.

## Correção da tela 3D vazia (25/11/2026)

Corrigida uma referência JavaScript a `link-normal` que não existe no HTML do tablet. O erro interrompia a renderização WebGL e deixava a área do tablet em branco. Atualize a pasta completa, inicie o servidor e faça um recarregamento forçado (`Ctrl+Shift+R`) no navegador para garantir que o JavaScript novo seja carregado.
