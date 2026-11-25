> **NOVIDADE V0.6: escolha várias carnes na mesma comanda!** Leia [`ATUALIZACAO_V06_MULTICARNES.md`](ATUALIZACAO_V06_MULTICARNES.md) para o passo a passo. Os documentos anteriores mostram versões históricas do MVP.

> **Atualização de escopo (v0.5):** o módulo de churrasqueira é somente para pré-seleção e organização de atendimento, sem alteração da cozinha ou acionamento de preparo. Veja `ESCOPO_CHURRASQUEIRA.md` para o fluxo atualizado. Descrições de preparo antecipado abaixo referem-se ao protótipo histórico v0.4, não ao fluxo aprovado.

# Bovinus — MVP de Hackathon

**Entregável:** aplicativo web para demonstrar uma balança com análise visual do prato, cálculo estimado de CMV, medição manual de filas e painel gerencial.

## Rodar no computador

No terminal, dentro desta pasta:

```bash
python -m pip install -r requirements.txt
python -m uvicorn app:app --reload
```

Abra http://127.0.0.1:8000 no navegador.

### IA real (opcional)

Para análise real de fotografias, configure a chave **apenas no servidor** antes de iniciar. O uso da API pode ter custo.

**Windows PowerShell**

```powershell
$env:OPENAI_API_KEY="SUA_CHAVE_AQUI"
python -m uvicorn app:app --reload
```

**macOS / Linux**

```bash
export OPENAI_API_KEY="SUA_CHAVE_AQUI"
python -m uvicorn app:app --reload
```

O app usa por padrão o modelo `gpt-4.1-mini`, configurável com `OPENAI_MODEL`. Confira se ele está habilitado na conta da API. Sem chave, funciona a **demonstração simulada** (claramente rotulada) e a coleta manual de tempos reais. **Uma assinatura do ChatGPT não é uma chave de API.**

## O que demonstrar aos jurados (3 min)

1. Abra **Balança IA**, clique em **Carregar exemplo ilustrativo**; altere 500 g, R$119/kg e preços de custo hipotéticos.
2. Mostre o cálculo do CMV e explique que a composição é estimada e deve ser validada.
3. Se possuir uma chave, carregue uma foto de um prato e selecione **Analisar com IA real**. Revise os percentuais após a resposta.
4. Abra **Filas**. Registre entrada na fila, início e fim do atendimento, em churrasqueira e balança. Opcionalmente carregue dados **simulados** para a apresentação.
5. Abra **Painel gerencial**: veja os indicadores e exporte o CSV.

## Dados de referência vs. dados da empresa

- **Da reunião:** R$119/kg; pico entre 12h10 e 13h20; 600 clientes/dia em dias úteis; churrasqueira 4 min (ruim), 2min30 (bom); três balanças, mas nem sempre três em operação.
- **Ilustrativo, não confirmado:** custos por kg de categoria, porcentagens de alimentos, amostras geradas no botão de demonstração, metas que não vieram da empresa.
- **Não medimos:** o peso exato por ingrediente por foto, lucro contábil, perdas nas cubas, ou o custo integral de quem paga R$90 à vontade sem passar por balança.

## Limitações e cuidados

- O modelo estima visualmente as categorias; **uma foto não mede o peso de cada ingrediente**. A distribuição em gramas é uma hipótese e deve ser comparada com pratos de composição previamente pesada.
- CMV = custo alimentar estimado / valor de venda * 100. Não é lucro, pois faltam salários, energia, aluguel, impostos, perdas etc.
- Para medir sobras, é necessária **uma pesagem separada ao recolher o prato**. Não confundir com alimento não consumido nas cubas.
- Os cronômetros de filas começam na chegada à fila; o marcador 'iniciar atendimento' encerra a espera e inicia o atendimento, e 'finalizar' mede a duração do atendimento. Sem amostra real, não prometemos segundos economizados.
- **Fotos não são salvas no servidor**. No modo IA, a imagem é enviada à API para análise; não envie imagens com rostos, documentos ou dados pessoais. Resultados numéricos e medições ficam no armazenamento local do navegador e podem ser apagados em **Limpar dados**.
- Não integra pagamentos, cozinha, estoque, delivery, comandas ou reconhecimento facial.

