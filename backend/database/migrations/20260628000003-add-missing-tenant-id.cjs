'use strict';

const HSJM_TENANT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';

// Tables auxquelles il manque la colonne tenant_id
const MISSING_TABLES = [
  'workflow_templates',
  'audit_logs',
  'compta_docs',
  'equipements',
  'forms',
  'interventions',
  'notification_preferences',
  'php_infirmeries',
  'php_patients',
  'php_secteurs',
  'plans_maintenance',
  'template_permissions',
  'chat_conversations',
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const table of MISSING_TABLES) {
      // Ignorer les tables qui n'existent pas du tout dans cette base
      // (modules non installés/désactivés selon les déploiements).
      const [tables] = await queryInterface.sequelize.query(
        `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='${table}'`
      );
      if (tables.length === 0) {
        console.log(`  ⏭  ${table}: table introuvable, ignorée`);
        continue;
      }

      // Vérifier si la colonne existe déjà
      const [cols] = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = '${table}' AND column_name = 'tenant_id'`
      );
      if (cols.length > 0) {
        console.log(`  ⏭  ${table}: tenant_id déjà présent`);
        continue;
      }

      // Ajouter nullable d'abord
      await queryInterface.addColumn(table, 'tenant_id', {
        type: Sequelize.UUID,
        allowNull: true,
      });

      // Remplir avec le tenant HSJM
      await queryInterface.sequelize.query(
        `UPDATE "${table}" SET tenant_id = '${HSJM_TENANT_ID}'`
      );

      // Rendre NOT NULL
      await queryInterface.sequelize.query(
        `ALTER TABLE "${table}" ALTER COLUMN tenant_id SET NOT NULL`
      );

      // Index
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "idx_${table}_tenant_id" ON "${table}" (tenant_id)`
      );

      console.log(`  ✅ ${table}: tenant_id ajouté`);
    }
  },

  down: async (queryInterface) => {
    for (const table of MISSING_TABLES) {
      try {
        await queryInterface.removeColumn(table, 'tenant_id');
      } catch (_) {}
    }
  }
};
