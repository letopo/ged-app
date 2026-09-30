#!/bin/bash
# scripts/restore-nightly.sh
# Restauration à partir des sauvegardes nocturnes (scripts/backup-nightly.sh) :
#   backups/db/ged_db_AAAA-MM-JJ.sql.gz, backups/uploads/AAAA-MM-JJ/,
#   backups/signatures/AAAA-MM-JJ/.
#
# Usage (en root, depuis n'importe quel dossier) :
#   restore-nightly.sh --list                 points de restauration disponibles
#   restore-nightly.sh --test AAAA-MM-JJ      restauration d'essai, SANS toucher à la production
#   restore-nightly.sh AAAA-MM-JJ [--db-only | --files-only]
#                                             restauration réelle (demande confirmation)
#
# Avant une restauration réelle, l'état actuel (base + fichiers) est lui-même
# sauvegardé dans backups/avant-restauration-<date-heure>/ : on peut revenir
# en arrière si la restauration n'était pas la bonne.
# Mode d'emploi détaillé : scripts/RESTAURATION.md
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/home/ged/backups}"
UPLOADS_VOLUME_PATH="/var/lib/docker/volumes/ged-app_uploads_data/_data"
SIGNATURES_VOLUME_PATH="/var/lib/docker/volumes/ged-app_signatures_data/_data"
DB_CONTAINER="ged-postgres"
BACKEND_CONTAINER="ged-backend"
DB_USER="ged_user"
DB_NAME="ged_db"
TEST_CONTAINER="ged-restore-test"

die() { echo "❌ $*" >&2; exit 1; }

[ "$(id -u)" = "0" ] || die "À lancer en root : sudo $0 $*"

dump_of()  { echo "$BACKUP_ROOT/db/ged_db_$1.sql.gz"; }
files_of() { echo "$BACKUP_ROOT/uploads/$1"; }
sigs_of()  { echo "$BACKUP_ROOT/signatures/$1"; }

# Comptages comparables entre la production et une base restaurée
COUNTS_SQL="select (select count(*) from information_schema.tables where table_schema='public') as tables,
  (select count(*) from documents) as documents, (select count(*) from workflows) as workflows,
  (select count(*) from users) as utilisateurs, (select max(created_at) from documents) as dernier_document"

