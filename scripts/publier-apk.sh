#!/usr/bin/env bash
# Construit l'APK « release » signée avec la clé de l'hôpital et la place dans
# telechargements/ (servi par nginx sur /telechargements/), avec version.json.
# La GED propose alors le téléchargement (Plus › Application Android) et
# l'appli installée signale la mise à jour.
#
# Prérequis : secrets/android-signing.properties + secrets/ged-hsjm-android.jks
# Usage : scripts/publier-apk.sh            (sur le Mac de développement)
# Ensuite, sur la VM : copier telechargements/ged-hsjm.apk et version.json dans
# ~/ged-app/telechargements/ (aucun redémarrage nécessaire).
set -euo pipefail

RACINE="$(cd "$(dirname "$0")/.." && pwd)"
SORTIE="$RACINE/telechargements"
APK="$RACINE/frontend/android/app/build/outputs/apk/release/app-release.apk"

if [ ! -f "$RACINE/secrets/android-signing.properties" ]; then
  echo "❌ secrets/android-signing.properties absent : impossible de signer l'APK." >&2
  exit 1
fi

export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"

cd "$RACINE/frontend"
npx cap sync android
cd android
./gradlew assembleRelease -q

# Vérifie que l'APK est bien signée avec la clé de l'hôpital
APKSIGNER="$(ls -d "$HOME"/Library/Android/sdk/build-tools/*/apksigner 2>/dev/null | tail -1)"
if [ -n "$APKSIGNER" ]; then
  "$APKSIGNER" verify --print-certs "$APK" | grep -q "CN=GED HSJM" \
    || { echo "❌ APK non signée avec la clé GED HSJM" >&2; exit 1; }
fi

CODE=$(grep -E '^\s*versionCode ' app/build.gradle | awk '{print $2}')
NOM=$(grep -E '^\s*versionName ' app/build.gradle | sed -E 's/.*"(.*)".*/\1/')
mkdir -p "$SORTIE"
cp "$APK" "$SORTIE/ged-hsjm.apk"
TAILLE=$(stat -f%z "$SORTIE/ged-hsjm.apk" 2>/dev/null || stat -c%s "$SORTIE/ged-hsjm.apk")
SHA=$(shasum -a 256 "$SORTIE/ged-hsjm.apk" | awk '{print $1}')
cat > "$SORTIE/version.json" <<JSON
{
  "versionCode": $CODE,
  "versionName": "$NOM",
  "taille": $TAILLE,
  "sha256": "$SHA",
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
echo "✅ APK $NOM (code $CODE) publiée dans $SORTIE ($((TAILLE / 1024)) Ko)"
