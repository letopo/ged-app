# scripts/deploy-remote.ps1
# Exécuté SUR le VM Windows par deploy-to-vm.sh (via SSH) — charge l'archive
# d'images Docker envoyée depuis le poste de dev et redémarre les services.
# Ne touche jamais au fichier .env local du VM.
param(
    [Parameter(Mandatory = $true)][string]$ArchiveName,
    [string]$AppPath = "C:\Users\adm_hsjm.HSJM\Documents\ged-app"
)

# Note : pas de $ErrorActionPreference = "Stop" ici — avec les commandes
# natives (docker, etc.), PowerShell transformerait le moindre message
# écrit sur stderr (même un simple avertissement Docker) en erreur
# bloquante. On vérifie explicitement $LASTEXITCODE après chaque commande.
Set-Location $AppPath

if (-not (Test-Path ".\.env")) {
    Write-Host ""
    Write-Host "ARRET : aucun fichier .env trouve dans $AppPath" -ForegroundColor Red
    Write-Host "Verifie le chemin -AppPath (doit pointer vers le vrai dossier de l'application en prod)." -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host "-> Chargement des images Docker ($ArchiveName)..."
docker load -i $ArchiveName
if ($LASTEXITCODE -ne 0) { Write-Error "Echec docker load"; exit 1 }

Write-Host "-> Redemarrage des services (docker-compose.prod.yml)..."
docker compose -f docker-compose.prod.yml up -d
if ($LASTEXITCODE -ne 0) { Write-Error "Echec docker compose up"; exit 1 }

Write-Host "-> Attente du demarrage de PostgreSQL/backend..."
Start-Sleep -Seconds 8

Write-Host "-> Verification des migrations..."
docker exec ged-backend npx sequelize-cli db:migrate --env production

Write-Host "-> Nettoyage..."
Remove-Item $ArchiveName -ErrorAction SilentlyContinue
docker image prune -f | Out-Null

Write-Host "Deploiement termine."
