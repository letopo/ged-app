#!/bin/bash
# =============================================================================
# GED-APP - Script de Sauvegarde Complète
# Sauvegarde : Base de données PostgreSQL + Fichiers (uploads + signatures)
# =============================================================================

set -e

# ─── Configuration ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="ged-backup_$DATE"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Charger les variables d'environnement si .env existe (supporte CRLF et LF)
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | tr -d '\r' | xargs) 2>/dev/null || true
fi

DB_NAME="${DB_NAME:-ged_db}"
DB_USER="${DB_USER:-ged_user}"
DB_PASSWORD="${DB_PASSWORD:-D@minguez123}"
CONTAINER_PG="${CONTAINER_PG:-ged-postgres}"

# Nombre de jours de rétention des sauvegardes (0 = pas de suppression auto)
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# ─── Couleurs ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log()    { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success(){ echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"; }
warn()   { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"; }
error()  { echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}"; }

# ─── Entête ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}       GED-APP — Sauvegarde Complète                       ${NC}"
echo -e "${CYAN}       Date: $(date '+%d/%m/%Y %H:%M:%S')                  ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# ─── Vérifications préalables ────────────────────────────────────────────────
log "Vérification des prérequis..."

# Créer le dossier de sauvegarde
mkdir -p "$BACKUP_PATH"

# Vérifier que Docker est disponible
if ! command -v docker &>/dev/null; then
  error "Docker n'est pas installé ou non accessible"
  exit 1
fi

# Vérifier que le container PostgreSQL tourne
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_PG}$"; then
  error "Container '$CONTAINER_PG' n'est pas en cours d'exécution"
  error "Démarrez l'application avec: docker compose up -d"
  exit 1
fi

success "Prérequis OK"

# ─── 1. Sauvegarde PostgreSQL ────────────────────────────────────────────────
log "Sauvegarde de la base de données PostgreSQL..."

DUMP_FILE="$BACKUP_PATH/database.sql.gz"

docker run --rm \
  --network ged-app_ged-network \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:17.5-alpine \
  pg_dump -h "$CONTAINER_PG" -p 5432 -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl \
  | gzip > "$DUMP_FILE"

DB_SIZE=$(du -sh "$DUMP_FILE" | cut -f1)
success "Base de données sauvegardée → database.sql.gz ($DB_SIZE)"

# ─── 2. Sauvegarde des fichiers uploadés ─────────────────────────────────────
log "Sauvegarde des fichiers uploadés (uploads)..."

UPLOADS_FILE="$BACKUP_PATH/uploads.tar.gz"

# Copier les fichiers depuis le volume Docker via le container backend
if docker ps --format '{{.Names}}' | grep -q "ged-backend"; then
  docker exec ged-backend \
    bash -c "cd /app && tar czf - uploads/ 2>/dev/null || echo ''" \
    > "$UPLOADS_FILE" 2>/dev/null

  if [ -s "$UPLOADS_FILE" ]; then
    UPLOADS_SIZE=$(du -sh "$UPLOADS_FILE" | cut -f1)
    success "Uploads sauvegardés → uploads.tar.gz ($UPLOADS_SIZE)"
  else
    warn "Dossier uploads vide ou inaccessible (création d'une archive vide)"
    echo "" | gzip > "$UPLOADS_FILE"
  fi
else
  # Backup direct depuis le volume Docker
  docker run --rm \
    -v ged-app_uploads_data:/data \
    -v "$BACKUP_PATH":/backup \
    alpine tar czf /backup/uploads.tar.gz -C /data . 2>/dev/null || \
    { warn "Volume uploads non trouvé, archive vide créée"; echo "" | gzip > "$UPLOADS_FILE"; }

  UPLOADS_SIZE=$(du -sh "$UPLOADS_FILE" | cut -f1)
  success "Uploads sauvegardés → uploads.tar.gz ($UPLOADS_SIZE)"
fi

# ─── 3. Sauvegarde des signatures ────────────────────────────────────────────
log "Sauvegarde des signatures..."

