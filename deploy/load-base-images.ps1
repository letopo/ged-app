<#
  load-base-images.ps1
  ----------------------------------------------------------------------------
  À lancer sur le SERVEUR de production Windows (Docker Desktop / Docker Engine
  installé). Charge dans Docker les images de base exportées par
  prepare-base-images.sh.

  Après ce chargement, « docker compose build » fonctionne sans accéder au
  Docker Hub (bloqué sur le réseau), car les images FROM sont déjà en cache.

  Usage (PowerShell, dans le dossier contenant l'archive) :
    powershell -ExecutionPolicy Bypass -File load-base-images.ps1
    powershell -ExecutionPolicy Bypass -File load-base-images.ps1 -Archive "mon-archive.tar.gz"
  ----------------------------------------------------------------------------
#>
param(
  [string]$Archive = "base-images.tar.gz"
)

$ErrorActionPreference = "Stop"

# 1) Vérifier que Docker répond
try {
  docker version | Out-Null
} catch {
  Write-Host "[ERREUR] Docker n'est pas accessible. Démarrez Docker Desktop puis réessayez." -ForegroundColor Red
  exit 1
}

# 2) Vérifier la présence de l'archive
if (-not (Test-Path $Archive)) {
  Write-Host "[ERREUR] Archive introuvable : $Archive" -ForegroundColor Red
  Write-Host "         Placez le fichier dans ce dossier ou passez -Archive <chemin>." -ForegroundColor Yellow
  exit 1
}

# 3) Charger les images (docker load décompresse le gzip automatiquement)
Write-Host "==> Chargement des images depuis $Archive ..." -ForegroundColor Cyan
docker load -i $Archive

# 4) Vérifier que les images attendues sont bien présentes
Write-Host "`n==> Images de base presentes dans Docker :" -ForegroundColor Cyan
$expected = @("node:20-alpine", "nginx:alpine", "postgres:17.5-alpine", "onlyoffice/documentserver")
$present  = docker images --format "{{.Repository}}:{{.Tag}}"
foreach ($e in $expected) {
  $hit = $present | Select-String -SimpleMatch ($e -replace ":latest$", "")
  if ($hit) {
    Write-Host ("    [OK]      " + $e) -ForegroundColor Green
  } else {
    Write-Host ("    [MANQUE]  " + $e) -ForegroundColor Red
  }
}

Write-Host "`n==> Termine. Vous pouvez maintenant construire et demarrer l'application :" -ForegroundColor Green
Write-Host "    docker compose build"
Write-Host "    docker compose up -d postgres backend frontend onlyoffice"
Write-Host "    docker compose exec backend npx sequelize-cli db:migrate   # si nouveau schema"
