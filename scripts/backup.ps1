# =============================================================================
# GED-APP - Script de Sauvegarde Complète (Windows / PowerShell)
# Sauvegarde : Base de données PostgreSQL + Fichiers (uploads + signatures)
# Usage: .\scripts\backup.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

# ─── Configuration ──────────────────────────────────────────────────────────
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir  = Split-Path -Parent $ScriptDir
$BackupDir   = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $ProjectDir "backups" }
$Date        = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupName  = "ged-backup_$Date"
$BackupPath  = Join-Path $BackupDir $BackupName
$RetentionDays = if ($env:RETENTION_DAYS) { [int]$env:RETENTION_DAYS } else { 30 }

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

$DB_NAME       = if ($env:DB_NAME)       { $env:DB_NAME }       else { "ged_db" }
$DB_USER       = if ($env:DB_USER)       { $env:DB_USER }       else { "ged_user" }
$DB_PASSWORD   = if ($env:DB_PASSWORD)   { $env:DB_PASSWORD }   else { "D@minguez123" }
$CONTAINER_PG  = if ($env:CONTAINER_PG)  { $env:CONTAINER_PG }  else { "ged-postgres" }

# ─── Fonctions utilitaires ───────────────────────────────────────────────────
function Log    { param($msg) Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Cyan }
function Ok     { param($msg) Write-Host "[$(Get-Date -Format 'HH:mm:ss')] OK  $msg" -ForegroundColor Green }
function Warn   { param($msg) Write-Host "[$(Get-Date -Format 'HH:mm:ss')] !!  $msg" -ForegroundColor Yellow }
function Err    { param($msg) Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ERR $msg" -ForegroundColor Red; exit 1 }

# ─── Entête ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "       GED-APP — Sauvegarde Complète (Windows)"             -ForegroundColor Cyan
Write-Host "       Date: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')"     -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ─── Vérifications préalables ────────────────────────────────────────────────
Log "Vérification des prérequis..."

# Vérifier Docker
try { docker version | Out-Null } catch { Err "Docker n'est pas accessible. Vérifiez que Docker Desktop est démarré." }

# Vérifier que le container PostgreSQL tourne
$running = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $CONTAINER_PG }
if (-not $running) {
    Err "Container '$CONTAINER_PG' n'est pas en cours d'exécution.`nDémarrez l'application avec: docker compose up -d"
}

# Créer le dossier de sauvegarde
New-Item -ItemType Directory -Force -Path $BackupPath | Out-Null
Ok "Prérequis OK"

# ─── 1. Sauvegarde PostgreSQL ────────────────────────────────────────────────
Log "Sauvegarde de la base de données PostgreSQL..."

$DumpFile = Join-Path $BackupPath "database.sql.gz"

# Utiliser un container postgres sur le réseau Docker pour le dump
docker run --rm `
    --network "ged-app_ged-network" `
    -e "PGPASSWORD=$DB_PASSWORD" `
    postgres:17.5-alpine `
    pg_dump -h $CONTAINER_PG -p 5432 -U $DB_USER -d $DB_NAME --no-owner --no-acl `
    | & { $input | gzip } > $DumpFile 2>$null

if (-not (Test-Path $DumpFile) -or (Get-Item $DumpFile).Length -lt 1000) {
    # Fallback: sauvegarder sans compression gzip native si indisponible
    $DumpFileRaw = Join-Path $BackupPath "database.sql"
    docker run --rm `
        --network "ged-app_ged-network" `
        -e "PGPASSWORD=$DB_PASSWORD" `
        postgres:17.5-alpine `
        pg_dump -h $CONTAINER_PG -p 5432 -U $DB_USER -d $DB_NAME --no-owner --no-acl `
        | Out-File -FilePath $DumpFileRaw -Encoding utf8

    # Compresser avec Docker alpine
    $BackupPathDocker = $BackupPath -replace '\\', '/'
    docker run --rm `
        -v "${BackupPath}:/backup" `
        alpine sh -c "gzip /backup/database.sql"

    $DumpFile = Join-Path $BackupPath "database.sql.gz"
}

$DbSize = [Math]::Round((Get-Item $DumpFile).Length / 1KB, 0)
Ok "Base de données sauvegardée → database.sql.gz (${DbSize}K)"

# ─── 2. Sauvegarde des fichiers uploadés ─────────────────────────────────────
Log "Sauvegarde des fichiers uploadés (uploads)..."

$UploadsFile = Join-Path $BackupPath "uploads.tar.gz"

# Vérifier si le container backend tourne
$backendRunning = docker ps --format "{{.Names}}" | Where-Object { $_ -eq "ged-backend" }

