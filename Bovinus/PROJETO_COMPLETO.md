# Bovinus — Documento consolidado do Hackathon

> **Versão:** 0.2 — consolidação das ideias e do protótipo até 24/11/2026  
> **Unidade:** Bovinu's Grill & Beer — Augusta, São Paulo  
> **Prazo informado:** quinta-feira, **26/11/2026, às 12h** (horário de São Paulo)  
> **Natureza:** documentação de projeto + estado do MVP. **Não** é relatório de implantação real ou de resultados comprovados.

---

## 1. Resumo executivo

**Ideia central:** usar tecnologia para tornar o almoço executivo da Bovinu's Augusta mais eficiente em **dois aspectos complementares**:

1. **SmartQueue — menos filas:** medir o tempo de espera e localizar gargalos sobretudo na **churrasqueira**, **balança** e **entrada/circulação do salão**, no pico de almoço.
2. **SmartScale AI — mais inteligência sobre o prato:** combinar a **foto do prato** capturada na área da balança, o **peso total** e uma **tabela de custos dos alimentos** para estimar a composição do prato, seu **CMV alimentar** e padrões de consumo. Num segundo momento, medir **sobras no prato** por pesagem específica no recolhimento.

**Proposta de valor:** a empresa já conhece peso e preço do prato por kg, mas não tem a composição detalhada do que foi servido, o custo alimentar por mix nem uma métrica estruturada das sobras. Ao mesmo tempo, enfrenta concentração de clientes e filas na janela de almoço. O projeto apresenta um painel único para visualizar **fluxo de clientes + mix de consumo**, sem alterar o modelo de self-service.

**Frase para apresentação:** **"Menos fila. Mais inteligência em cada prato."**

### Pergunta que deve guiar cada funcionalidade

> **"Isso reduz quantos segundos de espera no pico da Augusta, ou melhora qual informação de custo/consumo — e como vamos provar?"**

A SmartScale **não deve ser vendida como solução automática para as filas**. Ela responde à dor de visibilidade de custos, consumo e desperdício. O SmartQueue responde à dor de fluxo e tempo de espera. Ambos podem compartilhar dados por faixa horária.

---

## 2. Fonte e leitura do desafio

Este documento organiza **as nove imagens enviadas**, as **anotações fornecidas sobre a reunião com a empresa**, as ideias anteriores do grupo e as decisões desta conversa. Não pressupõe acesso a uma gravação da reunião ou a dados internos. Valores das anotações são tratados como **informações relatadas**, ainda sem base de dados exportada para auditoria.

### Escopo estabelecido nas imagens

- **Local:** unidade Augusta — Bovinu's Grill & Beer.
- **Serviço:** almoço, com atenção especial ao **horário de pico**.
- **Jornada analisada:** cliente **se serve e é atendido**.
- **Dores citadas no desafio:**
  - **Mix do prato servido:** conhecem peso, mas não sabem exatamente quais ingredientes foram servidos; carne e acompanhamentos têm impactos de custo diferentes.
  - **Filas e tempo do cliente:** acesso ao buffet, churrasqueira, tempo de atendimento e entrada/acomodação.
  - **Limpeza do salão:** tempo que mesas permanecem sujas após a saída do cliente.
  - **Qualidade da comida:** sobras nos pratos, itens que ficam sem saída no buffet, reposição e manifestações espontâneas dos clientes.
- **Abertura a outras dores:** observar o serviço e os dados comportamentais que o cliente demonstra, mas não relata espontaneamente.

### Expressamente **fora do escopo**

1. Operação da **cozinha**, compras e estoque.
2. **Sistemas de pagamento**, inclusive pagamento online.
3. Mudança da **forma de trabalho/serviço** (ex.: trocar o self-service para serviço à la carte).

**Consequência para o MVP:** não integrar pagamento, não propor produção automática à cozinha, não comandar compras ou estoque, não mudar o self-service, e não exigir cadastro/check-in em uma etapa que possa criar uma nova fila.

---

## 3. Dados e observações da reunião com a empresa

