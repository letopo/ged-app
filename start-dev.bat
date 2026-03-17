@echo off
REM ─────────────────────────────────────────────────────
REM GED Hôpital — Démarrage (Windows)
REM
REM Ce script :
REM   1. Lance le stack Docker (docker-compose.yml)
REM   2. Attend que le backend soit prêt
REM   3. Build le frontend si nécessaire
REM   4. Lance Electron
REM ─────────────────────────────────────────────────────

set ROOT=%~dp0

echo.
echo   GED Hopital - Demarrage
echo   ----------------------------------

REM 1) Démarrer Docker
echo   Demarrage des conteneurs Docker...
docker compose -f "%ROOT%docker-compose.yml" up -d

if %ERRORLEVEL% neq 0 (
  echo   ERREUR : Docker n'a pas pu demarrer. Verifiez que Docker Desktop est lance.
  pause
  exit /b 1
)

echo   Conteneurs demarres :
echo      Backend    : http://localhost:3000
echo      PostgreSQL : localhost:5432

REM 2) Attendre le backend
echo.
echo   Attente du backend...
set WAITED=0
:WAIT_LOOP
  curl -sf http://localhost:3000/api/health >nul 2>&1
  if %ERRORLEVEL% equ 0 goto BACKEND_READY
  timeout /t 1 /nobreak >nul
  set /a WAITED+=1
  if %WAITED% geq 60 goto BACKEND_TIMEOUT
goto WAIT_LOOP

:BACKEND_READY
echo   Backend pret !
goto BUILD_CHECK

:BACKEND_TIMEOUT
echo   Attention : backend non disponible apres 60s.

:BUILD_CHECK
REM 3) Builder le frontend si absent
if not exist "%ROOT%frontend\dist\index.html" (
  echo.
  echo   Build du frontend (premiere fois)...
  cd /d "%ROOT%frontend"
  npm install
  npm run build
  if %ERRORLEVEL% neq 0 (
    echo   ERREUR lors du build frontend.
    pause
    exit /b 1
  )
  echo   Frontend bati avec succes.
)

REM 4) Lancer Electron
echo.
echo   Lancement Electron...
echo   ----------------------------------
echo   Fermer la fenetre Electron pour quitter.
echo   Docker reste actif en arriere-plan.
echo   Pour arreter Docker : docker compose down
echo.

cd /d "%ROOT%electron-app"
npm start

pause