if ($backendRunning) {
    # Copier depuis le container backend
    $tmpTar = Join-Path $BackupPath "uploads_tmp.tar.gz"
    docker exec ged-backend sh -c "cd /app && tar czf - uploads/ 2>/dev/null" | Set-Content -Path $UploadsFile -AsByteStream
} else {
    # Copier directement depuis le volume Docker
    docker run --rm `
        -v "ged-app_uploads_data:/data" `
        -v "${BackupPath}:/backup" `
        alpine tar czf /backup/uploads.tar.gz -C /data . 2>$null
}

if (Test-Path $UploadsFile) {
    $UpSize = [Math]::Round((Get-Item $UploadsFile).Length / 1MB, 1)
    Ok "Uploads sauvegardés → uploads.tar.gz (${UpSize}MB)"
} else {
    Warn "Dossier uploads vide ou inaccessible"
    docker run --rm -v "${BackupPath}:/backup" alpine sh -c "echo '' | gzip > /backup/uploads.tar.gz"
}

# ─── 3. Sauvegarde des signatures ────────────────────────────────────────────
Log "Sauvegarde des signatures..."

$SignaturesFile = Join-Path $BackupPath "signatures.tar.gz"

if ($backendRunning) {
    docker exec ged-backend sh -c "cd /app && tar czf - signatures/ 2>/dev/null" | Set-Content -Path $SignaturesFile -AsByteStream
} else {
    docker run --rm `
        -v "ged-app_signatures_data:/data" `
        -v "${BackupPath}:/backup" `
        alpine tar czf /backup/signatures.tar.gz -C /data . 2>$null
}

if (Test-Path $SignaturesFile) {
    $SigSize = [Math]::Round((Get-Item $SignaturesFile).Length / 1KB, 0)
    Ok "Signatures sauvegardées → signatures.tar.gz (${SigSize}K)"
} else {
    Warn "Dossier signatures vide"
    docker run --rm -v "${BackupPath}:/backup" alpine sh -c "echo '' | gzip > /backup/signatures.tar.gz"
}

# ─── 4. Fichier de métadonnées ───────────────────────────────────────────────
Log "Génération des métadonnées..."

$DbStats = '{"note":"stats unavailable"}'
try {
    $statsResult = docker run --rm `
        --network "ged-app_ged-network" `
        -e "PGPASSWORD=$DB_PASSWORD" `
        postgres:17.5-alpine `
        psql -h $CONTAINER_PG -p 5432 -U $DB_USER -d $DB_NAME -t -c `
        "SELECT json_build_object('documents',(SELECT COUNT(*) FROM documents),'users',(SELECT COUNT(*) FROM users),'patients_php',(SELECT COUNT(*) FROM php_patients),'consultations_php',(SELECT COUNT(*) FROM php_consultations))" 2>$null
    if ($statsResult) { $DbStats = $statsResult.Trim() }
} catch {}

$Manifest = @{
    version     = "1.0"
    app         = "GED-APP"
    date        = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    backup_name = $BackupName
    db_name     = $DB_NAME
    os          = "Windows"
    files       = @{
        database   = "database.sql.gz"
        uploads    = "uploads.tar.gz"
        signatures = "signatures.tar.gz"
    }
    stats = $DbStats
}

$Manifest | ConvertTo-Json | Out-File -FilePath (Join-Path $BackupPath "manifest.json") -Encoding utf8
Ok "Manifest créé → manifest.json"

# ─── 5. Archive finale ───────────────────────────────────────────────────────
Log "Création de l'archive finale..."

$FinalArchive = Join-Path $BackupDir "${BackupName}.tar.gz"

# Utiliser tar (disponible sur Windows 10/Server 2019+) ou Docker
try {
    Push-Location $BackupDir
    tar -czf "${BackupName}.tar.gz" $BackupName 2>$null
    Pop-Location
} catch {
    # Fallback via Docker si tar non disponible
    $BackupDirDocker = $BackupDir -replace '\\', '/' -replace 'C:', '/c'
    docker run --rm `
        -v "${BackupDir}:/backup" `
        alpine tar czf "/backup/${BackupName}.tar.gz" -C /backup $BackupName
}

Remove-Item -Recurse -Force $BackupPath

$FinalSize = [Math]::Round((Get-Item $FinalArchive).Length / 1MB, 1)
Ok "Archive finale créée: ${BackupName}.tar.gz (${FinalSize}MB)"

# ─── 6. Nettoyage des anciennes sauvegardes ──────────────────────────────────
if ($RetentionDays -gt 0) {
    Log "Nettoyage des sauvegardes de plus de $RetentionDays jours..."
    $OldDate = (Get-Date).AddDays(-$RetentionDays)
    $deleted = Get-ChildItem -Path $BackupDir -Filter "ged-backup_*.tar.gz" |
        Where-Object { $_.LastWriteTime -lt $OldDate } |
        ForEach-Object { Remove-Item $_.FullName; $_ }
    if ($deleted) {
        Warn "$($deleted.Count) ancienne(s) sauvegarde(s) supprimée(s)"
    } else {
        Log "Aucune ancienne sauvegarde à supprimer"
    }
}

# ─── Résumé ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  OK SAUVEGARDE TERMINEE AVEC SUCCES"                        -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Fichier : ${BackupName}.tar.gz"                            -ForegroundColor Yellow
Write-Host "  Chemin  : $BackupDir"                                      -ForegroundColor Yellow
Write-Host "  Taille  : ${FinalSize}MB"                                  -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Pour restaurer:"
Write-Host "  .\scripts\restore.ps1 '$FinalArchive'"                    -ForegroundColor Cyan
Write-Host ""
