# Bovinus v0.6 — Seleção de várias carnes por comanda

## O que foi alterado

**Antes:** o cliente conseguia escolher apenas um corte por pedido.

**Agora:** uma comanda pode reunir até **5 tipos de carne diferentes** na mesma solicitação, com o **ponto individual de cada corte** e até **3 porções por tipo** (limite total de 10 porções para a demonstração). Os limites são configurados para evitar pedidos acidentais muito grandes, não representam política da Bovinu's.

Exemplo de solicitação para comanda **1579**:

- 2 × Picanha — ao ponto;
- 1 × Fraldinha — bem-passada;
- 1 × Linguiça — ponto da casa.

O painel da churrasqueira exibe **uma única comanda**, com todos os cortes, quantidades e pontos. A **notinha de identificação** reúne a mesma lista de itens e o número da comanda.

## Escopo respeitado

Este recurso **não comanda a cozinha, não determina o preparo antecipado, não reserva cortes, não modifica receitas nem a produção**. O QR Code serve para a pré-seleção e organização do atendimento no balcão. A equipe confirma manualmente os cortes disponíveis pelo serviço normal. No MVP, o status **Disponível para retirada** se aplica à **comanda inteira**, e deve ser marcado apenas quando todos os itens estiverem disponíveis. A notinha é apenas um identificador para o atendimento, mantida em suporte separado dos alimentos.

As opções no menu são **exemplos para demonstração**, não confirmação dos cortes que a unidade Augusta oferece. A equipe habilita ou desabilita cada corte no painel.

## Executar no VS Code

1. Extraia `Bovinus_v06_Multiplas_Carnes.zip`.
2. Em **File → Open Folder**, abra a pasta interna **`Bovinus`**, onde ficam `app.py` e `requirements.txt`.
3. Se alguma versão anterior estiver aberta, pare o servidor com **Ctrl + C**.
4. No terminal dentro dessa pasta, execute:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn app:app --reload
```

Páginas:

- Cliente: `http://127.0.0.1:8000/churrasqueira`
- Painel: `http://127.0.0.1:8000/churrasqueira/painel` (PIN local de demonstração: `2468`)
- QR Code: `http://127.0.0.1:8000/churrasqueira/qr`

Para demonstrar:

1. Na tela do cliente, informe o número do cartão consumo: `1579`.
2. Toque em **Picanha**, **Fraldinha** e **Linguiça**.
3. Ajuste o ponto e a quantidade de cada uma em **Sua seleção**.
4. Clique em **Confirmar carnes da comanda**.
5. No painel da churrasqueira, encontre **COMANDA 1579**, com a lista dos três itens.
6. Quando todos os cortes estiverem disponíveis pelo serviço normal, marque **Disponível para retirada** e clique em **Imprimir notinha**.
7. Registre a chegada e depois a entrega para medir a espera presencial.

## Arquivos modificados

- `grill.py`: suporte a múltiplos itens na mesma solicitação, validação, persistência e migração de registros antigos.
- `churrasqueira_cliente.html`: interface de multisseleção, pontos e quantidades por corte.
- `churrasqueira_painel.html`: lista de todos os itens no card e na notinha.
- `teste_selecao_multipla.py`: testes dos pedidos multi-item, migração e validações.
- `app.py`: versão atualizada.

## Dados existentes

A versão 0.6 usa a tabela `pedido_itens` além da tabela `pedidos`. Ao iniciar o servidor, o sistema **cria automaticamente a tabela nova** e importa cortes de pedidos antigos. A migração foi testada com registros no formato anterior.

Se quiser conservar comandas existentes de um projeto antigo, faça um backup do arquivo `bovinus_churrasqueira.sqlite3` **com o servidor desligado** e copie-o para a pasta `Bovinus` nova antes de iniciar. Não copie arquivos SQLite enquanto o sistema estiver em uso. Não é necessário copiar o banco para testar do zero.

Se uma comanda de teste antiga ainda estiver ativa, não é possível criar outra com o mesmo número até que a anterior seja encerrada ou cancelada; use outro número ou finalize a solicitação no painel.

## Testes e limites

- `python teste_churrasqueira.py`: testes da API antiga e rotas.
- `python teste_selecao_multipla.py`: novos testes da API com várias carnes.
- `node teste_simulador.js`: testes matemáticos do simulador.

Os testes de servidor, API e sintaxe de JavaScript foram executados. **Não foi possível concluir uma validação visual automatizada no navegador neste ambiente**, então confira a aparência e o fluxo em seu Windows antes da apresentação.

Este é um **MVP local de Hackathon**, não uma integração oficial com comandas, impressora de produção, caixa ou cozinha. O painel requer liberação da unidade, e a impressão usa a janela padrão do navegador; não há conexão automática com impressora térmica.
