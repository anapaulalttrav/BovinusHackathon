> **Atualização de escopo (v0.5):** o módulo de churrasqueira é somente para pré-seleção e organização de atendimento, sem alteração da cozinha ou acionamento de preparo. Veja `ESCOPO_CHURRASQUEIRA.md` para o fluxo atualizado. Descrições de preparo antecipado abaixo referem-se ao protótipo histórico v0.4, não ao fluxo aprovado.

# Bovinus — Pedidos antecipados na churrasqueira (MVP v0.4)

## Problema e proposta

**Problema da reunião:** o restaurante enfrenta filas na churrasqueira durante o almoço executivo na unidade Augusta, sobretudo **12h10–13h20**. A empresa mencionou que **4 minutos de espera são ruins** e **2min30s** seria uma referência melhor.

**Hipótese de melhoria:** o cliente pode escolher o corte pelo QR Code **antes de chegar ao balcão**, enquanto monta seu prato no self-service. A equipe acompanha as solicitações em um painel, pode iniciar a finalização antecipadamente e avisa quando o pedido estiver pronto. A entrega é feita na churrasqueira com um código. Isso **pode** reduzir o tempo do cliente parado na fila, mas só será comprovado com medições antes/depois.

## O que foi implementado

1. **Tela do cliente em `/churrasqueira`**: cardápio disponível (exemplos configuráveis), seleção de corte e ponto, solicitação, código de retirada, acompanhamento a cada 3 segundos, cancelamento antes do preparo e possibilidade de novo pedido depois de entregue/cancelado.
2. **Painel da churrasqueira em `/churrasqueira/painel`**: acesso por PIN, três colunas (Recebidos, Em preparo, Prontos), registro de chegada do cliente ao balcão, entrega e cancelamento, controle de cortes visíveis, atualização a cada 2 segundos.
3. **Cartaz QR em `/churrasqueira/qr`**: gera QR SVG localmente e permite informar a URL real acessível pelo telefone. Pode ser impresso.
4. **Persistência SQLite**: pedidos e histórico permanecem depois de reiniciar o servidor; não depende de uma API paga nem de IA generativa.
5. **Métricas**: tempo da solicitação até ficar pronto, tempo presencial da chegada ao balcão até a entrega, mediana e P90. A equipe registra a chegada clicando em **Cliente chegou** no painel.
6. **Botões de demonstração**: criar três pedidos marcados **DEMO** e remover exclusivamente pedidos de teste.

### Fluxo

`Cliente escaneia QR → seleciona corte/ponto → confirma → balcão recebe pedido → equipe marca Em preparo → confirma Pronto → cliente vai à churrasqueira, apresenta código → equipe registra chegada e entrega → sistema mede espera presencial.`

## Como executar pelo VS Code (Windows PowerShell)

No terminal, dentro da pasta `Bovinus`, rode:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn app:app --reload
```

Abra estas páginas no computador:

- `http://127.0.0.1:8000/churrasqueira` — interface do cliente.
- `http://127.0.0.1:8000/churrasqueira/painel` — painel da equipe.
- `http://127.0.0.1:8000/churrasqueira/qr` — imprimir QR Code.
- `http://127.0.0.1:8000` — todos os recursos anteriores do projeto.

**PIN de demonstração do painel: `2468`.** É intencionalmente simples para testes locais. Se for usar uma rede compartilhada, defina um PIN diferente no PowerShell **antes** de iniciar o servidor:

```powershell
$env:BOVINUS_PAINEL_PIN="escolha-um-pin-longo"
python -m uvicorn app:app --reload
```

### Testar com celular via Wi-Fi

O celular e o computador devem estar na mesma rede:

1. No terminal do VS Code, execute `ipconfig` e identifique o **IPv4** do computador (por exemplo, `192.168.1.25`).
2. Inicie o servidor em rede local: `python -m uvicorn app:app --host 0.0.0.0 --port 8000`.
3. No computador, abra `http://127.0.0.1:8000/churrasqueira/qr`.
4. No campo de URL, informe `http://192.168.1.25:8000/churrasqueira`, substituindo pelo **seu próprio endereço**.
5. Clique em **Atualizar QR Code**, leia com o celular e mantenha o painel aberto no computador. Se o QR não abrir, confira o firewall do Windows e o isolamento de dispositivos da rede Wi-Fi.

