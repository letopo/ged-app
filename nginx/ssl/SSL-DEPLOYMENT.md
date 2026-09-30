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
`9D:F1:CE:17:C3:4E:80:57:EE:70:4F:71:4E:78:03:22:0D:1F:94:08:B3:86:D5:37:F3:9C:E4:8E:C7:50:AE:12`

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
