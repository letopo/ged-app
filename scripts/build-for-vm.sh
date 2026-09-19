#!/bin/bash
# ─────────────────────────────────────────────────────────────────
#  build-for-vm.sh — Prépare un paquet de déploiement à copier
#  manuellement vers le VM Windows via RDP (sans SSH).
#
#  Construit les images Docker en local, les exporte, et regroupe
#  tout ce qu'il faut (images + docker-compose.prod.yml + migrations
#  + script PowerShell) dans un seul fichier .zip prêt à copier-coller
#  dans la session RDP.
#
#  Usage :
#    ./scripts/build-for-vm.sh
# ─────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."   # se placer à la racine du projet

GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
info() { echo -e "${BLUE}ℹ️  $*${NC}"; }

STAMP=$(date +%Y%m%d-%H%M)
OUT_DIR="./deploy-package"
ZIP_NAME="ged-deploy-$STAMP.zip"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR/backend"

info "Build des images Docker (config production)..."
docker compose -f docker-compose.prod.yml build
ok "Images buildées"

info "Export en archive (peut prendre 1-2 min)..."
docker save ged-app-backend ged-app-frontend | gzip > "$OUT_DIR/ged-images.tar.gz"
ok "Archive des images créée"

cp docker-compose.prod.yml "$OUT_DIR/"
cp -r backend/database "$OUT_DIR/backend/"
cp scripts/deploy-remote-manual.ps1 "$OUT_DIR/deploy-remote-manual.ps1"

if [ -f nginx/ssl/server.crt ] && [ -f nginx/ssl/server.key ]; then
  mkdir -p "$OUT_DIR/nginx/ssl"
  cp nginx/ssl/server.crt nginx/ssl/server.key "$OUT_DIR/nginx/ssl/"
  ok "Certificats nginx/ssl inclus dans le paquet"
else
  echo "⚠️  nginx/ssl/server.crt ou server.key introuvable en local — le paquet ne contiendra pas les certificats."
  echo "   Génère-les avec : cd nginx/ssl && ./generate-internal-ca.sh"
fi

info "Compression du paquet complet en un seul fichier .zip..."
(cd "$OUT_DIR" && zip -rq "../$ZIP_NAME" .)
rm -rf "$OUT_DIR"
SIZE=$(du -sh "$ZIP_NAME" | cut -f1)

ok "Paquet prêt : $ZIP_NAME ($SIZE)"
echo ""
echo "Étapes suivantes :"
echo "  1. Copie ce fichier .zip vers le VM via RDP (voir scripts/README-DEPLOY-WINDOWS.md, Méthode B)."
echo "  2. Sur le VM, dézippe-le n'importe où puis, en PowerShell dans ce dossier extrait :"
echo "       .\\deploy-remote-manual.ps1"
