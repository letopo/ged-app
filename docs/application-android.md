# Application Android (APK) de la GED

L'APK est une vraie application Android construite avec **Capacitor**. Elle
affiche la GED du serveur choisi dans une fenêtre native : mêmes écrans, mêmes
droits et mêmes données que le site. L'application ne parle jamais directement
à la base : elle passe par l'API du backend, comme le navigateur.

## Choix du serveur

- **Au premier lancement**, l'APK demande l'adresse du serveur GED. Deux
  raccourcis sont proposés : Production (`192.168.1.186`) et Développement
  (`192.168.1.138`, le Mac). On peut aussi saisir une autre adresse IP ou un nom
  `*.hsjm.local` / `*.hsjmcam.net`. Le préfixe `https://` est ajouté
  automatiquement.
- Avant d'enregistrer l'adresse, l'APK vérifie que le serveur répond en HTTPS
  avec un certificat accepté.
- **Aux lancements suivants**, l'APK se connecte directement au serveur
  mémorisé. S'il ne répond pas, elle propose « Réessayer » ou « Changer de
  serveur ».
- **Pour changer de serveur** en cours d'utilisation : lien « Changer de
  serveur » sous le formulaire de connexion, ou icône serveur à côté du bouton
  de déconnexion. Ces liens n'apparaissent que dans l'APK : elle ajoute
  `GEDHSJM-Android` à son user-agent, voir `src/utils/androidApp.js`.

L'adresse est enregistrée dans la page locale de l'APK (`capacitor-shell/index.html`,
servie sur `https://localhost`).

Chaque déploiement sur le serveur met donc l'application à jour automatiquement.
Il n'est nécessaire de recompiler l'APK que si l'on change ce qui se trouve
dans `frontend/android/`, `frontend/capacitor-shell/` ou
`frontend/capacitor.config.json` (raccourcis, icône, certificat, permissions).

## Fichiers

| Fichier | Rôle |
|---|---|
| `frontend/capacitor.config.json` | Nom, identifiant (`cm.hsjm.ged`), domaines autorisés dans l'appli (toute IPv4, `*.hsjm.local`, `*.hsjmcam.net`) |
| `frontend/capacitor-shell/` | Pages locales embarquées : `index.html` (choix du serveur) et `erreur.html` (serveur injoignable en cours d'utilisation) |
| `frontend/android/` | Projet Android Studio |
| `android/app/src/main/res/raw/ca_hsjm.crt` | CA interne de l'hôpital embarquée (copie de `nginx/ssl/ca.crt`) |
| `android/app/src/main/res/xml/network_security_config.xml` | Autorités acceptées : système + CA HSJM + CA installée à la main ; http interdit |

## Compiler l'APK

1. `cd frontend && npm install`, puis `npm run android:sync`.
2. `npm run android:open` : Android Studio s'ouvre sur le projet.
3. **Build › Generate App Bundles or APKs › Generate APKs**.
   L'APK se trouve dans `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

En ligne de commande :

```sh
cd frontend/android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew assembleDebug
```

Le projet utilise Gradle 9.5. Gradle 8.14 ne fonctionne pas avec le Java 25
d'Android Studio, et à partir de 9.6 Gradle n'accepte plus AGP 8.13.

## Installer sur un téléphone

Copiez `app-debug.apk` sur le téléphone (câble, WhatsApp, e-mail), ouvrez-le,
puis autorisez « Installer des applications inconnues ». Vous pouvez aussi
utiliser `adb install app-debug.apk` avec le débogage USB activé.

Le téléphone doit être sur le même réseau Wi-Fi que le serveur choisi.

## Points à surveiller

- **Changement d'IP du serveur** : il suffit de saisir la nouvelle adresse
  dans « Changer de serveur ». Il faut recompiler seulement si l'on veut mettre
  à jour les raccourcis.
- **Changement de CA du serveur** : recopiez `nginx/ssl/ca.crt` dans
  `res/raw/ca_hsjm.crt`, puis recompilez. En attendant, un téléphone sur
  lequel la nouvelle CA a été installée à la main continue de fonctionner.
- **Version de diffusion** : l'APK `debug` suffit pour les essais. Pour une
  diffusion large, il faudra une APK `release` signée avec une clé de
  l'hôpital, à conserver précieusement : sans elle, on ne peut plus publier de
  mise à jour.

## Étapes suivantes envisagées

- Téléchargement des PDF et des exports : par défaut, la WebView Android
  n'enregistre pas les fichiers. Il faudra un module de téléchargement natif.
- Notifications push via Firebase (FCM).
- Déverrouillage par empreinte digitale.
