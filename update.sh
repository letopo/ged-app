#!/bin/bash
# ─────────────────────────────────────────────────────────────────
#  update.sh — Mise à jour de ged-app sur le VPS
#  Usage : ./update.sh
# ─────────────────────────────────────────────────────────────────
set -e

GREEN='\033[0;32m'; BLUE='\033[0;34m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
info() { echo -e "${BLUE}ℹ️  $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
err()  { echo -e "${RED}❌ $*${NC}"; exit 1; }

VPS="ubuntu@152.228.140.107"
APP_PATH="/opt/ged-app"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}   Mise à jour GED App → ged.hsjmcam.net  ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

# ── 1. Sauvegarde préventive avant mise à jour ────────────────────
info "Sauvegarde de la base de données avant mise à jour..."
ssh "$VPS" "docker exec ged-postgres pg_dump -U ged_user ged_db | gzip > $APP_PATH/backups/ged_pre_update_\$(date +%Y%m%d_%H%M).sql.gz"
ok "Sauvegarde créée"

# ── 2. Synchroniser les sources (sans secrets) ────────────────────
info "Synchronisation des fichiers sources..."
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'frontend/node_modules' \
  --exclude 'backend/node_modules' \
  --exclude '.env' \
  --exclude 'ovh.conf' \
  --exclude 'backups' \
  --exclude '*.tar.gz' \
  --exclude 'graphify-out' \
  --exclude 'letsencrypt' \
  --exclude 'private_key.pem' \
  . "$VPS:$APP_PATH/"
ok "Sources synchronisées"

# ── 3. Patcher le docker-compose pour letsencrypt ─────────────────
ssh "$VPS" "sed -i 's|letsencrypt_data:/etc/letsencrypt:ro|/opt/ged-app/letsencrypt:/etc/letsencrypt:ro|g' $APP_PATH/docker-compose.yml" 2>/dev/null || true

# ── 4. Rebuild les images sur le VPS ─────────────────────────────
info "Build des images Docker sur le VPS..."
ssh "$VPS" "cd $APP_PATH && newgrp docker << 'REMOTE'
docker compose build 2>&1 | grep -E 'Built|ERROR|error' || true
REMOTE"
ok "Images buildées"

# ── 5. Redémarrer les services ────────────────────────────────────
info "Redémarrage des services..."
ssh "$VPS" "cd $APP_PATH && newgrp docker << 'REMOTE'
docker compose up -d
REMOTE"
ok "Services redémarrés"

# ── 5b. Lancer les migrations Sequelize ──────────────────────────
info "Lancement des migrations de base de données..."
sleep 8
ssh "$VPS" "docker exec ged-backend npx sequelize-cli db:migrate 2>&1 | tail -20" || warn "Migrations échouées — vérifier manuellement"
ok "Migrations terminées"

# ── 6. Vérification santé ─────────────────────────────────────────
info "Vérification de l'état des services..."
sleep 10
HEALTH=$(curl -sk https://ged.hsjmcam.net/api/health | grep -o '"status":"OK"' || echo "")
if [ -n "$HEALTH" ]; then
  ok "API en ligne : https://ged.hsjmcam.net"
else
  warn "L'API ne répond pas encore — vérifier avec : ssh $VPS 'cd $APP_PATH && docker compose logs --tail=20'"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}   Mise à jour terminée ! 🚀               ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
