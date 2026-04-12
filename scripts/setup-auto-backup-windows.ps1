# =============================================================================
# GED-APP - Configuration de la Sauvegarde Automatique (Windows)
# Configure le Planificateur de tâches Windows pour sauvegarder chaque nuit
# Doit être exécuté en tant qu'Administrateur
# Usage: .\scripts\setup-auto-backup-windows.ps1
# =============================================================================

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$BackupScript = Join-Path $ScriptDir "backup.ps1"
$TaskName   = "GED-APP Sauvegarde Automatique"
$LogFile    = Join-Path $ProjectDir "backups\backup.log"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  GED-APP — Configuration Sauvegarde Automatique Windows"   -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Vérifier les droits administrateur
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERREUR: Ce script doit etre execute en tant qu'Administrateur" -ForegroundColor Red
    Write-Host "Clic droit sur PowerShell > Executer en tant qu'administrateur" -ForegroundColor Yellow
    exit 1
}

# Créer le dossier backups si nécessaire
New-Item -ItemType Directory -Force -Path (Join-Path $ProjectDir "backups") | Out-Null

# Supprimer l'ancienne tâche si elle existe
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "  Suppression de l'ancienne tache planifiee..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Créer l'action : exécuter backup.ps1 et rediriger les logs
$Action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$BackupScript`" >> `"$LogFile`" 2>&1" `
    -WorkingDirectory $ProjectDir

# Déclencheur : tous les jours à 02h00
$Trigger = New-ScheduledTaskTrigger -Daily -At "02:00"

# Paramètres : s'exécuter même si personne n'est connecté
$Settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -RestartCount 1 `
    -RestartInterval (New-TimeSpan -Minutes 10) `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false

# Enregistrer la tâche (s'exécute en SYSTEM pour avoir accès à Docker)
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -RunLevel Highest `
    -User "SYSTEM" `
    -Force | Out-Null

Write-Host "  OK Tache planifiee creee avec succes !" -ForegroundColor Green
Write-Host ""
Write-Host "  Details:"
Write-Host "    Tache    : $TaskName"
Write-Host "    Heure    : Tous les jours a 02h00" -ForegroundColor Yellow
Write-Host "    Script   : $BackupScript"
Write-Host "    Logs     : $LogFile"
Write-Host "    Compte   : SYSTEM (acces Docker)"
Write-Host ""

# Tester en lançant la tâche immédiatement
$runNow = Read-Host "Voulez-vous lancer une sauvegarde de test maintenant? (O/N)"
if ($runNow -eq "O" -or $runNow -eq "o") {
    Write-Host ""
    Write-Host "  Lancement de la sauvegarde de test..." -ForegroundColor Cyan
    & $BackupScript
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Pour voir la tache dans le Planificateur:"
Write-Host "  taskschd.msc > Bibliotheque du Planificateur de taches"  -ForegroundColor Yellow
Write-Host ""
Write-Host "  Pour forcer une sauvegarde maintenant:"
Write-Host "  .\scripts\backup.ps1"                                     -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
