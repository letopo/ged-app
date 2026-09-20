#!/bin/bash
# ─────────────────────────────────────────────────────────────────
#  deploy.sh — Build local → export images → déploiement sans internet
#
#  Usage :
#    ./deploy.sh                        (demande les paramètres)
#    ./deploy.sh user@192.168.1.x /opt/ged-app
# ─────────────────────────────────────────────────────────────────
set -e

# ── Couleurs ──────────────────────────────────────────────────────
GREEN='\033[0;32m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
info() { echo -e "${BLUE}ℹ️  $*${NC}"; }
err()  { echo -e "${RED}❌ $*${NC}"; exit 1; }

# ── Paramètres ────────────────────────────────────────────────────
PROD_HOST="${1:-}"
PROD_PATH="${2:-}"

if [ -z "$PROD_HOST" ]; then
  read -p "Adresse SSH du serveur (ex: user@192.168.1.50) : " PROD_HOST
fi
if [ -z "$PROD_PATH" ]; then
  read -p "Chemin de l'app sur le serveur (ex: /opt/ged-app) : " PROD_PATH
fi

ARCHIVE=/tmp/ged-images-$(date +%Y%m%d-%H%M).tar.gz

# ── 1. Build local des images ─────────────────────────────────────
info "Build des images Docker en local..."
docker compose build
ok "Images buildées"

# ── 2. Export des images en archive ──────────────────────────────
info "Export en archive (peut prendre 1-2 min)..."
docker save ged-app-backend ged-app-frontend | gzip > "$ARCHIVE"
SIZE=$(du -sh "$ARCHIVE" | cut -f1)
ok "Archive créée : $ARCHIVE ($SIZE)"

# ── 3. Synchroniser les fichiers de config + migrations ──────────
info "Synchronisation des fichiers de configuration et migrations..."

# docker-compose.yml et .env
rsync -az docker-compose.yml .env "$PROD_HOST:$PROD_PATH/"

# Dossier database (migrations + seeders) — critique pour le schéma DB
rsync -az --delete backend/database/ "$PROD_HOST:$PROD_PATH/backend/database/"

ok "Fichiers synchronisés (config + migrations)"

# ── 4. Envoyer l'archive vers le serveur ─────────────────────────
info "Transfert de l'archive vers $PROD_HOST..."
scp "$ARCHIVE" "$PROD_HOST:/tmp/"
ok "Archive transférée"

# ── 5. Charger et redémarrer sur le serveur ──────────────────────
ARCHIVE_NAME=$(basename "$ARCHIVE")
info "Chargement des images et redémarrage sur le serveur..."
ssh "$PROD_HOST" bash << REMOTE
  set -e
  echo "→ Chargement des images Docker..."
  docker load < /tmp/$ARCHIVE_NAME
  echo "→ Redémarrage des services..."
  cd $PROD_PATH
  docker compose up -d
  echo "→ Nettoyage..."
  rm /tmp/$ARCHIVE_NAME
  docker image prune -f
REMOTE
ok "Déploiement terminé sur $PROD_HOST"

# ── 6. Nettoyage local ────────────────────────────────────────────
rm "$ARCHIVE"
ok "Archive locale supprimée"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Déploiement réussi sans internet ! 🚀    ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
