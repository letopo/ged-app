# Guide de Sauvegarde GED-APP sur Windows

## Pourquoi mes documents ne s'affichent plus après restauration ?

L'application stocke deux choses séparément :

| Ce qui est stocké | Où |
|---|---|
| Métadonnées (nom du fichier, chemin, info patient) | Base de données PostgreSQL |
| **Fichiers réels** (PDFs, signatures images) | Volumes Docker (dossiers sur le disque) |

Une **sauvegarde de la base de données seule** ne suffit pas.
Il faut sauvegarder **DB + fichiers** ensemble.

---

## Structure d'une sauvegarde complète

```
ged-backup_20260326_020000.tar.gz
├── database.sql.gz      ← Base de données complète
├── uploads.tar.gz       ← Tous les PDFs et documents
├── signatures.tar.gz    ← Toutes les signatures
└── manifest.json        ← Métadonnées (date, taille, stats)
```

---

## Utilisation sur Windows

### Prérequis
- Windows 10 / Windows Server 2019 ou plus récent
- Docker Desktop installé et démarré
- PowerShell 5.1+ (inclus dans Windows)

### Autoriser l'exécution des scripts (une seule fois)

Ouvrir PowerShell **en tant qu'Administrateur** et exécuter :
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine
```

---

## Commandes principales

### Sauvegarder maintenant
```powershell
cd C:\chemin\vers\ged-app
.\scripts\backup.ps1
```
Le fichier sera créé dans : `ged-app\backups\ged-backup_YYYYMMDD_HHMMSS.tar.gz`

---

### Voir les sauvegardes disponibles
```powershell
.\scripts\backup-verify.ps1
```

---

### Restaurer depuis une sauvegarde
```powershell
# Sans argument = liste les sauvegardes disponibles
.\scripts\restore.ps1

# Avec le chemin de la sauvegarde
.\scripts\restore.ps1 ".\backups\ged-backup_20260326_020000.tar.gz"
```

---

### Configurer la sauvegarde automatique (chaque nuit à 02h00)

Ouvrir PowerShell **en tant qu'Administrateur** :
```powershell
.\scripts\setup-auto-backup-windows.ps1
```

Ceci crée une tâche dans le **Planificateur de tâches Windows** visible dans :
`taskschd.msc` → Bibliothèque du Planificateur de tâches → "GED-APP Sauvegarde Automatique"

---

## Copier les sauvegardes vers un autre disque (recommandé)

Pour une protection maximale, copiez le dossier `backups\` vers :
- Un disque externe (USB, NAS)
- Un partage réseau (`\\serveur\sauvegardes\ged-app\`)
- Un service cloud (OneDrive, Google Drive)

Exemple de script PowerShell à planifier en plus :
```powershell
# Copier les sauvegardes vers un NAS
Copy-Item -Path "C:\ged-app\backups\*.tar.gz" `
          -Destination "\\NAS\sauvegardes\ged-app\" `
          -Force
```

---

## En cas de panne du serveur

1. Installer Docker sur le nouveau serveur
2. Copier le dossier `ged-app\` complet
3. Copier le fichier de sauvegarde `.tar.gz` dans `ged-app\backups\`
4. Ouvrir PowerShell dans le dossier `ged-app\`
5. Lancer : `docker compose up -d`
6. Attendre 30 secondes
7. Lancer : `.\scripts\restore.ps1 ".\backups\ged-backup_XXXXX.tar.gz"`

**Tous vos documents et signatures seront restaurés.**

---

## Fréquence recommandée

| Situation | Fréquence |
|---|---|
| Usage normal | 1 fois par nuit (automatique) |
| Avant une mise à jour | Manuellement avant la mise à jour |
| Avant un import Excel | Manuellement avant l'import |
| Conservation | 30 jours (configurable via `RETENTION_DAYS` dans `.env`) |