check_date() {
  [[ "$1" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || die "Date attendue au format AAAA-MM-JJ (ex. 2026-09-30)."
  [ -f "$(dump_of "$1")" ] || die "Aucune sauvegarde de base pour le $1. Voir : $0 --list"
}

list_points() {
  echo "Points de restauration dans $BACKUP_ROOT :"
  printf "  %-12s %-10s %-10s %s\n" "DATE" "BASE" "DOCUMENTS" "SIGNATURES"
  for f in $(ls "$BACKUP_ROOT"/db/ged_db_*.sql.gz 2>/dev/null | sort -r); do
    local d; d=$(basename "$f" | sed -E 's/^ged_db_([0-9-]+)\.sql\.gz$/\1/')
    local nu="absent" ns="absent"
    [ -d "$(files_of "$d")" ] && nu="$(find "$(files_of "$d")" -type f | wc -l) fich."
    [ -d "$(sigs_of "$d")" ] && ns="$(find "$(sigs_of "$d")" -type f | wc -l) fich."
    printf "  %-12s %-10s %-10s %s\n" "$d" "$(du -h "$f" | cut -f1)" "$nu" "$ns"
  done
}

# Restauration d'essai : la base dans un conteneur PostgreSQL jetable, isolé du
# réseau ; les fichiers sont seulement contrôlés (lecture). Rien n'est modifié.
test_restore() {
  local d="$1" dump; dump=$(dump_of "$d")
  echo "== Essai de restauration du $d (la production n'est pas touchée)"
  echo "-> Archive : $(du -h "$dump" | cut -f1)"
  gzip -t "$dump" && echo "   lisible"
  docker rm -f "$TEST_CONTAINER" >/dev/null 2>&1 || true
  trap 'docker rm -f "$TEST_CONTAINER" >/dev/null 2>&1 || true' EXIT
  local image; image=$(docker inspect -f '{{.Config.Image}}' "$DB_CONTAINER")
  docker run -d --name "$TEST_CONTAINER" --network none \
    -e POSTGRES_USER="$DB_USER" -e POSTGRES_PASSWORD=essai -e POSTGRES_DB="$DB_NAME" "$image" >/dev/null
  for _ in $(seq 1 60); do docker exec "$TEST_CONTAINER" pg_isready -U "$DB_USER" -q 2>/dev/null && break; sleep 1; done
  sleep 2
  echo "-> Restauration de la base dans un conteneur temporaire..."
  local errors
  errors=$(zcat "$dump" | docker exec -i "$TEST_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q 2>&1 | grep -ci "error" || true)
  echo "   erreurs : $errors"
  echo "-> Comparaison (tables | documents | workflows | utilisateurs | dernier document) :"
  echo "   sauvegarde du $d : $(docker exec "$TEST_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tA -c "$COUNTS_SQL")"
  echo "   production       : $(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tA -c "$COUNTS_SQL")"
  echo "-> Fichiers :"
  if [ -d "$(files_of "$d")" ]; then
    local nf missing=0 f
    nf=$(find "$(files_of "$d")" -type f | wc -l)
    # Chaque fichier référencé par un document de la sauvegarde existe-t-il dans le snapshot ?
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      [ -f "$(files_of "$d")/${f#uploads/}" ] || missing=$((missing + 1))
    done < <(docker exec "$TEST_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tA -c \
      "select regexp_replace(file_path, '^.*?uploads/', '') from documents where file_path is not null and file_path <> ''")
    echo "   $nf fichiers dans le snapshot ; documents de la base sans fichier : $missing"
  else
    echo "   ⚠️  pas de snapshot de fichiers pour le $d"
  fi
  [ "$errors" = "0" ] && echo "✅ Essai réussi : cette sauvegarde est restaurable." || die "L'essai a produit des erreurs : ne pas utiliser cette sauvegarde sans examen."
}

real_restore() {
  local d="$1" mode="$2" stamp safety
  local do_db=true do_files=true
  [ "$mode" = "--db-only" ] && do_files=false
  [ "$mode" = "--files-only" ] && do_db=false
  if $do_files; then [ -d "$(files_of "$d")" ] || die "Pas de snapshot de fichiers pour le $d."; fi

  echo "⚠️  RESTAURATION RÉELLE du $d ($($do_db && echo "base") $($do_files && echo "fichiers"))"
  echo "    Tout ce qui a été créé ou modifié depuis le $d sera PERDU"
  echo "    (une copie de l'état actuel est faite juste avant)."
  echo "    La GED sera indisponible pendant l'opération."
  read -r -p "    Tapez RESTAURER pour continuer : " answer
  [ "$answer" = "RESTAURER" ] || die "Abandon, rien n'a été modifié."

  stamp=$(date +%Y%m%d-%H%M%S)
  safety="$BACKUP_ROOT/avant-restauration-$stamp"
  mkdir -p "$safety"
  echo "-> Copie de sécurité de l'état actuel dans $safety ..."
  docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists | gzip > "$safety/ged_db.sql.gz"
  gzip -t "$safety/ged_db.sql.gz"
  if $do_files; then
    local last; last=$(ls -d "$BACKUP_ROOT"/uploads/*/ 2>/dev/null | sort | tail -1)
    rsync -a ${last:+--link-dest="$last"} "$UPLOADS_VOLUME_PATH/" "$safety/uploads/"
    rsync -a "$SIGNATURES_VOLUME_PATH/" "$safety/signatures/"
  fi

  echo "-> Arrêt du serveur de la GED..."
  docker stop "$BACKEND_CONTAINER" >/dev/null
  trap 'echo "-> Redémarrage du serveur..."; docker start "$BACKEND_CONTAINER" >/dev/null' EXIT

  if $do_db; then
    echo "-> Restauration de la base..."
    zcat "$(dump_of "$d")" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q -v ON_ERROR_STOP=1 >/dev/null
  fi
  if $do_files; then
    echo "-> Restauration des documents et signatures..."
    rsync -a --delete "$(files_of "$d")/" "$UPLOADS_VOLUME_PATH/"
    [ -d "$(sigs_of "$d")" ] && rsync -a --delete "$(sigs_of "$d")/" "$SIGNATURES_VOLUME_PATH/"
  fi

  docker start "$BACKEND_CONTAINER" >/dev/null
  trap - EXIT
  echo "-> Attente du redémarrage..."
  for _ in $(seq 1 60); do
    [ "$(docker inspect -f '{{.State.Health.Status}}' "$BACKEND_CONTAINER" 2>/dev/null)" = "healthy" ] && break
    sleep 2
  done
  echo "   état du serveur : $(docker inspect -f '{{.State.Health.Status}}' "$BACKEND_CONTAINER")"
  echo "✅ Restauration du $d terminée."
  echo "   En cas d'erreur, revenir à l'état d'avant : voir « Annuler une restauration » dans scripts/RESTAURATION.md"
  echo "   (copie de sécurité : $safety)"
}

case "${1:-}" in
  --list|"") list_points ;;
  --test) [ -n "${2:-}" ] || die "Usage : $0 --test AAAA-MM-JJ"; check_date "$2"; test_restore "$2" ;;
  -*) die "Option inconnue : $1" ;;
  *) check_date "$1"; case "${2:-}" in ""|--db-only|--files-only) ;; *) die "Option inconnue : $2" ;; esac
     real_restore "$1" "${2:-}" ;;
esac
