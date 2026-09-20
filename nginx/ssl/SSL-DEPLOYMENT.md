# HTTPS interne de la GED — déploiement

L'application est servie en HTTPS avec un **certificat signé par une CA interne**
(propre à l'hôpital). Pour supprimer les avertissements « connexion non privée »,
il faut **(1) faire pointer le nom DNS vers le serveur** et **(2) installer la CA
sur les postes clients**.

- Domaine : `ged.hsjm.local`
- IP serveur : `192.168.1.212`
- Le certificat couvre les deux (accès par nom ET par IP).

> ⚠️ Ne jamais diffuser ni committer `ca.key` et `server.key` (clés privées).
> Seul **`ca.crt`** est distribué aux postes.

---

## 1) DNS interne

Créer un enregistrement **A** sur le serveur DNS de l'hôpital :

```
ged.hsjm.local.   A   192.168.1.212
```

Test depuis un poste : `nslookup ged.hsjm.local` doit renvoyer `192.168.1.212`.

*Solution de repli (sans DNS, par poste)* : ajouter au fichier hosts
(`C:\Windows\System32\drivers\etc\hosts` sous Windows, `/etc/hosts` sous Mac/Linux) :
```
192.168.1.212   ged.hsjm.local
```

---

## 2) Installer la CA (`ca.crt`) sur les postes

Copier `ca.crt` sur chaque poste, puis :

### Windows (recommandé : GPO pour tout le parc)
- **Un poste** : double-clic sur `ca.crt` → *Installer un certificat* → *Ordinateur local*
  → *Placer dans le magasin* → **Autorités de certification racines de confiance**.
- **Tout le domaine (Active Directory)** : Gestion des stratégies de groupe →
  *Configuration ordinateur → Stratégies → Paramètres Windows → Paramètres de sécurité
  → Stratégies de clé publique → Autorités de certification racines de confiance* →
  importer `ca.crt`. Tous les postes l'obtiennent au prochain `gpupdate`.

### macOS
Double-clic sur `ca.crt` → Trousseau **Système** → ouvrir le certificat →
*Se fier* → **Toujours approuver**.

### Android
Paramètres → Sécurité → *Chiffrement & identifiants* → *Installer un certificat*
→ *Certificat CA* → choisir `ca.crt`.

### iOS / iPadOS
Envoyer `ca.crt` (mail/AirDrop) → Installer le profil → puis
*Réglages → Général → Informations → Réglages des certificats de confiance* →
**activer** la confiance pour « HSJM Internal CA ».

### Firefox (n'utilise pas le magasin système)
*Paramètres → Vie privée et sécurité → Certificats → Afficher les certificats →
Autorités → Importer* `ca.crt` → cocher « Confirmer cette AC pour identifier des sites ».

Après installation, ouvrir `https://ged.hsjm.local` → **cadenas vert, aucun avertissement**.

---

## 3) Renouvellement

- La **CA** est valable 10 ans (ne pas la régénérer : ça obligerait à la redéployer partout).
- Le **certificat serveur** est valable ~825 jours. À l'approche de l'expiration,
  relancer le script (la CA est réutilisée automatiquement) :
  ```bash
  cd nginx/ssl && ./generate-internal-ca.sh
  docker compose restart frontend     # ou: docker exec ged-frontend nginx -s reload
  ```

## 4) (Optionnel) Forcer HTTP → HTTPS
Pour rediriger automatiquement le port 80 vers HTTPS, ajouter dans le bloc
`server { listen 80; … }` de `frontend/nginx.conf` :
```nginx
location / { return 301 https://$host$request_uri; }
```
(à ne faire qu'une fois le DNS + la CA déployés, sinon plus d'accès en clair).
