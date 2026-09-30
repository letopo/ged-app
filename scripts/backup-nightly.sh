#!/bin/bash
# scripts/backup-nightly.sh
# Sauvegarde nocturne de ged-app : dump complet de la base de données +
# snapshot incrémentiel (rsync + liens durs) des fichiers uploadés et des
# signatures/cachets. Chaque snapshot dans backups/uploads/AAAA-MM-JJ/ est
# une vue complète et autonome de ce jour-là (facile à restaurer : il suffit
# de ce dossier), mais ne consomme sur le disque que l'espace des fichiers
# nouveaux/modifiés par rapport à la veille (les fichiers identiques sont
# des liens durs vers la veille, donc gratuits en espace disque).
#
# Conservation (base, fichiers et journaux) :
#   - chaque jour pendant 7 jours ;
#   - le dimanche pendant 5 semaines ;
#   - le 1er du mois pendant 6 mois.
#
# Chaque sauvegarde est vérifiée (archive lisible, même nombre de fichiers que
# la source) et son résultat écrit dans $STATUS_DIR/status.json, lu par la GED
# (GET /api/system/backup-status) qui alerte les administrateurs sur l'Accueil
# en cas d'échec, d'absence de sauvegarde ou de disque presque plein.
#
# Restauration : scripts/restore-nightly.sh (voir scripts/RESTAURATION.md).
#
# À exécuter en root (les volumes Docker sous /var/lib/docker/volumes/ ne
# sont lisibles que par root). Installé via cron système à minuit.
set -Eeuo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/home/ged/backups}"
STATUS_DIR="${STATUS_DIR:-/home/ged/ged-app/backup-status}"
KEEP_DAILY_DAYS=7
KEEP_WEEKLY_DAYS=35
KEEP_MONTHLY_DAYS=183
DATE=$(date +%F)
UPLOADS_VOLUME_PATH="/var/lib/docker/volumes/ged-app_uploads_data/_data"
SIGNATURES_VOLUME_PATH="/var/lib/docker/volumes/ged-app_signatures_data/_data"

mkdir -p "$BACKUP_ROOT/db" "$BACKUP_ROOT/uploads" "$BACKUP_ROOT/signatures" "$STATUS_DIR"
LOG="$BACKUP_ROOT/backup-$DATE.log"
exec > "$LOG" 2>&1

STEP="démarrage"
STARTED_AT=$(date -Iseconds)
DB_SIZE=""; UPLOADS_FILES=""; SIGNATURES_FILES=""

# État lu par la GED : écrit à la fin (succès) ou dès la première erreur.
write_status() {
  local ok="$1" message="$2"
  local disk_pct
  disk_pct=$(df --output=pcent / | tail -1 | tr -dc '0-9')
  OK="$ok" MESSAGE="$message" STEP="$STEP" STARTED_AT="$STARTED_AT" DATE="$DATE" \
  DB_SIZE="$DB_SIZE" UPLOADS_FILES="$UPLOADS_FILES" SIGNATURES_FILES="$SIGNATURES_FILES" \
  DISK_PCT="$disk_pct" LOG="$LOG" BACKUP_ROOT="$BACKUP_ROOT" \
  python3 - > "$STATUS_DIR/status.json.tmp" <<'PY'
import json, os, glob
from datetime import datetime
e = os.environ
root = e["BACKUP_ROOT"]
days = sorted(os.path.basename(p)[7:17] for p in glob.glob(f"{root}/db/ged_db_*.sql.gz"))
print(json.dumps({
    "ok": e["OK"] == "true",
    "date": e["DATE"],
    "startedAt": e["STARTED_AT"],
    "finishedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
    "step": e["STEP"],
    "message": e["MESSAGE"],
    "dbSize": e["DB_SIZE"] or None,
    "uploadsFiles": int(e["UPLOADS_FILES"]) if e["UPLOADS_FILES"] else None,
    "signaturesFiles": int(e["SIGNATURES_FILES"]) if e["SIGNATURES_FILES"] else None,
    "diskUsedPercent": int(e["DISK_PCT"]) if e["DISK_PCT"] else None,
    "restorePoints": len(days),
    "oldestRestorePoint": days[0] if days else None,
    "log": e["LOG"],
}, ensure_ascii=False, indent=2))
PY
  mv "$STATUS_DIR/status.json.tmp" "$STATUS_DIR/status.json"
  chmod 644 "$STATUS_DIR/status.json"
}

on_error() {
  local code=$?
  echo "!!! ECHEC (code $code) pendant l'etape : $STEP"
  write_status false "Échec pendant l'étape « $STEP » (code $code). Voir $LOG." || true
  exit "$code"
}
trap on_error ERR

echo "=== Sauvegarde nocturne $DATE ==="
date

STEP="dump de la base de données"
echo "-> Dump de la base de donnees..."
docker exec ged-postgres pg_dump -U ged_user -d ged_db --clean --if-exists \
  | gzip > "$BACKUP_ROOT/db/ged_db_$DATE.sql.gz"
