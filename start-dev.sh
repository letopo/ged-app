#!/bin/bash
# ─────────────────────────────────────────────────────
# GED Hôpital — Démarrage en mode développement
# Usage : ./start-dev.sh
#
# Ce script :
#   1. Lance le stack Docker (docker-compose.yml)
#   2. Attend que le backend soit prêt (port 3000)
#   3. Build le frontend si nécessaire
#   4. Lance Electron (charge le dist local + backend Docker)
# ─────────────────────────────────────────────────────

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  🏥  GED Hôpital — Démarrage"
echo "  ─────────────────────────────────────"

# ── 1) Démarrer Docker ───────────────────────────────
echo "  🐳  Démarrage des conteneurs Docker..."
docker compose -f "$ROOT/docker-compose.yml" up -d

if [ $? -ne 0 ]; then
  echo "  ❌  Erreur Docker. Vérifiez que Docker Desktop est lancé."
  exit 1
fi

echo "  ✅  Conteneurs démarrés :"
echo "      ▶  Backend    → http://localhost:3000"
echo "      ▶  PostgreSQL → localhost:5432"

# ── 2) Attendre que le backend réponde ───────────────
echo ""
echo "  ⏳  Attente du backend..."

MAX_WAIT=60
WAITED=0
until curl -sf http://localhost:3000/api/health > /dev/null 2>&1; do
  sleep 1
  WAITED=$((WAITED + 1))
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "  ⚠️   Backend non disponible après ${MAX_WAIT}s — Electron démarre quand même."
    break
  fi
done

if [ $WAITED -lt $MAX_WAIT ]; then
  echo "  ✅  Backend prêt (${WAITED}s)"
fi

# ── 3) Builder le frontend si dist absent ou obsolète ─
DIST="$ROOT/frontend/dist/index.html"
if [ ! -f "$DIST" ]; then
  echo ""
  echo "  📦  Build du frontend (première fois)..."
  cd "$ROOT/frontend" && npm install --silent && npm run build
  if [ $? -ne 0 ]; then
    echo "  ❌  Erreur lors du build frontend."
    exit 1
  fi
  echo "  ✅  Frontend buildé"
fi

# ── 4) Lancer Electron ───────────────────────────────
echo ""
echo "  🖥️   Lancement d'Electron..."
echo "  ─────────────────────────────────────"
echo "  • Fermer la fenêtre Electron pour quitter"
echo "  • Docker reste actif en arrière-plan"
echo "  • Pour arrêter Docker : docker compose down"
echo ""

cd "$ROOT/electron-app" && npm start