## Critérios objetivos para validar o MVP

- **Fila:** cronometrar ao menos 20 atendimentos em cada ponto no pico; medir média, mediana e P90 antes e depois de um ajuste operacional comparável.
- **Foto:** montar ao menos 15 pratos com gramas conhecidas por categoria, analisar e calcular erro absoluto médio de porcentagem e peso estimado.
- **Velocidade:** comparar tempo de pesagem com e sem câmera; captura precisa ocorrer em paralelo, sem mais cliques do cliente.
- **CMV:** usar preços reais de ingredientes somente se a empresa autorizar e fornecer. Não prometer 'lucro por cliente'.

## Como se divide o trabalho

- Integrante A: interface e experiência na balança.
- Integrante B: coleta dos tempos e lógica de filas.
- Integrante C: pesos, custos, formulação do CMV e validação.
- Integrante D: apresentação, roteiro e métricas (se forem quatro pessoas).

---

## ATUALIZAÇÃO 25/11/2026 — SmartQueue Predict, SmartBuffet e apresentação 3D

A versão 0.2 mantém a balança com IA, o cronômetro e o painel da v0.1. Novos arquivos:

- **`simulador.html`** — tela interativa acessível em **http://127.0.0.1:8000/simulador**, também pelo botão "Simulador do pico e cubas" na página inicial.
- **`planta_augusta_recorte.png`** — recorte da planta fornecida no desafio, com pontos de calor desenhados pela interface.
- **`backup_offline.html`** — versão AUTOCONTIDA do simulador para abrir diretamente no navegador sem internet nem servidor. Traz a planta incluída na própria página, dados simulados e todos os cálculos locais; **inclui o novo visualizador 3D local; não utiliza a API real da SmartScale**.

### Demonstrar em 90 segundos

1. Abra o **Simulador**. Mostre a janela de almoço de 11h30 a 15h30 e os 600 clientes/dia (dado relatado na reunião).
2. Arraste o horário até **13h05–13h15**; os indicadores de churrasqueira e balança sobem por causa do volume projetado. Informe claramente que os tempos de atendimento e o perfil de chegadas são **hipóteses**.
3. Ajuste `Operadores ativos na balança` de 2 para 3: o modelo recalcula capacidade e espera. A ação é **redistribuição possível da equipe, não integração com pagamentos**; depende de operador disponível.
4. Em **SmartBuffet**, altere a quantidade restante da "Cuba 1" para 700 g. O sistema alerta sobre o risco com base no consumo esperado da categoria e numa fração **manualmente configurada** para a cuba.
5. Mostre o **Mapa real**, ancorado na planta fornecida; abra **3D da Augusta**: a distribuição dos setores foi reconstruída a partir da planta, sem dimensões reais verificadas.
6. Volte à **Balança** e mostre como o mix alimenta o cálculo de demanda; o botão **Usar mix registrado na SmartScale** busca o armazenamento local do mesmo navegador.

### Fórmulas do simulador

- Faixas de 5 minutos, com soma de aproximadamente 600 chegadas ao longo do almoço por padrão. A curva é arbitrada para concentrar as chegadas em 12h10–13h20: **não é série histórica da empresa**.
- Para cada estação e intervalo: `capacidade_por_5min = 300 × atendentes_ativos / segundos_por_atendimento`.
- `fila_fim_proxima = max(0, fila_fim_atual + chegadas_no_posto - capacidade_por_5min)`.
- `espera_estimativa_min = fila_fim / (capacidade_por_5min / 5)`. É uma aproximação por fila fluida, não um cálculo de tempos individuais.
- `proxima_demanda_cuba_g = clientes_projetados × proporção_que_passa_pela_balança × peso_medio_do_prato_g × mix_da_categoria × participação_configurada_da_cuba`.
- A previsão de risco da cuba compara o consumo projetado nos **próximos 10 minutos** com o nível **informado manualmente** e o limite mínimo de alerta.

