# =============================================================================
# GED-APP - Vérification de l'état des sauvegardes (Windows / PowerShell)
# Usage: .\scripts\backup-verify.ps1
# =============================================================================

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$BackupDir  = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $ProjectDir "backups" }

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "       GED-APP — Etat des Sauvegardes (Windows)"           -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $BackupDir)) {
    Write-Host "  Aucune sauvegarde trouvee (dossier manquant)" -ForegroundColor Red
    Write-Host "  Lancez: .\scripts\backup.ps1" -ForegroundColor Yellow
    exit 1
}

$backups = Get-ChildItem -Path $BackupDir -Filter "ged-backup_*.tar.gz" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending

if (-not $backups) {
    Write-Host "  Aucune sauvegarde disponible" -ForegroundColor Red
    Write-Host "  Lancez: .\scripts\backup.ps1" -ForegroundColor Yellow
    exit 1
}

$count = $backups.Count
Write-Host "  $count sauvegarde(s) disponible(s)" -ForegroundColor Green
Write-Host ""

# Dernière sauvegarde
$last     = $backups | Select-Object -First 1
$lastSize = [Math]::Round($last.Length / 1MB, 1)
$lastDate = $last.LastWriteTime.ToString("dd/MM/yyyy HH:mm")

Write-Host "  Derniere sauvegarde:" -ForegroundColor Cyan
Write-Host "     Fichier : $($last.Name)"
Write-Host "     Date    : $lastDate" -ForegroundColor Yellow
Write-Host "     Taille  : ${lastSize} MB"

# Vérifier l'âge
$ageHours = [Math]::Floor(((Get-Date) - $last.LastWriteTime).TotalHours)
$ageDays  = [Math]::Floor($ageHours / 24)

Write-Host ""
if ($ageHours -lt 25) {
    Write-Host "  OK Sauvegarde recente (il y a ${ageHours}h)" -ForegroundColor Green
} elseif ($ageDays -lt 3) {
    Write-Host "  !! Sauvegarde ancienne (il y a ${ageDays} jour(s))" -ForegroundColor Yellow
} else {
    Write-Host "  ATTENTION: Derniere sauvegarde il y a ${ageDays} jours !" -ForegroundColor Red
    Write-Host "     Lancez une sauvegarde maintenant: .\scripts\backup.ps1" -ForegroundColor Yellow
}

# Vérifier l'intégrité
Write-Host ""
Write-Host "  Verification de l'integrite..." -ForegroundColor Cyan
try {
    $testResult = & tar -tzf $last.FullName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK Archive integre" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Contenu:" -ForegroundColor Cyan
        $testResult | Where-Object { $_ -match "\.(gz|json)$" } | ForEach-Object {
            Write-Host "     - $_"
        }
    } else {
        Write-Host "  ERREUR Archive corrompue !" -ForegroundColor Red
    }
} catch {
    Write-Host "  !! Impossible de verifier (tar non disponible)" -ForegroundColor Yellow
    Write-Host "     Installez tar ou utilisez Windows 10/Server 2019+"
}

# Toutes les sauvegardes
if ($count -gt 1) {
    Write-Host ""
    Write-Host "  Toutes les sauvegardes:" -ForegroundColor Cyan
    $backups | ForEach-Object {
        $s = [Math]::Round($_.Length / 1MB, 1)
        $d = $_.LastWriteTime.ToString("dd/MM/yyyy HH:mm")
        Write-Host "     $($_.Name)  (${s}MB)  $d"
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Commandes:" -ForegroundColor Cyan
Write-Host "    Sauvegarder : .\scripts\backup.ps1" -ForegroundColor Yellow
Write-Host "    Restaurer   : .\scripts\restore.ps1 <fichier.tar.gz>" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