> `localhost` ou `127.0.0.1` no QR Code funciona **somente no mesmo computador**. No telefone, refere-se ao próprio telefone.

### Demonstração em 60–90 segundos

1. Abra o **painel** no notebook; entre com PIN; selecione os cortes que quer disponibilizar.
2. Abra a **página do cliente** no celular (ou outra aba); escolha Picanha e ponto Ao ponto; confirme.
3. Mostre que o pedido aparece como **Recebido** na churrasqueira sem fila física de escolha.
4. Clique em **Iniciar preparo**, depois **Marcar pronto**; acompanhe a atualização no celular.
5. Quando o cliente apresentar o código, clique **Cliente chegou**, depois **Entregue**.
6. Mostre o indicador de **espera presencial** no painel; explique a comparação com uma medição tradicional.

## Como comprovar a melhoria em segundos

- **Antes:** cronometrar 20–30 clientes na churrasqueira no horário de pico: chegada física ao ponto de espera → entrega da carne.
- **Depois:** fazer a mesma medição com o QR, registrando **Cliente chegou** e **Entregue**. Comparar a **mediana, P90, clientes atendidos/minuto e tamanho da fila** em condições semelhantes.
- **Impacto em segundos = mediana antes − mediana depois**, sempre identificando a amostra, dia, horário e volume de clientes.
- **Cuidado:** “solicitação até pronto” não é “espera presencial”; deve ser exibido separadamente para evitar apresentar falsos ganhos.
- A fila pode migrar para a retirada se os pedidos ficarem prontos ao mesmo tempo. O teste precisa verificar se o balcão não congestionou.

## Limitações e cuidados

- **Não é uma integração com forno, cozinha, estoque, balanças ou pagamentos.** O sistema apenas organiza solicitações e exige confirmação humana de preparo/entrega. Está focado no atendimento na churrasqueira dentro da jornada do cliente.
- **Não prepara carne automaticamente.** A disponibilidade e a indicação “Pronto” são atualizadas pela equipe. A carne não deve ficar esperando sem condições adequadas de manutenção de temperatura ou conservação; a operação deve seguir os procedimentos sanitários do restaurante.
- Cardápio, cortes, ponto e volume são exemplos da demonstração; precisam ser confirmados com a unidade. Um pedido representa uma porção; não existe controle de gramas/custo do corte nesta versão.
- Pedidos de teste aparecem com **DEMO**; métricas calculadas com esses pedidos também são **ilustrativas**, não dados reais.
- O banco SQLite (`bovinus_churrasqueira.sqlite3`) é criado localmente e guarda somente identificadores de pedido, corte/ponto, estados e horários. Não há nomes, telefones, rostos nem pagamentos. O navegador guarda um identificador aleatório para impedir pedidos ativos duplicados.
- Atualização ocorre por consulta periódica (2–3 segundos), não por notificação push. A página do cliente deve continuar aberta durante o acompanhamento.
- O PIN padrão é apenas para Hackathon e **não** constitui segurança de produção. Para operação comercial são necessários autenticação, rede segura/HTTPS, proteção contra spam, regras de privacidade, escalabilidade e validação com funcionários e clientes.

## Teste automatizado

```powershell
python teste_churrasqueira.py
node teste_simulador.js
```

O teste Python verifica cadastro, autenticação, restrição de disponibilidade, progressão do pedido, chegada, entrega, cancelamento, métricas, pedidos de teste e geração do QR. Os testes são funcionais — não comprovam economia real de tempo ou a segurança de uma operação em produção.

## Mudanças em relação ao v0.3

- Adicionados `grill.py`, `churrasqueira_cliente.html`, `churrasqueira_painel.html`, `churrasqueira_qr.html`, `teste_churrasqueira.py` e este documento.
- Adicionada dependência `qrcode` no `requirements.txt`.
- Incluídas rotas do novo módulo em `app.py` e links no painel principal e simulador.
- **Todos os recursos anteriores da v0.3 permanecem:** SmartScale, monitor de filas, simulador de pico/cubas e maquete 3D da Augusta.
