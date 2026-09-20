'use strict';

// UUID fixe du tenant HSJM — utilisé ici ET dans le seeder createHSJMTenant.js
const HSJM_TENANT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';

// Tables "racines" interrogées directement (les tables enfants sont isolées via FK parent)
const ROOT_TABLES = [
  'users',
  'documents',
  'workflows',
  'services',
  'motifs',
  'employees',
  'tickets',
  'positions',
  'departments',
  'shift_types',
  'schedules',
  'invoice_folders',
  'demandes_achats',
  'equipements',
  'plans_maintenance',
  'interventions',
  'compta_docs',
  'php_infirmeries',
  'php_secteurs',
  'php_patients',
  'php_factures',
  'trello_boards',
  'forms',
  'postes',
  'ordre_mission_types',
  'chat_conversations',
  'audit_logs',
  'workflow_templates',
  'notification_preferences',
  'template_permissions',
  'licenses',
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Insérer le tenant HSJM (premier client)
    await queryInterface.bulkInsert('tenants', [{
      id: HSJM_TENANT_ID,
      name: 'HSJM',
      domain: 'ged.hsjmcam.net',
      slug: 'hsjm',
      is_active: true,
      admin_email: 'aureleyankeu@gmail.com',
      created_at: new Date(),
      updated_at: new Date()
    }]);
    console.log(`✅ Tenant HSJM créé (${HSJM_TENANT_ID})`);

    // 2. Ajouter tenant_id à chaque table racine
    for (const table of ROOT_TABLES) {
      // Vérifier que la table existe
      const [tables] = await queryInterface.sequelize.query(
        `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='${table}'`
      );
      if (tables.length === 0) {
        console.log(`⚠️  Table ${table} introuvable, ignorée`);
        continue;
      }

      // Ajouter la colonne nullable
      await queryInterface.addColumn(table, 'tenant_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onDelete: 'CASCADE'
      });

      // Migrer les données existantes vers HSJM
      await queryInterface.sequelize.query(
        `UPDATE "${table}" SET tenant_id = '${HSJM_TENANT_ID}'`
      );

      // Rendre NOT NULL
      await queryInterface.changeColumn(table, 'tenant_id', {
        type: Sequelize.UUID,
        allowNull: false
      });

      // Ajouter un index pour les performances
      await queryInterface.addIndex(table, ['tenant_id'], {
        name: `${table}_tenant_id_idx`
      });

      console.log(`✅ tenant_id ajouté → ${table}`);
    }
  },

  down: async (queryInterface) => {
    for (const table of ROOT_TABLES) {
      try {
        await queryInterface.removeIndex(table, `${table}_tenant_id_idx`);
        await queryInterface.removeColumn(table, 'tenant_id');
      } catch (e) { /* ignore */ }
    }
    await queryInterface.bulkDelete('tenants', { id: HSJM_TENANT_ID });
  }
};
