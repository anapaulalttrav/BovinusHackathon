# Câmera integrada — Bovinus Balança Inteligente 3D

A versão redesenhada não possui braço lateral ou câmera solta. A câmera está **embutida no topo do visor**, e o sensor é representado olhando em direção ao prato sobre a plataforma.

- Objeto manipulável e visor interativo: `http://127.0.0.1:8002/balanca-3d`
- O dispositivo 3D representa o conceito mecânico. Para captar uma imagem verdadeira, a aplicação usa a webcam do computador ou celular com autorização do navegador; girar o 3D não movimenta a câmera física.
- O peso do prato é informado manualmente; a IA visual depende de `OPENAI_API_KEY`.
- As estimativas de composição e CMV precisam de validação com pesos individuais e custos reais.

Instalação na pasta que contém `app.py`:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn app:app --port 8002
```
