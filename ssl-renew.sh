#!/bin/bash
# ─────────────────────────────────────────────────────────────────
#  ssl-renew.sh — Renouvellement du certificat Let's Encrypt (OVH DNS)
#
#  Première utilisation (génération initiale) :
#    ./ssl-renew.sh --init
#
#  Renouvellement (à planifier en cron) :
#    ./ssl-renew.sh
# ─────────────────────────────────────────────────────────────────
set -e

DOMAIN="ged.hsjmcam.net"
EMAIL="aureleyankeu@gmail.com"
OVH_CONF="./ovh.conf"

GREEN='\033[0;32m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
info() { echo -e "${BLUE}ℹ️  $*${NC}"; }
err()  { echo -e "${RED}❌ $*${NC}"; exit 1; }

# Vérifications
[ -f "$OVH_CONF" ] || err "Fichier ovh.conf introuvable. Il doit être à la racine du projet."
chmod 600 "$OVH_CONF"

if [ "$1" = "--init" ]; then
  # ── Génération initiale ───────────────────────────────────────
  info "Génération du certificat pour $DOMAIN..."
  docker compose --profile certbot run --rm certbot certonly \
    --dns-ovh \
    --dns-ovh-credentials /etc/letsencrypt/ovh.conf \
    --dns-ovh-propagation-seconds 60 \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"
  ok "Certificat généré pour $DOMAIN"

else
  # ── Renouvellement ────────────────────────────────────────────
  info "Renouvellement du certificat..."
  docker compose --profile certbot run --rm certbot renew \
    --dns-ovh \
    --dns-ovh-credentials /etc/letsencrypt/ovh.conf \
    --dns-ovh-propagation-seconds 60 \
    --quiet
  ok "Renouvellement terminé"
fi

# Recharger nginx pour prendre le nouveau certificat
info "Rechargement de nginx..."
docker exec ged-frontend nginx -s reload
ok "nginx rechargé — certificat actif"
