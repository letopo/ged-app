#!/usr/bin/env bash
#
# prepare-base-images.sh
# ----------------------------------------------------------------------------
# À lancer sur une machine où le Docker Hub est ACCESSIBLE
# (ex : partage de connexion 4G, box à la maison, autre réseau).
#
# Télécharge les images de base Docker nécessaires à la GED et les exporte dans
# UNE archive compressée, à transférer ensuite sur le serveur de production
# (dont le réseau bloque le Docker Hub) où on les charge avec
# load-base-images.ps1.
#
# Une fois ces images chargées sur le serveur, « docker compose build » s'exécute
# sans jamais contacter le Docker Hub (les images FROM sont déjà en cache local).
#
# Usage :
#   ./prepare-base-images.sh                 # sortie -> base-images.tar.gz (amd64)
#   ./prepare-base-images.sh mon-archive.tar.gz
#   PLATFORM=linux/arm64 ./prepare-base-images.sh   # forcer une autre architecture
# ----------------------------------------------------------------------------
set -euo pipefail

# Architecture cible. Le serveur Windows de production est en amd64 :
# on télécharge donc les variantes amd64, même depuis un Mac Apple Silicon.
PLATFORM="${PLATFORM:-linux/amd64}"

# Fichier de sortie (1er argument, sinon valeur par défaut)
OUT="${1:-base-images.tar.gz}"

# Images de base — DOIVENT correspondre aux FROM des Dockerfiles
# (backend/Dockerfile, frontend/Dockerfile) + images runtime du docker-compose.yml.
# NB : épinglez de préférence onlyoffice sur une version fixe (ex. :8.2.0) plutôt
#      que :latest, pour garantir que dev et prod restent identiques.
IMAGES=(
  "node:20-alpine"
  "nginx:alpine"
  "postgres:17.5-alpine"
  "onlyoffice/documentserver:latest"
)

# Vérifier que Docker répond
if ! docker version >/dev/null 2>&1; then
  echo "❌ Docker n'est pas accessible. Démarrez Docker Desktop puis réessayez." >&2
  exit 1
fi

echo "==> Plateforme cible : $PLATFORM"
echo "==> Téléchargement des ${#IMAGES[@]} images de base..."
for img in "${IMAGES[@]}"; do
  echo "    - $img"
  docker pull --platform "$PLATFORM" "$img"
done

echo "==> Export vers $OUT (compression gzip — cela peut prendre quelques minutes)..."
docker save "${IMAGES[@]}" | gzip > "$OUT"

SIZE="$(du -h "$OUT" | cut -f1)"
echo ""
echo "✅ Terminé : $OUT ($SIZE)"
echo "   1) Transférez ce fichier sur le serveur de production (clé USB / partage réseau)."
echo "   2) Sur le serveur, lancez :  powershell -ExecutionPolicy Bypass -File load-base-images.ps1"
