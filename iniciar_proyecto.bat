@echo off
:: Asegurarnos de que el script se ejecute en la carpeta correcta (Soluciona el problema de cierre repentino y rutas)
cd /d "%~dp0"

title Panel de Control - Punto Clinico CRM
color 0B

:menu
cls
echo ===================================================
echo               PUNTO CLINICO CRM
echo                 Panel de Control
echo ===================================================
echo.
echo  1. Iniciar Todo (Docker n8n + Servidor Web)
echo  2. Apagar Todo (Docker n8n + Servidor Web)
echo  3. Reiniciar Contenedores Docker (Aplica .env)
echo  4. Salir
echo.
echo ===================================================
set /p opcion=" Elige una opcion (1-4): "

if "%opcion%"=="1" goto start_all
if "%opcion%"=="2" goto stop_all
if "%opcion%"=="3" goto restart_docker
if "%opcion%"=="4" goto exit_script

echo.
echo Opcion invalida. Intenta de nuevo.
timeout /t 2 >nul
goto menu

:start_all
cls
echo ===================================================
echo        INICIANDO ECOSISTEMA (DOCKER + VITE)
echo ===================================================
echo.

echo [1/3] Verificando e iniciando Docker Compose (n8n)...
:: Intenta arrancar docker, si no lo tiene instalado solo mostrara error y seguira
docker-compose up -d
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] Parece que Docker no esta corriendo o no esta instalado.
    echo El CRM funcionara, pero n8n no se levantara.
)

echo.
echo [2/3] Verificando dependencias del Frontend...
cd frontend-react
if not exist "node_modules\" (
    echo Instalando dependencias necesarias (esto toma un momento)...
    call npm install
)

echo.
echo [3/3] Levantando Servidor web (React/Vite)...
start "Servidor Vite" cmd /k "title Servidor_Vite_Punto_Clinico && npm run dev"

cd ..
echo.
echo Abriendo el navegador en 4 segundos...
timeout /t 4 /nobreak >nul
start http://localhost:5173

echo.
echo ¡Sistema en linea! Presiona cualquier tecla para volver al menu principal...
pause >nul
goto menu


:stop_all
cls
echo ===================================================
echo             APAGANDO ECOSISTEMA
echo ===================================================
echo.

echo [1/2] Apagando contenedores Docker (n8n)...
docker-compose down

echo.
echo [2/2] Cerrando el servidor Vite...
taskkill /FI "WINDOWTITLE eq Servidor_Vite_Punto_Clinico*" /T /F >nul 2>&1

FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr "0.0.0.0:5173" ') DO (
  taskkill /PID %%T /F >nul 2>&1
)
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr "127.0.0.1:5173" ') DO (
  taskkill /PID %%T /F >nul 2>&1
)

echo.
echo ¡Todo ha sido apagado exitosamente! 
echo Presiona cualquier tecla para volver al menu...
pause >nul
goto menu

:restart_docker
cls
echo ===================================================
echo            REINICIANDO DOCKER (n8n)
echo ===================================================
echo.
echo Apagando contenedores...
docker-compose down
echo.
echo Levantando contenedores nuevamente...
docker-compose up -d
echo.
echo ¡Contenedores reiniciados! Tus nuevas llaves del .env ya fueron leidas.
echo Presiona cualquier tecla para volver al menu...
pause >nul
goto menu

:exit_script
exit
