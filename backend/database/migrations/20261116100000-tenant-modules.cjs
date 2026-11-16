'use strict';

// Modules activables par tenant (16/11/2026, cf. src/config/modules.js).
// Une ligne par (tenant, module) dès qu'un module a été réglé :
//   enabled  module allumé ou éteint
//   granted  accordé par le super-administrateur, même hors licence
// Sans ligne : le module est actif s'il est inclus dans la licence.
//
// Les établissements qui existent déjà gardent tout : chaque module y est
// accordé et actif, indépendamment de la licence (et de son échéance).
const MODULE_KEYS = [
  'modeles', 'discussion', 'calendrier', 'scanner', 'signature_patient',
  'personnel', 'plannings', 'rh_documents',
  'achats', 'compta', 'sage', 'caisse_pharmacie',
  'php', 'dme', 'bloc', 'affichage',
  'travaux', 'gmao', 'vehicules', 'trello',
  'ia', 'statistiques', 'evenements',
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('tenant_modules')) return;

    await queryInterface.createTable('tenant_modules', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
      module_key: { type: Sequelize.STRING(40), allowNull: false },
      enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      granted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      updated_by: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tenant_modules', ['tenant_id', 'module_key'], { unique: true });

    const [tenants] = await queryInterface.sequelize.query('SELECT id FROM tenants');
    const now = new Date();
    const rows = [];
    for (const t of tenants) {
      for (const key of MODULE_KEYS) {
        rows.push({ id: require('crypto').randomUUID(), tenant_id: t.id, module_key: key, enabled: true, granted: true, created_at: now, updated_at: now });
      }
    }
    if (rows.length) await queryInterface.bulkInsert('tenant_modules', rows);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tenant_modules');
  },
};
