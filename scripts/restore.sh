#!/bin/bash
# =============================================================================
# GED-APP - Script de Restauration Complète
# Restaure : Base de données PostgreSQL + Fichiers (uploads + signatures)
# =============================================================================

set -e

# ─── Arguments ───────────────────────────────────────────────────────────────
ARCHIVE="$1"

if [ -z "$ARCHIVE" ]; then
  echo ""
  echo "Usage: $0 <chemin_vers_sauvegarde.tar.gz>"
  echo ""
  echo "Exemples:"
  echo "  $0 ./backups/ged-backup_20260326_143000.tar.gz"
  echo ""
  echo "Sauvegardes disponibles:"
  ls -lh "$(dirname "$0")/../backups/"*.tar.gz 2>/dev/null || echo "  Aucune sauvegarde trouvée"
  echo ""
  exit 1
fi

if [ ! -f "$ARCHIVE" ]; then
  echo "❌ Fichier de sauvegarde introuvable: $ARCHIVE"
  exit 1
fi

# ─── Configuration ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RESTORE_TMP="/tmp/ged-restore-$$"

# Charger les variables d'environnement (supporte CRLF et LF)
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | tr -d '\r' | xargs) 2>/dev/null || true
fi

DB_NAME="${DB_NAME:-ged_db}"
DB_USER="${DB_USER:-ged_user}"
DB_PASSWORD="${DB_PASSWORD:-D@minguez123}"
CONTAINER_PG="${CONTAINER_PG:-ged-postgres}"

# ─── Couleurs ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log()    { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success(){ echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"; }
warn()   { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"; }
error()  { echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}"; exit 1; }

# ─── Entête ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}       GED-APP — Restauration Complète                     ${NC}"
echo -e "${CYAN}       Fichier: $(basename "$ARCHIVE")                     ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# ─── Confirmation ────────────────────────────────────────────────────────────
echo -e "${RED}⚠️  ATTENTION: Cette opération va REMPLACER toutes les données actuelles!${NC}"
echo -e "   - Base de données: $DB_NAME"
echo -e "   - Tous les fichiers uploads et signatures"
echo ""
read -p "Êtes-vous sûr de vouloir continuer? (tapez 'OUI' pour confirmer): " CONFIRM

if [ "$CONFIRM" != "OUI" ]; then
  echo "Restauration annulée."
  exit 0
fi

echo ""

# ─── Extraction de l'archive ─────────────────────────────────────────────────
log "Extraction de l'archive..."
mkdir -p "$RESTORE_TMP"
tar xzf "$ARCHIVE" -C "$RESTORE_TMP"

# Trouver le dossier extrait
RESTORE_DIR=$(find "$RESTORE_TMP" -maxdepth 1 -type d -name "ged-backup_*" | head -1)

if [ -z "$RESTORE_DIR" ]; then
  error "Archive invalide - structure de sauvegarde non reconnue"
fi

# Lire le manifest
if [ -f "$RESTORE_DIR/manifest.json" ]; then
  BACKUP_DATE=$(cat "$RESTORE_DIR/manifest.json" | grep '"date"' | cut -d'"' -f4)
  log "Sauvegarde du: $BACKUP_DATE"
fi

success "Archive extraite"

# ─── Vérification des containers ─────────────────────────────────────────────
log "Vérification des containers Docker..."

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_PG}$"; then
  warn "Container PostgreSQL non démarré. Démarrage..."
  cd "$PROJECT_DIR" && docker compose up -d postgres
  sleep 5
fi

success "Containers OK"

# ─── 1. Restauration PostgreSQL ──────────────────────────────────────────────
log "Restauration de la base de données PostgreSQL..."

DUMP_FILE="$RESTORE_DIR/database.sql.gz"

if [ ! -f "$DUMP_FILE" ]; then
  error "Fichier database.sql.gz non trouvé dans l'archive"
fi

# Arrêter le backend pour éviter les connexions actives
if docker ps --format '{{.Names}}' | grep -q "ged-backend"; then
  log "Arrêt du backend pour la restauration..."
  docker stop ged-backend 2>/dev/null || true
fi
if docker ps --format '{{.Names}}' | grep -q "ged-frontend"; then
  docker stop ged-frontend 2>/dev/null || true
fi

# Supprimer et recréer la base de données
log "Réinitialisation de la base de données..."
docker run --rm \
  --network ged-app_ged-network \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:17.5-alpine \
  psql -h "$CONTAINER_PG" -p 5432 -U "$DB_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS $DB_NAME WITH (FORCE);"

docker run --rm \
  --network ged-app_ged-network \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:17.5-alpine \
  psql -h "$CONTAINER_PG" -p 5432 -U "$DB_USER" -d postgres \
  -c "CREATE DATABASE $DB_NAME;"

# Restaurer le dump
log "Chargement des données..."
zcat "$DUMP_FILE" | docker run --rm -i \
  --network ged-app_ged-network \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:17.5-alpine \
  psql -h "$CONTAINER_PG" -p 5432 -U "$DB_USER" -d "$DB_NAME" -q

success "Base de données restaurée"

# ─── 2. Restauration des uploads ─────────────────────────────────────────────
log "Restauration des fichiers uploadés..."

UPLOADS_FILE="$RESTORE_DIR/uploads.tar.gz"

if [ -f "$UPLOADS_FILE" ] && [ -s "$UPLOADS_FILE" ]; then
  # Restaurer dans le volume Docker
  docker run --rm \
    -v ged-app_uploads_data:/data \
    -v "$RESTORE_DIR":/backup \
    alpine sh -c "rm -rf /data/* && tar xzf /backup/uploads.tar.gz -C /data 2>/dev/null || true"

  success "Uploads restaurés"
else
  warn "Archive uploads vide ou manquante - ignorée"
fi

# ─── 3. Restauration des signatures ──────────────────────────────────────────
log "Restauration des signatures..."

SIGNATURES_FILE="$RESTORE_DIR/signatures.tar.gz"

if [ -f "$SIGNATURES_FILE" ] && [ -s "$SIGNATURES_FILE" ]; then
  docker run --rm \
    -v ged-app_signatures_data:/data \
    -v "$RESTORE_DIR":/backup \
    alpine sh -c "rm -rf /data/* && tar xzf /backup/signatures.tar.gz -C /data 2>/dev/null || true"

  success "Signatures restaurées"
else
  warn "Archive signatures vide ou manquante - ignorée"
fi

# ─── 4. Redémarrage des services ─────────────────────────────────────────────
log "Redémarrage des services..."

cd "$PROJECT_DIR"
docker compose up -d

sleep 5
success "Services redémarrés"

# ─── Nettoyage ───────────────────────────────────────────────────────────────
rm -rf "$RESTORE_TMP"

# ─── Résumé ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ RESTAURATION TERMINÉE AVEC SUCCÈS${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "  🗃️  Base de données : restaurée"
echo -e "  📁 Fichiers uploads : restaurés"
echo -e "  🖊️  Signatures       : restaurées"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  L'application est accessible sur: ${CYAN}https://$(hostname -I | awk '{print $1}')${NC}"
echo ""
