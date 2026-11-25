# Bovinus — churrasqueira sem modificar a operação da cozinha (v0.5)

## Premissa obrigatória
A produção, preparo, estoque, receitas, escalas, equipamentos e ritmo da cozinha/churrasqueira **permanecem iguais**. O software não emite ordem de preparo, não reserva porções e não promete um tempo de conclusão. O objetivo é organizar o **atendimento** dos cortes já oferecidos na churrasqueira.

## Experiência
1. Cliente recebe o cartão consumo com número (ex.: 1579), como já acontece.
2. No QR Code, informa a comanda, escolhe um corte oferecido e indica preferência de ponto (se houver).
3. O painel recebe a pré-seleção associada à comanda, mas isso **não aciona a cozinha**.
4. A equipe mantém exatamente a rotina atual de preparo e disponibilização.
5. Quando existir uma porção disponível no atendimento normal, a equipe pode marcar 'Disponível para retirada'. Se desejar, imprime um **cupom de identificação**, que fica em um suporte **separado da carne**, nunca em contato com o alimento.
6. O cliente chega com seu cartão, apresenta o número e recebe conforme disponibilidade confirmada pela equipe.

**Atenção**: imprimir cupom e separar uma porção no balcão são mudanças no atendimento/retirada, ainda que não alterem a cozinha. É uma opção de piloto e depende de aprovação da empresa. Se a empresa também proibir mudar o balcão, utilize somente o painel como consulta de preferências e sem reserva ou cupom físico.

## Não é escopo
- Ordenar preparo ou finalização antecipada de um corte.
- Criar prioridades de cozimento, alterar processos de churrasqueira/cozinha ou reservar uma peça antes de existir no serviço normal.
- Integrar pagamentos, caixa, estoque, compras ou produção.
- Deixar carne aguardando indefinidamente na tábua.

## Limites e medição
- A pré-seleção **não garante** redução de fila. É hipótese que pode reduzir o tempo de escolha/explicação no balcão.
- Medir P50/P90 de espera presencial e pessoas na fila antes e depois, sob volume comparável.
- Diferenciar tempo desde solicitação e tempo físico aguardando entrega.
- Número da comanda digitado manualmente: o barcode real ainda não é lido nem validado com o sistema de caixa.
- O botão de impressão abre a janela padrão do navegador: não existe integração com impressora térmica nesta versão.
- Nenhuma informação sobre preparo real é inferida pelo software. Disponibilidade depende de confirmação humana.


## Complemento v0.6 — Seleção múltipla

A comanda pode incluir vários cortes com quantidades e pontos individualizados. A equipe apenas organiza o atendimento e marca a comanda inteira como disponível quando todos os cortes já estiverem sendo servidos normalmente. Isso não autoriza ou gera ordens de preparo à cozinha. Detalhes no arquivo `ATUALIZACAO_V06_MULTICARNES.md`.