| Tema | Informação anotada | Como usar / ressalva |
|---|---|---|
| Serviço | Buffet montado por volta de **11h30**; serviço até **15h30** | Janela da operação de almoço |
| Pico principal | **12h10–13h20**, principalmente de segunda a sexta | Janela prioritária do SmartQueue |
| Janela adicional | **12h30–14h** citada em relação aos caixas | Observar, mas **não redesenhar pagamentos** |
| Volume dias úteis | Aproximadamente **600 clientes/dia** | Relato; ainda sem distribuição por 5 minutos |
| Antes da pandemia | Cerca de **800 clientes/dia**, com almoço mais distribuído | Contexto, não linha de base atual |
| Sábado/domingo | Aproximadamente **250 clientes por dia** em cada dia | Fora do pico prioritário de dias úteis |
| Clientes do entorno | Executivos, bancos e escritórios | Sensibilidade a esperas curtas no almoço |
| Preço por peso | **R$ 119/kg** | Receita ilustrativa = peso líquido × 119/kg |
| Opção à vontade | **R$ 90** | Precisa confirmar como este cliente é registrado/medido |
| Diferencial | Churrasqueira e variedade de cortes | Principal atrativo; não desvalorizar o serviço |
| Churrasqueira | **4 minutos** de espera foi descrito como ruim; **2min30s** como bom | Referências relatadas, não estatísticas auditadas |
| Equipe churrasqueira | **4 pessoas**: aproximadamente **3 em contato com o cliente** e **1 na churrasqueira** | Validar distribuição real durante o pico |
| Balanças | **3 balanças** com **1 operador** em certas situações; às vezes **2 em movimento** | Possível limitação operacional a ser cronometrada |
| Caixas | **2 baias** de caixa com **2 operadores** e **2 totens**; caixa auxiliar com **1 pessoa** e **1 totem** | Contexto do mapa, fora do escopo de mudança de pagamento |
| Mesas | Salão com flexibilidade para juntar mesas, inclusive grupos de **10 a 15 pessoas** | Pode favorecer ocupação; verificar se filas bloqueiam a circulação |
| Distribuição das mesas | Mapa indica **~20 inferior, ~30 principal e ~40 superior** | Aproximadamente **90 mesas**, não uma contagem in loco |
| Buffet | Cerca de **30 saladas**, **30 pratos quentes**, **10 opções de churrasqueira**, **20 sobremesas** | Variedade pode afetar a velocidade de escolha |
| Bebidas/café | Anotação de que **5% a 10%** pedem água, refrigerante ou café | Informação a validar; sugestão de café pós-refeição é secundária |
| Promoções | **10% de desconto** de 11h30 a 12h e depois de 13h30 | Contexto para distribuir demanda; não mudar política comercial no MVP |
| Dia/condições | Terça-feira foi citada como de alta demanda; chuva ao meio-dia pode atrapalhar muito; feriado reduz fluxo | Registrar fatores externos na comparação de filas |
| Outros eventos | Happy hour sexta e eventos de fim de ano | Não priorizar no almoço da Augusta |

**Importante:** 600 clientes em 4 horas equivalem a **2,5 clientes/minuto na média de toda a janela**, mas **não** representam a taxa de chegada entre 12h10 e 13h20. Precisamos medir chegadas por intervalo de 5 minutos antes de dimensionar qualquer solução.

---

## 4. Interpretação do mapa da casa e da foto das balanças

### Jornada representada no mapa

**Entrada/bar de espera → retirada de pratos → buffet de saladas e quentes → churrasqueira (se utilizada) → balança → escolha/ocupação da mesa → atendimento no salão → saída.**

A ordem exata pode variar segundo o percurso real do cliente e deve ser validada por observação. O mapa apresenta **salão inferior**, **principal**, **superior**, **churrasqueira**, **balança**, **caixas**, **entrada/saída** e **caixa auxiliar**.

### Três hipóteses para observar

1. **Concentração churrasqueira–balança:** filas próximas podem interferir na passagem de quem apenas se serve e quer pesar o prato.
2. **Capacidade operacional da balança:** três equipamentos não significam três atendimentos simultâneos se houver somente um operador ou configuração que exige sua intervenção.
3. **Distribuição entre salões:** a concentração em um setor pode aumentar circulação e espera mesmo havendo mesas em outras áreas.

