#!/bin/bash
# ─────────────────────────────────────────────────────────────────
#  deploy-to-vm.sh — Déploiement vers le VM Windows de production,
#  sans passer par GitHub/GHCR (inaccessibles depuis certains FAI).
#
#  Principe : on construit les images Docker ICI (poste de dev), on
#  les exporte en archive, on l'envoie par SSH/SCP jusqu'au VM (même
#  réseau local), puis un petit script PowerShell côté VM charge les
#  images et redémarre les services. Le .env du VM n'est jamais touché.
#
#  Pré-requis unique (une seule fois) : OpenSSH Server activé sur le
#  VM Windows — voir scripts/README-DEPLOY-WINDOWS.md.
#
#  Usage :
#    ./scripts/deploy-to-vm.sh                              (demande les paramètres)
#    ./scripts/deploy-to-vm.sh Administrateur@192.168.1.50 C:/ged-app
# ─────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."   # se placer à la racine du projet

GREEN='\033[0;32m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
info() { echo -e "${BLUE}ℹ️  $*${NC}"; }
err()  { echo -e "${RED}❌ $*${NC}"; exit 1; }

PROD_HOST="${1:-}"
PROD_PATH="${2:-C:/Users/adm_hsjm.HSJM/Documents/ged-app}"

if [ -z "$PROD_HOST" ]; then
  read -p "Utilisateur@IP du VM Windows (ex: Administrateur@192.168.1.50) : " PROD_HOST
fi

command -v ssh >/dev/null || err "ssh introuvable sur ce poste."
command -v scp >/dev/null || err "scp introuvable sur ce poste."

info "Test de connexion SSH vers $PROD_HOST..."
ssh -o BatchMode=yes -o ConnectTimeout=5 "$PROD_HOST" "echo ok" >/dev/null 2>&1 \
  || err "Connexion SSH impossible vers $PROD_HOST. Vérifie qu'OpenSSH Server est activé sur le VM et accessible (voir scripts/README-DEPLOY-WINDOWS.md)."
ok "Connexion SSH OK"

ARCHIVE_NAME="ged-images-$(date +%Y%m%d-%H%M).tar.gz"
ARCHIVE="/tmp/$ARCHIVE_NAME"

info "Build des images Docker (config production)..."
docker compose -f docker-compose.prod.yml build
ok "Images buildées"

info "Export en archive (peut prendre 1-2 min)..."
docker save ged-app-backend ged-app-frontend | gzip > "$ARCHIVE"
SIZE=$(du -sh "$ARCHIVE" | cut -f1)
ok "Archive créée : $ARCHIVE ($SIZE)"

info "Synchronisation de docker-compose.prod.yml, des migrations et du script distant..."
ssh "$PROD_HOST" "powershell -Command \"New-Item -ItemType Directory -Force -Path '$PROD_PATH', '$PROD_PATH/backend', '$PROD_PATH/nginx/ssl' | Out-Null\""
scp docker-compose.prod.yml "$PROD_HOST:$PROD_PATH/docker-compose.prod.yml"
scp -r backend/database "$PROD_HOST:$PROD_PATH/backend/"
scp scripts/deploy-remote.ps1 "$PROD_HOST:$PROD_PATH/deploy-remote.ps1"
if [ -f nginx/ssl/server.crt ] && [ -f nginx/ssl/server.key ]; then
  scp nginx/ssl/server.crt nginx/ssl/server.key "$PROD_HOST:$PROD_PATH/nginx/ssl/"
fi
ok "Fichiers synchronisés (le .env du VM n'est jamais touché)"

info "Transfert de l'archive vers le VM (peut prendre quelques minutes selon le réseau)..."
scp "$ARCHIVE" "$PROD_HOST:$PROD_PATH/$ARCHIVE_NAME"
ok "Archive transférée"

info "Chargement des images et redémarrage sur le VM..."
ssh "$PROD_HOST" "powershell -ExecutionPolicy Bypass -File '$PROD_PATH/deploy-remote.ps1' -ArchiveName '$ARCHIVE_NAME' -AppPath '$PROD_PATH'"
ok "Déploiement terminé sur $PROD_HOST"

rm "$ARCHIVE"
ok "Archive locale supprimée"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Déploiement vers le VM Windows terminé 🚀 ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
