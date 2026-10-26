#!/usr/bin/env bash
# Instantané de la STRUCTURE de la base de développement (aucune donnée, sauf
# la liste des migrations passées) pour les tests d'intégration :
# tests/fixtures/schema.sql. Les migrations plus récentes sont appliquées par
# les tests eux-mêmes ; relancer ce script de temps en temps.
#   Usage (depuis backend/) : ./scripts/dump-test-schema.sh [conteneur postgres]
set -euo pipefail
cd "$(dirname "$0")/.."
PG="${1:-ged-postgres}"
DB="${DB_NAME:-ged_db}"
USER_="${DB_USER:-ged_user}"
OUT=tests/fixtures/schema.sql
{
  echo "-- Généré par scripts/dump-test-schema.sh le $(date +%F) — structure seule, aucune donnée."
  docker exec "$PG" pg_dump -U "$USER_" -d "$DB" --schema-only --no-owner --no-privileges
  docker exec "$PG" pg_dump -U "$USER_" -d "$DB" --data-only --inserts --no-owner -t '"SequelizeMeta"'
} | grep -v '^\\' > "$OUT"
echo "✅ $OUT ($(wc -l < "$OUT") lignes)"