**Cuidado:** são **hipóteses** apoiadas no desenho e nas anotações, não congestionamentos medidos. O mapa não confirma larguras dos corredores, campo de visão das câmeras nem tempos de deslocamento.

### Oportunidade da balança com câmera

A fotografia enviada mostra uma área de pesagem com equipamentos alinhados no balcão. Esse local é promissor como ponto de captura do prato **por já fazer parte da jornada**. Para um piloto físico, a câmera deve fotografar **o prato, não o rosto**, e a captura deve ocorrer em paralelo à leitura de peso, **sem um clique obrigatório adicional** para o cliente.

---

## 5. Ideias iniciais do grupo e decisão de produto

| Ideia | Decisão nesta versão | Motivo |
|---|---|---|
| Câmera com IA na balança | **Prioridade máxima** | Responde diretamente à falta de dados do mix e custo do prato |
| Medição/monitoramento das filas | **Prioridade máxima** | Responde diretamente ao problema principal: espera no pico |
| QR Code / tela na churrasqueira | **Fase futura ou teste controlado** | Pode organizar demanda, mas não aumenta capacidade sozinho |
| Totens na entrada | **Não implantar como check-in obrigatório** | Risco de transferir/criar outra fila |
| Telas com porcentagem de comida nas cubas | **Posterior** | Só é relevante para filas se falta de alimento causar congestionamento; não comandar cozinha |
| Tablets em todas as mesas | **Retirar do MVP** | Alto custo/esforço, pouca relação com fila inicial |
| Celular da equipe ou smartwatch | **Preferir celular já disponível; relógio é opcional** | Evita hardware extra sem prova de impacto |
| Sugestões de bebida/café e IA sommelier | **Posterior** | Pode aumentar receita, mas dispersa foco do desafio |
| Pagamento na mesa/online | **Não fazer** | Explicitamente fora de escopo |
| Gestão preditiva de cozinha, compras/estoque | **Não fazer** | Explicitamente fora de escopo |
| Feedback e reputação automática | **Posterior** | Não é necessário para a demonstração central |

---

## 6. Produto: dois módulos em um painel

### A. SmartScale AI — identificação de mix e custo alimentar

**Fluxo conceitual:**

1. Cliente se serve normalmente.
2. O prato é colocado na balança (no protótipo, **peso digitado manualmente**, sem conexão com hardware).
3. Uma imagem de cima do prato é capturada (no protótipo, **imagem enviada manualmente** pelo operador).
4. A IA classifica visualmente os alimentos em **carne**, **acompanhamentos**, **saladas** e **outros**.
5. O sistema apresenta percentuais **visuais aproximados**, que o operador pode revisar.
6. Para **demonstrar** o cálculo, esses percentuais são aplicados ao peso total como hipótese de distribuição de massa; custos hipotéticos por kg geram custo alimentar e **CMV estimados**.
7. Um painel agrega análises para identificar padrões por horário, mix e custo.

**Não confundir:** uma foto bidimensional **não mede os gramas reais de cada ingrediente**. Itens sobrepostos, densidade, molhos e cortes de carne introduzem erro. Portanto, **CMV por prato não está comprovado apenas pela imagem**. Para produção real, é preciso calibrar com pratos de composição pesada e conhecida, idealmente utilizando mais de uma vista ou técnicas mais robustas.