SIGNATURES_FILE="$BACKUP_PATH/signatures.tar.gz"

if docker ps --format '{{.Names}}' | grep -q "ged-backend"; then
  docker exec ged-backend \
    bash -c "cd /app && tar czf - signatures/ 2>/dev/null || echo ''" \
    > "$SIGNATURES_FILE" 2>/dev/null

  if [ -s "$SIGNATURES_FILE" ]; then
    SIG_SIZE=$(du -sh "$SIGNATURES_FILE" | cut -f1)
    success "Signatures sauvegardées → signatures.tar.gz ($SIG_SIZE)"
  else
    warn "Dossier signatures vide (création d'une archive vide)"
    echo "" | gzip > "$SIGNATURES_FILE"
  fi
else
  docker run --rm \
    -v ged-app_signatures_data:/data \
    -v "$BACKUP_PATH":/backup \
    alpine tar czf /backup/signatures.tar.gz -C /data . 2>/dev/null || \
    { warn "Volume signatures non trouvé"; echo "" | gzip > "$SIGNATURES_FILE"; }

  SIG_SIZE=$(du -sh "$SIGNATURES_FILE" | cut -f1)
  success "Signatures sauvegardées → signatures.tar.gz ($SIG_SIZE)"
fi

# ─── 4. Fichier de métadonnées ───────────────────────────────────────────────
log "Génération des métadonnées..."

# Compter les éléments en DB
DB_STATS=$(docker run --rm \
  --network ged-app_ged-network \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:17.5-alpine \
  psql -h "$CONTAINER_PG" -p 5432 -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT json_build_object('documents',(SELECT COUNT(*) FROM documents),'users',(SELECT COUNT(*) FROM users),'patients_php',(SELECT COUNT(*) FROM php_patients),'consultations_php',(SELECT COUNT(*) FROM php_consultations))" \
  2>/dev/null | tr -d ' \n' || echo '{}')

cat > "$BACKUP_PATH/manifest.json" << EOF
{
  "version": "1.0",
  "app": "GED-APP",
  "date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "backup_name": "$BACKUP_NAME",
  "db_name": "$DB_NAME",
  "files": {
    "database": "database.sql.gz",
    "uploads": "uploads.tar.gz",
    "signatures": "signatures.tar.gz"
  },
  "stats": $DB_STATS
}
EOF

success "Manifest créé → manifest.json"

# ─── 5. Archive finale ───────────────────────────────────────────────────────
log "Création de l'archive finale..."

FINAL_ARCHIVE="$BACKUP_DIR/${BACKUP_NAME}.tar.gz"

tar czf "$FINAL_ARCHIVE" -C "$BACKUP_DIR" "$BACKUP_NAME"
rm -rf "$BACKUP_PATH"

FINAL_SIZE=$(du -sh "$FINAL_ARCHIVE" | cut -f1)
success "Archive finale créée: ${BACKUP_NAME}.tar.gz ($FINAL_SIZE)"

# ─── 6. Nettoyage des anciennes sauvegardes ──────────────────────────────────
if [ "$RETENTION_DAYS" -gt 0 ]; then
  log "Nettoyage des sauvegardes de plus de $RETENTION_DAYS jours..."
  DELETED=$(find "$BACKUP_DIR" -name "ged-backup_*.tar.gz" -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
  if [ "$DELETED" -gt 0 ]; then
    warn "$DELETED ancienne(s) sauvegarde(s) supprimée(s)"
  else
    log "Aucune ancienne sauvegarde à supprimer"
  fi
fi

# ─── Résumé ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ SAUVEGARDE TERMINÉE AVEC SUCCÈS${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "  📦 Fichier : ${YELLOW}${BACKUP_NAME}.tar.gz${NC}"
echo -e "  📁 Chemin  : ${YELLOW}$BACKUP_DIR/${NC}"
echo -e "  💾 Taille  : ${YELLOW}$FINAL_SIZE${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Pour restaurer : ${CYAN}./scripts/restore.sh $BACKUP_DIR/${BACKUP_NAME}.tar.gz${NC}"
echo ""