STEP="vérification du dump"
gzip -t "$BACKUP_ROOT/db/ged_db_$DATE.sql.gz"
zcat "$BACKUP_ROOT/db/ged_db_$DATE.sql.gz" | tail -5 | grep -q "PostgreSQL database dump complete"
DB_SIZE=$(du -h "$BACKUP_ROOT/db/ged_db_$DATE.sql.gz" | cut -f1)
echo "   taille : $DB_SIZE (archive verifiee)"

snapshot_incremental() {
  local src="$1" dest_root="$2" label="$3"
  local last
  last=$(find "$dest_root" -maxdepth 1 -mindepth 1 -type d ! -name "$DATE" 2>/dev/null | sort | tail -1 || true)
  echo "-> Snapshot incrementiel : $label..."
  if [ -n "$last" ]; then
    echo "   (base : $(basename "$last"))"
    rsync -a --delete --link-dest="$last" "$src/" "$dest_root/$DATE/"
  else
    echo "   (premier snapshot, pas de base)"
    rsync -a "$src/" "$dest_root/$DATE/"
  fi
  echo "   taille totale du snapshot : $(du -sh "$dest_root/$DATE" | cut -f1)"
}

# Même nombre de fichiers dans la source et le snapshot, sinon échec. Un
# document ajouté pendant la copie fausserait le compte : on refait alors une
# passe rsync (rapide, seuls les écarts sont copiés) avant de conclure.
count_and_check() {
  local src="$1" snap="$2" attempt n_src n_snap
  for attempt in 1 2; do
    n_src=$(find "$src" -type f | wc -l)
    n_snap=$(find "$snap" -type f | wc -l)
    if [ "$n_src" -eq "$n_snap" ]; then
      echo "$n_snap"
      return 0
    fi
    echo "   ecart : $n_src fichiers dans la source, $n_snap dans la sauvegarde (passe $attempt)" >&2
    [ "$attempt" = 1 ] && rsync -a --delete "$src/" "$snap/"
  done
  return 1
}

STEP="copie des documents"
snapshot_incremental "$UPLOADS_VOLUME_PATH" "$BACKUP_ROOT/uploads" "uploads"
STEP="vérification des documents"
UPLOADS_FILES=$(count_and_check "$UPLOADS_VOLUME_PATH" "$BACKUP_ROOT/uploads/$DATE")
echo "   $UPLOADS_FILES fichiers (identique a la source)"

STEP="copie des signatures"
snapshot_incremental "$SIGNATURES_VOLUME_PATH" "$BACKUP_ROOT/signatures" "signatures"
STEP="vérification des signatures"
SIGNATURES_FILES=$(count_and_check "$SIGNATURES_VOLUME_PATH" "$BACKUP_ROOT/signatures/$DATE")
echo "   $SIGNATURES_FILES fichiers (identique a la source)"

# Faut-il garder la sauvegarde du jour $1 (AAAA-MM-JJ) ?
keep_day() {
  local d="$1" age
  age=$(( ( $(date -d "$DATE" +%s) - $(date -d "$d" +%s) ) / 86400 ))
  [ "$age" -lt "$KEEP_DAILY_DAYS" ] && return 0
  [ "$age" -lt "$KEEP_WEEKLY_DAYS" ] && [ "$(date -d "$d" +%u)" = "7" ] && return 0
  [ "$age" -lt "$KEEP_MONTHLY_DAYS" ] && [ "$(date -d "$d" +%d)" = "01" ] && return 0
  return 1
}

STEP="purge des anciennes sauvegardes"
echo "-> Purge (7 jours + dimanches 5 semaines + 1er du mois 6 mois)..."
find "$BACKUP_ROOT/db" -name "ged_db_*.sql.gz" | while read -r f; do
  d=$(basename "$f" | sed -E 's/^ged_db_([0-9-]+)\.sql\.gz$/\1/')
  if ! keep_day "$d"; then
    echo "   suppression $f"
    rm -f "$f"
  fi
done
for dir in "$BACKUP_ROOT/uploads" "$BACKUP_ROOT/signatures"; do
  find "$dir" -maxdepth 1 -mindepth 1 -type d | while read -r d; do
    if ! keep_day "$(basename "$d")"; then
      echo "   suppression $d"
      rm -rf "$d"
    fi
  done
done
find "$BACKUP_ROOT" -maxdepth 1 -name "backup-*.log" | while read -r f; do
  d=$(basename "$f" | sed -E 's/^backup-([0-9-]+)\.log$/\1/')
  if ! keep_day "$d"; then
    rm -f "$f"
  fi
done
echo "   points de restauration conserves : $(ls "$BACKUP_ROOT/db" | wc -l)"

STEP="terminé"
write_status true "Sauvegarde complète et vérifiée."
echo "=== Termine ==="
df -h / | tail -1
