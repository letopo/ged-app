# =============================================================================
# GED-APP - Script de Restauration Complète (Windows / PowerShell)
# Usage: .\scripts\restore.ps1 <chemin_vers_sauvegarde.tar.gz>
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$ArchivePath
)

$ErrorActionPreference = "Stop"

# ─── Configuration ───────────────────────────────────────────────────────────
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$BackupDir  = Join-Path $ProjectDir "backups"
$RestoreTmp = Join-Path $env:TEMP "ged-restore-$(Get-Random)"

# Charger les variables du fichier .env
$EnvFile = Join-Path $ProjectDir ".env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | Where-Object { $_ -notmatch '^\s*#' -and $_ -match '=' } | ForEach-Object {
        $parts = $_ -split '=', 2
        $key   = $parts[0].Trim()
        $value = $parts[1].Trim().TrimEnd("`r")
        [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

$DB_NAME      = if ($env:DB_NAME)      { $env:DB_NAME }      else { "ged_db" }
$DB_USER      = if ($env:DB_USER)      { $env:DB_USER }      else { "ged_user" }
$DB_PASSWORD  = if ($env:DB_PASSWORD)  { $env:DB_PASSWORD }  else { "D@minguez123" }
$CONTAINER_PG = if ($env:CONTAINER_PG) { $env:CONTAINER_PG } else { "ged-postgres" }

# ─── Fonctions ───────────────────────────────────────────────────────────────
function Log  { param($msg) Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Cyan }
function Ok   { param($msg) Write-Host "[$(Get-Date -Format 'HH:mm:ss')] OK  $msg" -ForegroundColor Green }
function Warn { param($msg) Write-Host "[$(Get-Date -Format 'HH:mm:ss')] !!  $msg" -ForegroundColor Yellow }
function Err  { param($msg) Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ERR $msg" -ForegroundColor Red; exit 1 }

# ─── Sélection de l'archive ──────────────────────────────────────────────────
if (-not $ArchivePath) {
    Write-Host ""
    Write-Host "Usage: .\scripts\restore.ps1 <chemin_vers_sauvegarde.tar.gz>" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Sauvegardes disponibles:" -ForegroundColor Cyan
    $available = Get-ChildItem -Path $BackupDir -Filter "ged-backup_*.tar.gz" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending
    if ($available) {
        $available | ForEach-Object {
            $size = [Math]::Round($_.Length / 1MB, 1)
            Write-Host "  $($_.Name)  ($size MB)  $($_.LastWriteTime.ToString('dd/MM/yyyy HH:mm'))"
        }
    } else {
        Write-Host "  Aucune sauvegarde trouvée dans $BackupDir"
    }
    Write-Host ""
    exit 0
}

if (-not (Test-Path $ArchivePath)) {
    Err "Fichier de sauvegarde introuvable: $ArchivePath"
}

# ─── Entête ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "       GED-APP — Restauration Complète (Windows)"           -ForegroundColor Cyan
Write-Host "       Fichier: $(Split-Path -Leaf $ArchivePath)"           -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ─── Confirmation ────────────────────────────────────────────────────────────
Write-Host "ATTENTION: Cette operation va REMPLACER toutes les donnees actuelles!" -ForegroundColor Red
Write-Host "  - Base de donnees: $DB_NAME"
Write-Host "  - Tous les fichiers uploads et signatures"
Write-Host ""
$confirm = Read-Host "Etes-vous sur de vouloir continuer? (tapez OUI pour confirmer)"

if ($confirm -ne "OUI") {
    Write-Host "Restauration annulee." -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# ─── Extraction de l'archive ─────────────────────────────────────────────────
Log "Extraction de l'archive..."
New-Item -ItemType Directory -Force -Path $RestoreTmp | Out-Null

try {
    # Essayer tar natif Windows (Win10/Server2019+)
    Push-Location $RestoreTmp
    tar -xzf $ArchivePath 2>$null
    Pop-Location
} catch {
    # Fallback via Docker
    $ArchiveDir  = Split-Path -Parent $ArchivePath
    $ArchiveName = Split-Path -Leaf $ArchivePath
    docker run --rm `
        -v "${ArchiveDir}:/archive" `
        -v "${RestoreTmp}:/restore" `
        alpine tar xzf "/archive/$ArchiveName" -C /restore
}

$RestoreDir = Get-ChildItem -Path $RestoreTmp -Directory -Filter "ged-backup_*" | Select-Object -First 1 -ExpandProperty FullName

if (-not $RestoreDir) {
    Remove-Item -Recurse -Force $RestoreTmp
    Err "Archive invalide - structure non reconnue"
}

# Lire le manifest
$ManifestFile = Join-Path $RestoreDir "manifest.json"
if (Test-Path $ManifestFile) {
    $manifest = Get-Content $ManifestFile | ConvertFrom-Json
    Log "Sauvegarde du: $($manifest.date)"
}

Ok "Archive extraite dans $RestoreDir"

# ─── Vérification des containers ─────────────────────────────────────────────
Log "Vérification des containers Docker..."

$pgRunning = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $CONTAINER_PG }
if (-not $pgRunning) {
    Warn "Container PostgreSQL non démarré. Démarrage..."
    Push-Location $ProjectDir
    docker compose up -d postgres
    Pop-Location
    Start-Sleep -Seconds 8
}

Ok "Container PostgreSQL disponible"

# ─── 1. Arrêt des services ───────────────────────────────────────────────────
Log "Arrêt du backend et frontend pour la restauration..."
docker stop ged-backend  2>$null
docker stop ged-frontend 2>$null

# ─── 2. Restauration PostgreSQL ──────────────────────────────────────────────
Log "Restauration de la base de données PostgreSQL..."

$DumpFile = Join-Path $RestoreDir "database.sql.gz"
if (-not (Test-Path $DumpFile)) {
    Remove-Item -Recurse -Force $RestoreTmp
    Err "Fichier database.sql.gz non trouvé dans l'archive"
}

# Supprimer et recréer la base de données
Log "Réinitialisation de la base de données..."
docker run --rm `
    --network "ged-app_ged-network" `
    -e "PGPASSWORD=$DB_PASSWORD" `
    postgres:17.5-alpine `
    psql -h $CONTAINER_PG -p 5432 -U $DB_USER -d postgres `
    -c "DROP DATABASE IF EXISTS $DB_NAME WITH (FORCE);"

docker run --rm `
    --network "ged-app_ged-network" `
    -e "PGPASSWORD=$DB_PASSWORD" `
    postgres:17.5-alpine `
    psql -h $CONTAINER_PG -p 5432 -U $DB_USER -d postgres `
    -c "CREATE DATABASE $DB_NAME;"

# Décompresser et restaurer
Log "Chargement des données dans la base..."
$RestoreDirDocker = $RestoreDir -replace '\\', '/'
docker run --rm `
    --network "ged-app_ged-network" `
    -e "PGPASSWORD=$DB_PASSWORD" `
    -v "${RestoreDir}:/restore" `
    postgres:17.5-alpine `
    sh -c "zcat /restore/database.sql.gz | psql -h $CONTAINER_PG -p 5432 -U $DB_USER -d $DB_NAME -q"

Ok "Base de données restaurée"

# ─── 3. Restauration des uploads ─────────────────────────────────────────────
Log "Restauration des fichiers uploadés..."

$UploadsFile = Join-Path $RestoreDir "uploads.tar.gz"
if ((Test-Path $UploadsFile) -and (Get-Item $UploadsFile).Length -gt 100) {
    docker run --rm `
        -v "ged-app_uploads_data:/data" `
        -v "${RestoreDir}:/restore" `
        alpine sh -c "rm -rf /data/* && tar xzf /restore/uploads.tar.gz -C /data 2>/dev/null || true"
    Ok "Uploads restaurés"
} else {
    Warn "Archive uploads vide ou manquante - ignorée"
}

# ─── 4. Restauration des signatures ──────────────────────────────────────────
Log "Restauration des signatures..."

$SignaturesFile = Join-Path $RestoreDir "signatures.tar.gz"
if ((Test-Path $SignaturesFile) -and (Get-Item $SignaturesFile).Length -gt 100) {
    docker run --rm `
        -v "ged-app_signatures_data:/data" `
        -v "${RestoreDir}:/restore" `
        alpine sh -c "rm -rf /data/* && tar xzf /restore/signatures.tar.gz -C /data 2>/dev/null || true"
    Ok "Signatures restaurées"
} else {
    Warn "Archive signatures vide ou manquante - ignorée"
}

# ─── 5. Redémarrage des services ─────────────────────────────────────────────
Log "Redémarrage de tous les services..."
Push-Location $ProjectDir
docker compose up -d
Pop-Location
Start-Sleep -Seconds 5

Ok "Services redémarrés"

# ─── Nettoyage ───────────────────────────────────────────────────────────────
Remove-Item -Recurse -Force $RestoreTmp

# ─── Résumé ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  OK RESTAURATION TERMINEE AVEC SUCCES"                     -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Base de donnees : restauree"
Write-Host "  Fichiers uploads : restaures"
Write-Host "  Signatures       : restaurees"
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Afficher l'IP du serveur
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' } | Select-Object -First 1).IPAddress
Write-Host "  Application accessible sur: https://$ip" -ForegroundColor Cyan
Write-Host ""
