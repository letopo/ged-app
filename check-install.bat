@echo off
echo Verification de l'environnement de developpement
echo ==================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ Node.js: INSTALLE
    node --version
) else (
    echo × Node.js: NON INSTALLE
)

where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ npm: INSTALLE
    npm --version
) else (
    echo × npm: NON INSTALLE
)

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ Python: INSTALLE
    python --version
) else (
    echo × Python: NON INSTALLE
)

where psql >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ PostgreSQL: INSTALLE
) else (
    echo × PostgreSQL: NON INSTALLE
)

where git >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ Git: INSTALLE
    git --version
) else (
    echo × Git: NON INSTALLE
)

where docker >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ Docker: INSTALLE
    docker --version
) else (
    echo ⚠ Docker: NON INSTALLE (optionnel)
)

echo.
echo ==================================================
pause
