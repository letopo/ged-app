# scripts/deploy-remote-manual.ps1
# À exécuter DIRECTEMENT sur le VM Windows (PowerShell), depuis le dossier
# où le paquet ged-deploy-*.zip a été dézippé (contient ged-images.tar.gz,
# docker-compose.prod.yml, backend/database).
# Méthode "copie via RDP" — voir scripts/README-DEPLOY-WINDOWS.md, Méthode B.
# Ne touche jamais au fichier .env de l'application.
#
# IMPORTANT : $AppPath doit pointer vers le dossier RÉEL de l'application en
# prod (celui qui contient le vrai .env, nginx/ssl, etc.) — PAS un dossier
# vide créé pour l'occasion. Les conteneurs sont nommés en dur
# (ged-backend/ged-frontend/ged-postgres) dans docker-compose.prod.yml, donc
# lancer "docker compose up" depuis le mauvais dossier recrée quand même les
# VRAIS conteneurs de prod, mais avec les variables du mauvais (ou d'aucun)
# .env — d'où l'importance de bien renseigner ce chemin.
param(
    [string]$AppPath = "C:\Users\adm_hsjm.HSJM\Documents\ged-app"
)

# Note : on NE met PAS $ErrorActionPreference = "Stop" ici — avec les
# commandes natives (docker, etc.), PowerShell transforme alors le moindre
# message écrit sur stderr (même un simple avertissement Docker, sans rapport
# avec un échec réel) en erreur bloquante et arrête le script. On vérifie
# explicitement $LASTEXITCODE après chaque commande docker à la place.

if (-not (Test-Path ".\ged-images.tar.gz")) {
    Write-Host "ged-images.tar.gz introuvable dans le dossier courant. Lance ce script depuis le dossier où le paquet a été dézippé." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "$AppPath\.env")) {
    Write-Host ""
    Write-Host "ARRET : aucun fichier .env trouve dans $AppPath" -ForegroundColor Red
    Write-Host "Verifie que -AppPath pointe bien vers le vrai dossier de l'application en prod." -ForegroundColor Red
    Write-Host "Exemple : .\deploy-remote-manual.ps1 -AppPath 'C:\Users\adm_hsjm.HSJM\Documents\ged-app'" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host "-> Chargement des images Docker..."
docker load -i ".\ged-images.tar.gz"
if ($LASTEXITCODE -ne 0) { Write-Error "Echec docker load"; exit 1 }

Write-Host "-> Copie de docker-compose.prod.yml et des migrations vers $AppPath..."
New-Item -ItemType Directory -Force -Path "$AppPath\backend\database" | Out-Null
Copy-Item ".\docker-compose.prod.yml" "$AppPath\docker-compose.prod.yml" -Force
Copy-Item ".\backend\database\*" "$AppPath\backend\database\" -Recurse -Force

if (Test-Path ".\nginx\ssl\server.crt") {
    Write-Host "-> Copie des certificats nginx/ssl vers $AppPath..."
    New-Item -ItemType Directory -Force -Path "$AppPath\nginx\ssl" | Out-Null
    Copy-Item ".\nginx\ssl\server.crt" "$AppPath\nginx\ssl\server.crt" -Force
    Copy-Item ".\nginx\ssl\server.key" "$AppPath\nginx\ssl\server.key" -Force
}

Set-Location $AppPath

Write-Host "-> Redemarrage des services..."
docker compose -f docker-compose.prod.yml up -d
if ($LASTEXITCODE -ne 0) { Write-Error "Echec docker compose up"; exit 1 }

Write-Host "-> Attente du demarrage de PostgreSQL/backend..."
Start-Sleep -Seconds 8

Write-Host "-> Verification des migrations..."
docker exec ged-backend npx sequelize-cli db:migrate --env production

Write-Host "-> Nettoyage..."
docker image prune -f | Out-Null

Write-Host ""
Write-Host "Deploiement termine. Tu peux supprimer le dossier/zip temporaire."
