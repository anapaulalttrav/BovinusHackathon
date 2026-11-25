@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo     BOVINUS - BALANCA INTELIGENTE 3D
 echo ================================================
echo.
echo Instalando/verificando bibliotecas do projeto...
python -m pip install -r requirements.txt
if errorlevel 1 (
  echo.
  echo A instalacao falhou. Abra esta pasta no VS Code e execute o comando manualmente.
  pause
  exit /b 1
)
echo.
echo Abra no navegador: http://127.0.0.1:8002/balanca-3d
echo Painel gerencial: http://127.0.0.1:8002/painel
echo Para encerrar, pressione CTRL + C.
echo.
python -m uvicorn app:app --host 127.0.0.1 --port 8002
pause