**Exemplo didático (não é dado da Bovinu's):**

- Peso: 500 g = 0,5 kg.
- Venda por kg: R$ 119/kg.
- Receita do prato: **R$ 59,50**.
- Mix suposto: 40% carne (200 g), 30% acompanhamentos (150 g), 30% saladas (150 g).
- Custos por kg fictícios: carne R$ 70; acompanhamentos R$ 18; saladas R$ 15.
- Custo estimado: R$ 14,00 + R$ 2,70 + R$ 2,25 = **R$ 18,95**.
- CMV estimado: R$ 18,95 ÷ R$ 59,50 × 100 = **31,85%** (aprox. 31,8%).
- **R$ 40,55** é a diferença entre venda e custo alimentar **ilustrativo**, **não lucro líquido**.

**Fórmulas:**

```text
receita_prato = peso_total_kg × preco_venda_por_kg
peso_estimado_categoria_kg = peso_total_kg × percentual_estimado_categoria/100
custo_alimentar_estimado = soma(peso_estimado_categoria_kg × custo_categoria_por_kg)
CMV_estimado_percentual = 100 × custo_alimentar_estimado / receita_prato
```

**À vontade (R$ 90):** é importante para analisar exposição econômica da oferta fixa, mas **não assumir** que esses clientes passam na balança. Sem registro dos alimentos/porções por pessoa, não é possível calcular o CMV individual no mesmo fluxo. Esse segmento exige amostragem própria e autorização operacional, sem alterar o modelo de serviço.

### B. SmartQueue — observação e medição das filas

No MVP, a medição é **manual com cronômetros digitais**, e não visão computacional automática de multidões.

Para cada cliente observado no ponto de atendimento:

1. **Entrou na fila** — início do tempo de espera.
2. **Iniciou atendimento** — fim da espera e início do atendimento.
3. **Finalizou atendimento** — fim do atendimento.

A interface permite fazer isso separadamente na **churrasqueira** e **balança**, incluir contagens de pessoas na fila e carregar amostras **simuladas** para demonstração.

**Indicadores:**

- Tempo de **espera**: início do atendimento − entrada na fila.
- Tempo de **atendimento**: finalização − início do atendimento.
- Tempo total no ponto: espera + atendimento.
- Tamanho da fila: contagem de pessoas aguardando por horário.
- Mediana de espera e **P90**: percentil em que 90% das observações são iguais ou menores.
- Vazão: número de atendimentos finalizados ÷ minutos observados.

**O que não podemos afirmar:** registrar a fila **não reduz, por si só, o tempo de espera**. A medição serve para testar uma ação operacional concreta, como orientação de fluxo, definição de área de espera ou melhor distribuição do atendimento existente — **sem interferir em pagamentos, cozinha ou no formato de serviço**.

### C. Painel gerencial

Combina os resultados da análise de pratos e dos cronômetros:

- Distribuição média das categorias alimentares nas análises salvas.
- Receita do prato, custo estimado e CMV hipotético.
- Esperas e atendimentos observados na churrasqueira e na balança.
- Contagens recentes e alertas simples.
- Exportação de registros numéricos para **CSV**.

É uma **demonstração**, não um ERP e não um sistema integrado à infraestrutura real da Bovinu's.

---

## 7. Desperdício: o que é possível medir de verdade

É necessário separar três conceitos:

1. **Mix servido:** o que saiu do buffet e foi colocado no prato. A câmera na balança ajuda a estimar **categorias visíveis**.
2. **Sobra no prato:** o que o cliente deixou após comer. Para medir **massa e valor** dessa sobra é preciso uma **segunda pesagem no recolhimento**, com imagem quando apropriado. **Ainda não existe integração física dessa segunda pesagem no MVP.**
3. **Sobra nas cubas:** o alimento que permaneceu no buffet. É uma fonte diferente de desperdício e não pode ser inferida pela câmera da balança do cliente.

**Métricas futuras possíveis:**

```text
taxa_sobra_prato = massa_sobras_pesada / massa_servida_pesada
valor_sobra_estimado = soma(massa_sobra_por_categoria × custo_categoria_por_kg)
```

A divisão de sobras por ingrediente exige validação visual adicional. Não confundir desperdício de prato com perda total do restaurante. Qualquer medição com pessoas deve minimizar dados pessoais e excluir rostos e documentos das fotos.

---

## 8. Como provar os resultados: plano de validação

### Teste SmartQueue: prova de redução da fila

1. Observar um período comparável ao **pico de 12h10–13h20**, idealmente em mais de um dia semelhante.
2. Registrar chegadas por intervalos de **5 minutos**, tamanho da fila e tempos de atendimento.
3. Cronometrar, como meta de piloto, **20 ou mais clientes por ponto** na churrasqueira e na balança (uma amostra inicial, não garantia estatística).
4. Identificar o gargalo real: demora antes de começar a atender, atendimento longo, ou bloqueio por cruzamento de percursos.
5. Testar **uma intervenção identificável** (p. ex., orientação visual sem criação de nova fila) e repetir as medições.
6. Comparar **mediana, P90, vazão e pico de tamanho de fila** em horários e condições equivalentes.

**Pergunta central:** **"Quantos segundos de espera foram reduzidos?"** Sem comparação antes/depois real, qualquer percentual apresentado deverá aparecer como **simulação**, nunca como resultado do restaurante.

**Controle de fatores externos:** dia da semana (especialmente terça), clima/chuva, feriado, chegada de grupos e quantidade de atendentes ativos. Não confundir fila menor por menor movimento com eficiência maior.

### Teste SmartScale: prova de acerto do mix/CMV

1. Montar pelo menos **15 pratos de teste**, com ingredientes e gramas pesados separadamente.
2. Fotografar cada prato com iluminação e posição comparáveis às da balança.
3. Rodar a análise de categorias, **sem informar a composição real à IA**.
4. Comparar classe identificada, participação visual e **gramas estimados** com a referência pesada.
5. Medir erro médio absoluto em **pontos percentuais** e em **gramas por categoria**.
6. Repetir o cálculo com **custos por kg reais**, apenas se autorizados e fornecidos pela empresa.
7. Medir o tempo da operação **com e sem a câmera**, para confirmar que a captura não aumentaria a fila.

**Pergunta central:** **"O custo estimado é útil e suficientemente preciso para decisões agregadas, sem atrasar a pesagem?"**

### Objetivos orientadores, não resultados

- **Churrasqueira:** referência relatada de espera boa de **2min30s**; quatro minutos descritos como ruim. Atingimento precisa ser medido.
- **Balança:** meta de **nenhum clique obrigatório extra do cliente** na operação futura.
- **CMV:** informar sempre a margem de erro e não chamar custo alimentar de lucro.
- **Sobras:** medir massa de descarte, não deduzir desperdício a partir de foto antes da refeição.

---

## 9. O que foi implementado de fato no protótipo v0.1

**Arquivos confirmados no projeto entregue:**

```text
Bovinus/
├── app.py                   # API FastAPI, página principal e chamada de visão
├── index.html               # Front-end HTML, CSS e JavaScript
├── requirements.txt         # FastAPI, Uvicorn e Requests
├── README.md                # Instruções de instalação, demonstração e limites
├── screenshot_scale.png     # Captura de tela do módulo Balança IA
└── screenshot_dashboard.png # Captura de tela do painel
```

**Funcionalidades disponíveis:**

- Navegação entre **Balança IA**, **Monitor de filas**, **Painel gerencial**, **Método e limites**.
- Formulário para peso total, valor por kg e custos por categoria.
- Carregamento de **exemplo ilustrativo** e edição da composição do prato.
- Carregamento de imagem e envio opcional para um modelo de visão por **API da OpenAI**.
- Resposta estruturada com quatro categorias: **carne, acompanhamentos, saladas, outros**.
- Cálculo **estimado** de peso por categoria, custo alimentar, receita e CMV.
- Registro de análise numérica local (não de foto) e dashboard.
- Cronômetros de **entrada na fila**, **início** e **fim** do atendimento para churrasqueira e balança.
- Contagem manual de pessoas e amostras de **demonstração simuladas**.
- Exportação **CSV**, limpeza de dados e armazenamento local no navegador.

**Tecnologia:** Python, **FastAPI**, Uvicorn, Requests e front-end sem framework (HTML/CSS/JavaScript). O modelo de visão padrão no código é `gpt-4.1-mini`, configurável por variável de ambiente `OPENAI_MODEL`.

**Endpoints:**

| Endpoint | Método | Função |
|---|---|---|
| `/` | GET | Abre a aplicação web |
| `/api/status` | GET | Informa se há chave da API e qual modelo está configurado |
| `/api/analyze` | POST | Recebe imagem JPEG/PNG/WebP em Data URL, consulta modelo e retorna classes estimadas |

**Verificação efetuada nesta consolidação:**

- `GET /` respondeu **200**.
- `GET /api/status` respondeu **200**, informando `ai_enabled: false` sem chave configurada.
- `POST /api/analyze` sem chave respondeu **503** com mensagem orientando modo demonstração.

**Não foram comprovados aqui:** a acurácia real de visão, funcionamento com chave ativa e dados reais da unidade, conexão física à balança, câmera automática, sensoriamento automático de fila, redução de segundos, cálculo contábil de lucro ou implantação em produção.

### Limites de dados e privacidade

- No código atual, **imagens não são gravadas no servidor da aplicação**; ao clicar em análise real, são enviadas para a API de visão, caso configurada.
- Resultados e medições numéricas são guardados no **armazenamento local do navegador**.
- Antes de usar fotos reais, remover rostos, telas de comanda ou identificadores pessoais; não usar reconhecimento facial.
- Uma chave da API deve ficar **somente no servidor**, nunca exposta no HTML.
- O uso da API pode ter custo e depende de credenciais/limites próprios; assinatura ChatGPT não equivale a chave de API.

---

## 10. Como executar o protótipo

Extraia o arquivo `.zip` do projeto, abra um terminal na pasta `Bovinus` e rode:

```bash
python -m pip install -r requirements.txt
python -m uvicorn app:app --reload
```

Acesse no navegador:

```text
http://127.0.0.1:8000
```

### Ativar análise de imagem com IA real (opcional)

**Windows PowerShell:**

```powershell
$env:OPENAI_API_KEY="SUA_CHAVE_DA_API"
python -m uvicorn app:app --reload
```

**Linux/macOS:**

```bash
export OPENAI_API_KEY="SUA_CHAVE_DA_API"
python -m uvicorn app:app --reload
```

Sem chave, use o botão **"Carregar exemplo ilustrativo"** na Balança IA e **"Inserir amostras simuladas"** na seção de filas. **Identifique esses dados como simulações durante o pitch.**

### Roteiro de demonstração de 3 minutos

- **0:00–0:30 — problema:** 600 clientes/dia anotados, concentração em 12h10–13h20, filas, e ausência de mix detalhado do prato.
- **0:30–1:35 — SmartScale:** exemplo de prato com 500 g a R$119/kg; exibir categorias, custos, CMV e explicar limitações da estimativa visual.
- **1:35–2:15 — SmartQueue:** iniciar/parar cronômetro; exibir espera, atendimento e observações do pico.
- **2:15–2:45 — painel:** comparar consumo com fluxo por faixa horária, sem dizer que correlação é causa.
- **2:45–3:00 — fechamento:** provar como coletar dados antes inexistentes e como o piloto medirá segundos economizados e precisão de custo.

---

## 11. O que **não** está pronto e deve continuar no backlog

### Crítico para um piloto real

- Integração com **peso real** gerado pela balança.
- Instalação e calibração da **câmera superior** com disparo automático.
- Teste da IA de visão com **pratos pesados por ingrediente** e validação de acurácia.
- Tabela **real, autorizada** de custo por categoria/item e granularidade adequada (categoria ampla pode esconder diferenças importantes entre carnes).
- Coleta de **tempos reais de fila** por pessoas durante o pico.
- Projeto de ação operacional **testável** para diminuir fila e medição antes/depois.

### Próximas fases (não para quinta)

- Coleta separada de **sobras no prato**, com nova pesagem e categorização.
- Medição das **sobras nas cubas**, sem comandar cozinha/estoque.
- Contagem automática e anônima de pessoas nas filas por visão computacional.
- QR Code/tela da churrasqueira, **somente se prova de valor mostrar redução do atendimento efetivo**.
- Indicadores completos de jornada entrada → buffet → churrasqueira → balança → mesa.
- Acompanhamento de disponibilidade e limpeza de mesas.

### Não implementar por serem fora do escopo

Pagamento no tablet/online, modificações de cobrança, automatização da operação da cozinha, compras/estoque, mudança para à la carte ou um ecossistema de reservas e delivery que desvie do almoço Augusta.

---

## 12. Priorização e cronograma de entrega

### Prazo

**Quinta-feira, 26 de novembro de 2026, 12h — horário de São Paulo.**

### Plano de trabalho do grupo

| Período | Entrega priorizada | Critério de pronto |
|---|---|---|
| Terça 24/11, noite | Abrir projeto e dividir tarefas | Rodar página e percorrer módulos |
| Quarta 25/11, manhã | Validar 1–3 imagens com e sem chave; revisar fórmula | Demonstrar origem **simulada/real** corretamente |
| Quarta 25/11, tarde | Gerar amostra de teste de filas ou colher medições autorizadas | Painel recebe tempos, contagens e CSV |
| Quarta 25/11, noite | Pitch, slides e ensaio | Demonstração completa em ~3 minutos |
| Quinta 26/11, manhã | Rodada final de testes e envio | Material entregue **antes de 12h** |

**Divisão sugerida (adaptável ao tamanho do grupo):**

- **Produto/visão:** foto, classificação, revisão visual e validação com pratos pesados.
- **Filas/operacional:** medição de tempos, P90, coleta e proposta de intervenção.
- **Dados/finanças:** cálculo de custo/CMV, hipóteses, teste da tabela de custos e desperdício futuro.
- **Pitch/qualidade:** narrativa, testes integrados, apresentação e documentação.

### Escopo mínimo de entrega (P0)

- [x] Aplicação web inicial com interface demonstrável.
- [x] Exemplo de prato e cálculo de CMV **ilustrativo**.
- [x] Endpoint de análise visual com API opcional (ainda **não validado com chave real**).
- [x] Cronômetros manuais de filas e registro de contagem.
- [x] Painel gerencial e exportação CSV.
- [x] Documentação de contexto e limitações.
- [ ] Análise de foto real revisada e documentada com amostra de teste.
- [ ] Uma medição confiável de espera e ação de melhoria comparável, caso o grupo tenha acesso à operação.
- [ ] Ensaiar o pitch e congelar o escopo antes da entrega.

---

## 13. Argumento final para os jurados

> **"A Bovinu's Augusta atende um grande volume de pessoas em uma janela curta de almoço. Hoje, a empresa identifica quanto o prato pesa e quanto foi pago, mas não dispõe de uma visão detalhada do mix servido, do custo alimentar estimado por composição e das sobras. Também enfrenta filas em pontos importantes da jornada. O Bovinus combina uma SmartScale, que transforma a pesagem em inteligência de consumo, com um SmartQueue, que mede as esperas e permite validar melhorias no fluxo. Não estamos mudando o modelo de restaurante: estamos usando o que ele já faz para gerar dados e melhorar decisões."**

### Mensagem de responsabilidade técnica

- **A IA identifica visualmente categorias; ela não pesa ingredientes pela foto.**
- **CMV estimado não equivale a lucro por cliente.**
- **Sobras precisam ser pesadas depois da refeição; não são visíveis na foto inicial.**
- **Um painel de fila mede o problema, mas só intervenção testada comprova segundos economizados.**
- **Todos os dados de demonstração devem ser rotulados como ilustrativos.**

---

## 14. Arquivos que acompanham o documento

**Pacote do protótipo:** `Bovinus_v02.zip` (ou a versão consolidada deste pacote).  
**Este documento Markdown:** `Bovinus_Projeto_Completo.md`.  
**Capturas do aplicativo:** `screenshot_scale.png` e `screenshot_dashboard.png`, dentro do projeto.  
**Referências originais:** as nove imagens enviadas na conversa (quando incluídas no pacote consolidado, estão em `referencias/`).

**Status geral:** **MVP demonstrativo construído; integração real de hardware, dados financeiros e desempenho em operação ainda pendentes.**

---

## 18. Atualização de 25/11/2026 — Previsão de pico, alertas de cubas e simulador visual

**Nova prioridade aprovada:** somar ao SmartScale e ao SmartQueue dois módulos demonstráveis e um recurso de apresentação, preservando o escopo original:

1. **SmartQueue Predict:** chegadas hipotéticas em janelas de 5 minutos, cálculo por fluxo/capacidade, previsão condicional de fila e alertas para realocação de atendentes já existentes.
2. **SmartBuffet:** consumo por categoria derivado de peso e mix estimado, cruzado com nível inicial e participação de cada item/cuba configurados manualmente, para projetar risco de esgotamento.
3. **Visualizador:** hotspots de risco na planta da Augusta e um 3D **autoral** reconstruído do mapa esquemático, com salões, churrasqueira, balança, cubas, entrada e caixas. Funciona offline, mas suas medidas são aproximadas.

**Implementação criada:** `simulador.html` (rota `/simulador`), `backup_offline.html` e `planta_augusta_recorte.png`. O backend FastAPI também serve a rota de simulação.

**Regra rigorosa de interpretação:** o mix do prato é uma estimativa visual, não medição direta da massa de cada ingrediente. Mesmo com o peso conhecido, a distribuição por categoria tem erro. Uma categoria (ex.: quentes) contém múltiplas cubas: sem identificar o alimento individual ou observar a retirada não há taxa real de consumo por cuba. O modelo requer **participação configurada** de cada cuba, além de **quantidade disponível** e um **limiar mínimo**. O alerta é uma hipótese para a equipe de salão verificar presencialmente, e não um comando de reposição à cozinha.

**Equações:**

```text
capacidade_5min = 300 * atendentes_ativos / segundos_por_cliente
fila_fim[t] = max(0, fila_fim[t-1] + chegadas_posto[t] - capacidade_5min)
espera_projetada_min[t] ≈ 5 * fila_fim[t] / capacidade_5min
consumo_cuba_5min_g[t] = clientes[t] * fracao_que_passa_na_balanca * peso_medio_g * mix_categoria * participacao_cuba_na_categoria
```

**Questões a validar para a banca:** como medir chegadas por 5 minutos? Qual o tempo de serviço real por estação? Qual a proporção dos clientes que procura churrasco? O cliente à vontade é pesado ou não? É possível registrar o peso restante de cubas sem perturbar a operação? Qual a fração efetiva de um item dentro das categorias reconhecidas? Quais decisões são permitidas à equipe de salão, sem comandar a cozinha?

**Roteiro de demo:** balança com IA (foto e CMV) → simulador às 12h10 e 13h15 → alteração do nº de operadores → alerta de cuba baseado em nível manual → mapa real com hotspots → 3D genérico opcional → backup offline pronto.

**Modelo 3D v0.3:** autoria própria para este protótipo, com base na planta disponibilizada no Hackathon. Dados geométricos em `layout_augusta_conceitual.json`; arquivo `modelo_augusta_conceitual.glb`; visualização local em `augusta_3d.js`. Não corresponde a levantamento arquitetônico real.

**Nota de versão:** o simulador também inclui uma curva visual de chegadas e capacidade útil **hipotética e editável** para cada cuba. Há testes automatizados básicos em `teste_simulador.js`, executáveis com Node.js. O arquivo `backup_offline.html` traz uma cópia independente do simulador para apresentação sem rede; não demonstra o 3D externo nem analisa fotos com API.

---

## Atualização v0.4 — Pedido antecipado de carne por QR Code

**Nova proposta:** o cliente escolhe o corte e o ponto no celular ao iniciar o buffet. O painel da churrasqueira recebe a solicitação, permitindo finalização antecipada e retirada com código. A equipe confirma manualmente os estados; o sistema não altera cozinha, compras, estoque ou pagamento.

**Novas telas:** `/churrasqueira`, `/churrasqueira/painel` e `/churrasqueira/qr`.

**Métricas:** pedido → pronto (tempo total do processo) e chegada física ao balcão → entrega (espera presencial), ambas com mediana e P90. Os valores só demonstrarão redução de fila depois de um teste real antes/depois comparável.

**Detalhes de implementação, teste pelo Wi-Fi, segurança e limitações:** consulte `CHURRASQUEIRA_QR_MVP.md` na pasta do projeto.
