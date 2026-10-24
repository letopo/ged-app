# HTTPS interne de la GED — déploiement

L'application est servie en HTTPS avec un **certificat signé par une CA interne**
(propre à l'hôpital). Pour supprimer les avertissements « connexion non privée »,
il faut **(1) faire pointer le nom DNS vers le serveur** et **(2) installer la CA
sur les postes clients**.

- Domaines : `ged.hsjmcam.net` (principal) et `ged.hsjm.local`
- IP serveur : `192.168.1.186` (le certificat couvre aussi `192.168.1.210`)
- Le certificat couvre les noms ET les IP.
- Tant que la CA n'est pas installée, l'application s'ouvre après avoir passé
  l'avertissement, **mais sans notifications push ni mode hors ligne** (le
  navigateur refuse le Service Worker) et parfois avec « Serveur inaccessible ».

Vérifier ce que présente le serveur :
`openssl s_client -connect 192.168.1.186:443 -servername ged.hsjmcam.net </dev/null | openssl x509 -noout -subject -ext subjectAltName -enddate`

> ⚠️ Ne jamais diffuser ni committer `ca.key` et `server.key` (clés privées).
> Seul **`ca.crt`** est distribué aux postes.

---

## 1) DNS interne

Créer un enregistrement **A** sur le serveur DNS de l'hôpital :

```
ged.hsjmcam.net.  A   192.168.1.186
ged.hsjm.local.   A   192.168.1.186
```

Test depuis un poste : `nslookup ged.hsjmcam.net` doit renvoyer `192.168.1.186`.

*Solution de repli (sans DNS, par poste)* : ajouter au fichier hosts
(`C:\Windows\System32\drivers\etc\hosts` sous Windows, `/etc/hosts` sous Mac/Linux) :
```
192.168.1.186   ged.hsjmcam.net ged.hsjm.local
```

---

## 2) Installer la CA (`ca.crt`) sur les postes

**Télécharger la CA** depuis n'importe quel appareil du réseau (en HTTP, donc sans
avertissement, avant même de lui faire confiance) :

- **http://ged.hsjmcam.net/ca.crt** ou **http://192.168.1.186/ca.crt**
  (fichier `HSJM-Internal-CA.crt`, servi par nginx depuis `nginx/ssl/ca.crt`)

Empreinte SHA-256 à vérifier avant d'approuver :
`2D:3C:09:EA:0F:68:ED:1B:CF:2E:64:D4:48:A3:7E:D9:D7:DF:16:F3:FF:69:45:66:68:9D:D0:BF:D1:EB:FE:84`

> Le 24/10/2026, le certificat de la CA a été **réémis avec la même clé, le même nom
> et le même numéro de série**, en ajoutant les extensions d'autorité
> (`basicConstraints CA:TRUE`, `keyUsage keyCertSign`). L'ancienne version (empreinte
> `9D:F1:CE:17:…:AE:12`, certificat X.509 v1 sans extensions) était refusée par
> Android (« une clé privée est requise ») qui ne la reconnaissait pas comme CA. Les
> postes qui ont déjà l'ancienne version continuent de fonctionner (les certificats
> serveur valident avec les deux) ; seuls les nouveaux appareils reçoivent la nouvelle.
> **À déployer sur la VM** : copier le nouveau `ca.crt` dans `nginx/ssl/` (servi sur
> `/ca.crt`), sans toucher à `ca.key` ni au certificat serveur.

Puis :

### Windows (recommandé : GPO pour tout le parc)
- **Un poste** : double-clic sur `ca.crt` → *Installer un certificat* → *Ordinateur local*
  → *Placer dans le magasin* → **Autorités de certification racines de confiance**.
- **Tout le domaine (Active Directory)** : Gestion des stratégies de groupe →
  *Configuration ordinateur → Stratégies → Paramètres Windows → Paramètres de sécurité
  → Stratégies de clé publique → Autorités de certification racines de confiance* →
  importer `ca.crt`. Tous les postes l'obtiennent au prochain `gpupdate`.

### macOS
Double-clic sur `ca.crt` → Trousseau **Système** → ouvrir le certificat →
*Se fier* → **Toujours approuver**. En ligne de commande (Terminal) :
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain HSJM-Internal-CA.crt
```
(sans droits admin : `security add-trusted-cert -r trustRoot -k ~/Library/Keychains/login.keychain-db HSJM-Internal-CA.crt`).
⚠️ Importer le certificat ne suffit pas : s'il apparaît « non approuvé » dans le
trousseau, le navigateur le refuse. Quitter ensuite Chrome (Cmd+Q) et le rouvrir.

### Android
Ouvrir http://192.168.1.186/ca.crt dans Chrome (le fichier se télécharge), puis
Paramètres → Sécurité → *Chiffrement & identifiants* → *Installer un certificat*
→ *Certificat CA* → choisir `HSJM-Internal-CA.crt`.
Si Android répond « une clé privée est requise » : c'est l'ancienne CA sans
extensions (voir plus haut) ou la mauvaise option (*Certificat utilisateur VPN et
appli* / *Wi-Fi*) — choisir **Certificat CA**.

Une fois la CA installée, fermer complètement Chrome puis rouvrir la GED : le cadenas
s'affiche et le menu ⋮ propose **« Installer l'application »** (vraie application
dans le tiroir d'applications, plein écran, hors ligne, notifications). Sans la CA,
Chrome refuse le Service Worker et ne propose qu'un **raccourci** (« Impossible
d'installer cette appli »). Si un raccourci a déjà été créé, le supprimer avant.
L'adresse ouverte doit figurer dans le certificat (SAN) : `ged.hsjmcam.net`,
`ged.hsjm.local`, `192.168.1.186`, `192.168.1.210` ou `192.168.1.138` (Mac de
développement) — sinon relancer `generate-internal-ca.sh` après l'avoir ajoutée.

### iOS / iPadOS
Ouvrir http://192.168.1.186/ca.crt dans **Safari** → *Autoriser* le téléchargement
du profil → *Réglages → Profil téléchargé → Installer* → puis
*Réglages → Général → Informations → Réglages des certificats de confiance* →
**activer** la confiance pour « HSJM Internal CA ».

### Firefox (n'utilise pas le magasin système)
*Paramètres → Vie privée et sécurité → Certificats → Afficher les certificats →
Autorités → Importer* `ca.crt` → cocher « Confirmer cette AC pour identifier des sites ».

Après installation, ouvrir `https://ged.hsjmcam.net` → **cadenas, aucun avertissement**,
et dans la console : `✅ Service Worker enregistré`.

---

## 3) Renouvellement

- La **CA** est valable 10 ans (ne pas la régénérer : ça obligerait à la redéployer partout).
- Le **certificat serveur** est valable ~825 jours. À l'approche de l'expiration,
  relancer le script (la CA est réutilisée automatiquement) :
  ```bash
  cd nginx/ssl && ./generate-internal-ca.sh
  docker compose restart frontend     # ou: docker exec ged-frontend nginx -s reload
  ```

## 4) HTTP → HTTPS
`http://ged.hsjmcam.net` redirige déjà vers HTTPS (sauf `/ca.crt`, laissé en HTTP
pour pouvoir installer la CA). L'accès en clair par IP (`http://192.168.1.186`)
reste ouvert ; pour le rediriger aussi, ajouter dans le bloc `server { listen 80;
server_name _; … }` de `frontend/nginx.conf` (en gardant `location = /ca.crt`) :
```nginx
location / { return 301 https://$host$request_uri; }
```
(à ne faire qu'une fois la CA déployée sur tous les postes).
