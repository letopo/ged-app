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
# À exécuter en root (les volumes Docker sous /var/lib/docker/volumes/ ne
# sont lisibles que par root). Installé via cron système à minuit.
set -euo pipefail

BACKUP_ROOT="/home/ged/backups"
RETENTION_DAYS=7
DATE=$(date +%F)
CUTOFF=$(date -d "-$RETENTION_DAYS days" +%F)
UPLOADS_VOLUME_PATH="/var/lib/docker/volumes/ged-app_uploads_data/_data"
SIGNATURES_VOLUME_PATH="/var/lib/docker/volumes/ged-app_signatures_data/_data"

mkdir -p "$BACKUP_ROOT/db" "$BACKUP_ROOT/uploads" "$BACKUP_ROOT/signatures"
LOG="$BACKUP_ROOT/backup-$DATE.log"
exec > "$LOG" 2>&1

echo "=== Sauvegarde nocturne $DATE ==="
date

echo "-> Dump de la base de donnees..."
docker exec ged-postgres pg_dump -U ged_user -d ged_db --clean --if-exists \
  | gzip > "$BACKUP_ROOT/db/ged_db_$DATE.sql.gz"
echo "   taille : $(du -h "$BACKUP_ROOT/db/ged_db_$DATE.sql.gz" | cut -f1)"

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

snapshot_incremental "$UPLOADS_VOLUME_PATH" "$BACKUP_ROOT/uploads" "uploads"
snapshot_incremental "$SIGNATURES_VOLUME_PATH" "$BACKUP_ROOT/signatures" "signatures"

echo "-> Purge des sauvegardes anterieures a $CUTOFF (retention : $RETENTION_DAYS jours)..."
find "$BACKUP_ROOT/db" -name "ged_db_*.sql.gz" | while read -r f; do
  d=$(basename "$f" | sed -E 's/^ged_db_([0-9-]+)\.sql\.gz$/\1/')
  if [[ "$d" < "$CUTOFF" ]]; then
    echo "   suppression $f"
    rm -f "$f"
  fi
done
for dir in "$BACKUP_ROOT/uploads" "$BACKUP_ROOT/signatures"; do
  find "$dir" -maxdepth 1 -mindepth 1 -type d | while read -r d; do
    if [[ "$(basename "$d")" < "$CUTOFF" ]]; then
      echo "   suppression $d"
      rm -rf "$d"
    fi
  done
done
find "$BACKUP_ROOT" -maxdepth 1 -name "backup-*.log" | while read -r f; do
  d=$(basename "$f" | sed -E 's/^backup-([0-9-]+)\.log$/\1/')
  if [[ "$d" < "$CUTOFF" ]]; then
    rm -f "$f"
  fi
done

echo "=== Termine ==="
df -h / | tail -1
