# scripts/backup-prod-for-migration.ps1
# À exécuter SUR LE VM WINDOWS (PowerShell), dans le dossier de l'application
# (ex: C:\Users\adm_hsjm.HSJM\Documents\ged-app), pour préparer une migration
# complète (base de données + fichiers uploadés/signatures) vers un autre serveur.
#
# Produit un fichier .zip unique, prêt à transférer via RDP.

$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$outDir = ".\backup-migration-$stamp"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Host "-> Detection des volumes Docker..."
$volumes = docker volume ls --format "{{.Name}}"
$uploadsVol = $volumes | Where-Object { $_ -like "*uploads_data" } | Select-Object -First 1
$signaturesVol = $volumes | Where-Object { $_ -like "*signatures_data" } | Select-Object -First 1

if (-not $uploadsVol -or -not $signaturesVol) {
    Write-Host "ATTENTION : volume(s) introuvable(s). Volumes trouves :" -ForegroundColor Yellow
    $volumes | ForEach-Object { Write-Host "  - $_" }
    if (-not $uploadsVol) { $uploadsVol = Read-Host "Nom exact du volume uploads_data" }
    if (-not $signaturesVol) { $signaturesVol = Read-Host "Nom exact du volume signatures_data" }
}
Write-Host "   uploads    : $uploadsVol"
Write-Host "   signatures : $signaturesVol"

Write-Host "-> Sauvegarde de la base de donnees (pg_dump)..."
docker exec ged-postgres pg_dump -U ged_user -d ged_db --clean --if-exists > "$outDir\ged_db.sql"
if ($LASTEXITCODE -ne 0) { Write-Error "Echec pg_dump"; exit 1 }

# On réutilise une image déjà présente localement (postgres:17.5-alpine,
# basée sur Alpine donc "tar" disponible) au lieu d'en télécharger une
# nouvelle — certains réseaux ont un accès limité à Docker Hub.
$tarImage = "postgres:17.5-alpine"

Write-Host "-> Sauvegarde des fichiers uploades..."
docker run --rm -v "${uploadsVol}:/data" -v "${PWD}\${outDir}:/backup" $tarImage tar czf /backup/uploads.tar.gz -C /data .
if ($LASTEXITCODE -ne 0) { Write-Error "Echec sauvegarde uploads"; exit 1 }

Write-Host "-> Sauvegarde des signatures..."
docker run --rm -v "${signaturesVol}:/data" -v "${PWD}\${outDir}:/backup" $tarImage tar czf /backup/signatures.tar.gz -C /data .
if ($LASTEXITCODE -ne 0) { Write-Error "Echec sauvegarde signatures"; exit 1 }

Write-Host ""
Write-Host "Termine. Fichiers prets dans : $outDir" -ForegroundColor Green
Get-ChildItem $outDir | ForEach-Object {
    $mb = [math]::Round($_.Length / 1MB, 1)
    Write-Host "   - $($_.Name) ($mb Mo)"
}
Write-Host ""
Write-Host "Transfere ce DOSSIER (les 3 fichiers) vers le Mac via RDP (dossier partage recommande vu la taille)."
Write-Host "Ne supprime rien ici tant que le transfert n'est pas confirme cote Mac."
