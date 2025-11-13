#!/bin/bash
set -e

echo "🔍 Attente de PostgreSQL..."
until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
  echo "⏳ PostgreSQL indisponible - attente..."
  sleep 2
done

echo "✅ PostgreSQL est prêt !"
echo "📊 Exécution des migrations..."

# Exécuter les migrations
if npx sequelize-cli db:migrate --env production; then
  echo "✅ Migrations exécutées avec succès"
else
  echo "❌ Erreur lors de l'exécution des migrations"
  exit 1
fi

echo "🌱 Exécution des seeders..."
# Exécuter les seeders (uniquement si nécessaire)
if npx sequelize-cli db:seed:all --env production 2>/dev/null; then
  echo "✅ Seeders exécutés avec succès"
else
  echo "ℹ️  Pas de nouveaux seeders à exécuter"
fi

echo "🚀 Démarrage de l'application..."
exec "$@"