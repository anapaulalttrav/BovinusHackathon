# Bovinus — Balança Inteligente 3D | Redesenho de bancada

**Esta versão substitui o modelo com braço externo por uma balança de bancada com coluna única, visor grande, câmera embutida no topo da moldura e prato visível na plataforma.**


Projeto **independente**, com modelo tridimensional WebGL criado para o Hackathon da **Bovinu's Augusta**. A referência visual informada foi [Digital kitchen scale, de Jvpdmelo, no Sketchfab](https://sketchfab.com/3d-models/digital-kitchen-scale-f87c7db4de5f48c8a682d921478b7448). O aplicativo **não redistribui nem altera o arquivo daquele autor**; a geometria do protótipo foi criada em código, inspirada no formato de uma balança compacta, com **visor maior e câmera pequena embutida na moldura superior**, com eixo óptico orientado para o prato. Não há braço lateral externo.

## Rodar no VS Code (Windows / PowerShell)

1. Extraia o ZIP e **abra a pasta criada pela extração**, onde devem aparecer diretamente `app.py` e `requirements.txt`. Este ZIP não tem uma pasta adicional dentro dele.
2. Em **Terminal > New Terminal**, execute os comandos um de cada vez:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn app:app --port 8002
```

3. Deixe o terminal aberto enquanto usa o aplicativo.

- Menu: http://127.0.0.1:8002/
- Balança 3D com câmera: http://127.0.0.1:8002/balanca-3d
- Painel de gastos: http://127.0.0.1:8002/painel
- Status da API: http://127.0.0.1:8002/api/health

**Porta 8002:** foi escolhida para não conflitar com o Bovinus principal (`8000`) e o Tablet 3D (`8001`).

## Como testar as funções

1. **3D:** abra a balança e clique `Vista 3/4`, `Frente`, `De cima`, `Traseira`, `Giro automático`; arraste para girar e use scroll para aproximar. O visor é uma textura viva no objeto tridimensional e os botões são clicáveis dentro da tela.
2. **Câmera REAL:** clique `Ligar câmera` e autorize o navegador. Em `localhost` isso funciona sem HTTPS. A câmera do desenho 3D está integrada à moldura do visor e representada apontando para o prato. A captura REAL vem da câmera física selecionada pelo navegador: posicione essa câmera física de frente para a comida (preferencialmente de cima), confira o enquadramento na prévia ao vivo e também no visor 3D. Clique `Fotografar prato`. Alternativa: `Escolher foto` para usar foto existente (nesse caso não é captura ao vivo).
3. **Reconhecimento IA REAL:** configure `OPENAI_API_KEY` no terminal antes de iniciar o servidor:

```powershell
$env:OPENAI_API_KEY="SUA_CHAVE_AQUI"
python -m uvicorn app:app --port 8002
```

Não salve chaves em arquivos do projeto, não envie chaves ao GitHub e não mostre a chave no pitch. Com a chave válida e créditos de API, clique `Analisar com IA`. **A chamada é real e pode ter custo de API.** Sem chave, a câmera ainda funciona; a análise visual por IA não é simulada como se fosse real.
4. **Peso total:** digite manualmente os gramas apresentados pela balança real. Não temos integração de sensor físico. Edite o preço/kg e custos por categoria. A balança calcula `receita = peso em kg × preço/kg` e `CMV estimado = custo alimentar estimado / receita × 100`.
5. **Demonstrar sem IA:** selecione um dos três cenários (`Prato equilibrado`, `Muita carne`, `Mais saladas`) e clique `Carregar demonstração`. Eles são marcados como **demo** e não como reconhecimento real.
6. **Conferir e corrigir:** no visor, clique a aba `COMPOSIÇÃO` e ajuste os percentuais, ou use os campos na lateral. Por fotografia, são estimativas **visuais**, não gramas exatos.
7. **Registrar e acompanhar:** clique `Salvar pesagem estimada` e abra `/painel`; veja ranking por custo, volumes aproximados e métricas. Exporte CSV; pode limpar apenas os registros demo.

## Escopo respeitado

- Não modifica cozinha, compras, estoque, sistema de pagamentos ou o modelo do restaurante.
- A câmera fica **no navegador**; não se captura automaticamente. A foto **só é transmitida ao serviço de IA** após clicar `Analisar com IA`, por meio do servidor. A aplicação não a salva no banco.
- **Não identifica pessoas** nem as associa a dados de consumo. Evite enquadrar funcionários/clientes.
- Os custos de insumos **são ilustrativos** e devem ser substituídos por valores fornecidos pela Bovinu's. `R$ 119/kg` é o valor informado na reunião para o serviço por quilo, não uma confirmação de preço atual.
- A imagem não determina o peso de cada categoria com precisão: o cálculo de CMV **reparte hipoteticamente** o peso total conforme a composição visual, com correção humana. Não comprova lucro/prejuízo por cliente.
- O painel usa SQLite **local**, sem autenticação: apropriado para protótipo no computador, **não para disponibilização pública**. Para publicar, proteger acesso, usar persistência e formalizar consentimento e retenção conforme LGPD.
- Com WebGL disponível, o visor é renderizado numa malha 3D. Sem WebGL, entra automaticamente uma alternativa 3D em CSS, também manipulável e com botões dentro da tela.

## Arquivos

`app.py` (API e SQLite); `balanca3d.js` (3D, interface e webcam); `balanca.html` (tela da balança); `painel.html` (dashboard); `index.html` (início); `teste_balanca.py` (testes); `requirements.txt` (dependências).

## Próximas melhorias reais após o Hackathon

Integração com dispositivo de pesagem certificado, calibração de porções em gramas com verdade-terreno, custos reais, validação por produto/ingrediente, critérios LGPD e controle de acesso para implantação.
