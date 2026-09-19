# Déploiement vers le VM Windows de production (sans GitHub)

Contexte : GitHub/GHCR ne sont pas fiables depuis Cameroun (CAMTEL). Solution :
on construit les images Docker sur le poste de dev, on les envoie directement
au VM de prod par le réseau local (SSH), sans jamais passer par Internet.

## 1. Configuration unique sur le VM Windows (à faire une seule fois, via RDP)

Les étapes b, c, d sont nécessaires quelle que soit la méthode choisie
ci-dessous. L'étape a n'est nécessaire que pour la Méthode A (SSH) — tu peux
la sauter si tu comptes utiliser uniquement la Méthode B (RDP).

### a. Activer OpenSSH Server (uniquement pour la Méthode A)

Ouvre PowerShell **en administrateur** sur le VM et exécute :

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic
New-NetFirewallRule -Name sshd -DisplayName "OpenSSH Server (sshd)" -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
```

Vérifie que ça fonctionne : depuis le Mac, `ssh NomUtilisateur@IP-du-VM` doit te
connecter (avec le mot de passe du compte Windows, ou une clé SSH si tu en
configures une — recommandé pour ne plus taper de mot de passe à chaque
déploiement, voir `ssh-copy-id` ou `Get-Content ~/.ssh/id_ed25519.pub | ssh
NomUtilisateur@IP-du-VM "Add-Content C:\Users\NomUtilisateur\.ssh\authorized_keys"`).

### b. Créer le dossier de l'application

```powershell
mkdir C:\Users\adm_hsjm.HSJM\Documents\ged-app
```

### c. Copier le `.env` de production dans ce dossier

C'est la **seule fois** où tu dois t'en occuper manuellement — le script de
déploiement ne touchera plus jamais ce fichier ensuite. Utilise les vraies
valeurs de prod (mots de passe, `JWT_SECRET`, clés SMTP, etc.), pas celles du
poste de dev.

### d. Récupérer le dossier `nginx/ssl` (certificats HTTPS)

Si tes certificats ne sont pas déjà sur le VM, copie-les une fois dans
`C:\Users\adm_hsjm.HSJM\Documents\ged-app\nginx\ssl\`.

## 2. Déploiement (à chaque mise à jour)

Deux méthodes, au choix — le résultat final est identique. La méthode A est
entièrement automatique (un seul script) mais demande SSH activé (section 1a).
La méthode B ne demande **aucune configuration réseau particulière**, juste
une session RDP, mais quelques clics manuels à chaque fois.

### Méthode A : via SSH (automatique, depuis le Mac)

```bash
cd ged-app
./scripts/deploy-to-vm.sh Administrateur@192.168.1.50 C:/Users/adm_hsjm.HSJM/Documents/ged-app
```

(remplace `Administrateur@192.168.1.50` par le vrai utilisateur/IP du VM — le
script les redemande si tu ne les donnes pas en argument)

Ce que fait le script, dans l'ordre :
1. Build des images Docker en local (`docker-compose.prod.yml`).
2. Export en une archive `.tar.gz`.
3. Envoi de `docker-compose.prod.yml`, du dossier `backend/database`
   (migrations) et d'un petit script PowerShell vers le VM.
4. Envoi de l'archive d'images.
5. Sur le VM : chargement des images, `docker compose up -d`, exécution des
   migrations Sequelize, nettoyage des fichiers temporaires.

Le `.env` et les certificats SSL du VM ne sont jamais modifiés par ce script.

**Vérification** :
```bash
ssh Administrateur@192.168.1.50 "docker ps"
ssh Administrateur@192.168.1.50 "docker logs ged-backend --tail 30"
```

### Méthode B : via RDP (copie manuelle, sans SSH)

#### Étape 1 — sur le Mac : préparer le paquet

```bash
cd ged-app
./scripts/build-for-vm.sh
```

Ça construit les images et produit un seul fichier `ged-deploy-AAAAMMJJ-HHMM.zip`
à la racine du projet (images Docker + `docker-compose.prod.yml` + migrations
+ script PowerShell de déploiement — tout regroupé, rien d'autre à toucher).

#### Étape 2 — faire passer ce fichier .zip dans la session RDP

Deux façons, selon ton client RDP (sur Mac, l'app "Windows App" / "Microsoft
Remote Desktop") :

**a) Lecteur partagé (recommandé, robuste pour les gros fichiers)** — dans les
réglages de la connexion RDP, section *Dossiers* (ou *Folders* / *Local
Resources* selon la version), active le dossier contenant le `.zip` (par
exemple le dossier `ged-app` lui-même). Une fois connecté au VM, ce dossier
apparaît dans l'Explorateur Windows comme un lecteur réseau (souvent
`\\tsclient\...`). Il suffit d'y copier-coller le `.zip` vers `C:\Users\adm_hsjm.HSJM\Documents\ged-app\`
comme un dossier normal.

**b) Presse-papiers (plus simple, suffisant pour un fichier)** — dans le
Finder, sélectionne le `.zip`, `Cmd+C`. Bascule sur la fenêtre RDP, ouvre
l'Explorateur Windows dans `C:\Users\adm_hsjm.HSJM\Documents\ged-app`, fais un clic droit → *Coller*
(ou `Ctrl+V`). Le transfert de fichiers par presse-papiers est activé par
défaut dans la plupart des clients RDP.

#### Étape 3 — sur le VM : dézipper et lancer le déploiement

Dans l'Explorateur Windows, clic droit sur le `.zip` → *Extraire tout...*
vers un dossier temporaire (ex: `C:\Users\adm_hsjm.HSJM\Documents\ged-app\tmp-deploy\`). Puis ouvre
PowerShell (pas forcément en administrateur) dans ce dossier extrait
(`Shift + clic droit` dans le dossier → *Ouvrir la fenêtre PowerShell ici*,
ou `cd` manuellement) et lance :

```powershell
.\deploy-remote-manual.ps1
```

Ce script charge les images, copie `docker-compose.prod.yml` et les
migrations vers `C:\Users\adm_hsjm.HSJM\Documents\ged-app`, redémarre les services et exécute les
migrations Sequelize — sans jamais toucher au `.env` déjà présent dans
`C:\Users\adm_hsjm.HSJM\Documents\ged-app`.

Une fois terminé, tu peux supprimer le dossier temporaire et le `.zip`.

**Vérification** (directement dans PowerShell sur le VM) :
```powershell
docker ps
docker logs ged-backend --tail 30
```

Ou simplement ouvrir l'application dans un navigateur.

## Notes

- Le VM et le poste de dev doivent être sur le même réseau (ou reliés par
  VPN) — c'est le cas actuellement (même réseau local à l'hôpital).
- Si un jour le poste de dev est un Mac Apple Silicon (M1/M2/M3...) et que le
  VM est un PC Windows classique (x86_64) — ce qui n'est PAS le cas
  aujourd'hui (les deux sont x86_64) — il faudrait ajouter
  `--platform linux/amd64` au `docker compose build`, sinon les images
  construites ne démarreraient pas sur le VM.