### Novo modelo 3D da Augusta · v0.3

- A aba **3D da Augusta** substitui o restaurante genérico do Sketchfab por um **modelo autoral construído a partir da planta entregue no Hackathon**, mantendo os mesmos pontos operacionais: entrada, três salões, palco, churrasqueira, balanças, quentes, saladas, sobremesas, espera e caixas.
- **Funciona offline**: o arquivo `augusta_3d.js` contém um renderizador 3D com Canvas e nenhum CDN; `backup_offline.html` incorpora o visualizador e a planta no próprio HTML.
- Controles: **arrastar** para girar a câmera, **rolar o mouse** para aproximar/afastar, clicar nos pontos ou nos botões de foco e **Vista geral** para voltar.
- Os hotspots de churrasqueira, balança, cubas e entrada mudam entre verde, amarelo e vermelho conforme a simulação por faixas de cinco minutos.
- `layout_augusta_conceitual.json` contém as coordenadas e dimensões **relativas** do cenário. `modelo_augusta_conceitual.glb` contém o modelo geométrico exportável para editores 3D como Blender.
- **Atenção**: a planta original é esquemática e não registra medidas precisas, largura de corredores, mobiliário real ou alturas. O 3D é uma maquete funcional conceitual, não um gêmeo digital medido. A contagem de mesas é representativa das referências ≈20, ≈30 e ≈40 da planta.
- Se precisar ajustar mesas, balcões ou paredes exibidos no simulador, altere as funções `box`, `zone`, `label` e `marker` em `augusta_3d.js`. Se modificar as coordenadas, gere um novo GLB a partir dos dados atualizados.

### O que NÃO foi feito nesta versão

- Não há previsão aprendida de dados históricos, porque não recebemos base real de chegadas por cinco minutos.
- Não há câmera real monitorando filas, cubas, pessoas ou desperdício.
- Não há leitura física de quantidade restante nas cubas e **mix de categorias não identifica qual prato específico foi consumido** sem a fração de cada cuba ser informada e calibrada.
- Não há LLM na geração das frases de alerta (elas são geradas por regras com custo de API zero). Futuramente, um LLM econômico pode **somente reescrever** os resultados calculados.
- Não foram medidos ganhos reais de segundos, redução de CMV ou produtividade; as simulações não devem ser anunciadas como resultados da empresa.
- Não há integração com operação da cozinha, compras, estoque ou pagamentos.

### Leitura do gráfico e capacidade de cuba

A faixa de barras abaixo do seletor mostra a **curva ilustrativa de chegadas por 5 min**. A barra selecionada acompanha o controle de horário. O valor diário de 600 clientes é o total da curva antes de arredondamentos visuais.

As cubas possuem também um campo **Capacidade ref. (g)**. Os valores iniciais (ex.: 6.000 g) são hipóteses para a barra visual, **não** a capacidade medida de uma cuba GN 1/1. Ajuste o peso útil com dados fornecidos pela unidade. A fração de uma categoria atribuída a uma cuba também é hipótese até ser calibrada por observação.

### Testes de lógica

```bash
node teste_simulador.js
```

Verifica soma das chegadas, horários, pico, redução de fila ao aumentar capacidade, geração de alertas e risco de cuba com nível baixo. A execução desse teste não valida a precisão do cenário. O novo 3D foi verificado separadamente em navegador, inclusive modo offline.

---

## NOVO — Churrasqueira com QR Code (v0.4)

Acesse `/churrasqueira` (celular), `/churrasqueira/painel` (equipe) e `/churrasqueira/qr` (cartaz imprimível). Os pedidos são gravados localmente no SQLite e as telas atualizam a cada 2–3 segundos. **PIN padrão do painel para testes locais: 2468.**

Para testar com celular na mesma rede Wi-Fi, execute `python -m uvicorn app:app --host 0.0.0.0 --port 8000` e no cartaz QR indique a URL do IP local do computador, não `localhost`.

Leia **`CHURRASQUEIRA_QR_MVP.md`** para fluxo, segurança, testes, hipóteses e como medir a redução real de espera.
