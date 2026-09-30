'use strict';

// Intégrations propres à chaque tenant (Paramètres › IA · OCR et › Intégrations) :
// une ligne par tenant et par intégration (`kind` : 'ai', 'sage').
// `config` : réglages non secrets ; `secret_encrypted` : clé d'API ou mot de
// passe, chiffré (utils/secretBox.js).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('tenant_integrations')) {
      console.log('ℹ️  tenant_integrations existe déjà, rien à faire.');
      return;
    }
    await queryInterface.createTable('tenant_integrations', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id:        { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
      kind:             { type: Sequelize.STRING(20), allowNull: false },
      enabled:          { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      config:           { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      secret_encrypted: { type: Sequelize.TEXT, allowNull: true },
      admin_can_manage: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      last_test_at:     { type: Sequelize.DATE, allowNull: true },
      last_test_ok:     { type: Sequelize.BOOLEAN, allowNull: true },
      last_test_error:  { type: Sequelize.TEXT, allowNull: true },
      last_run_at:      { type: Sequelize.DATE, allowNull: true },
      last_run_ok:      { type: Sequelize.BOOLEAN, allowNull: true },
      last_run_message: { type: Sequelize.TEXT, allowNull: true },
      updated_by:       { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at:       { type: Sequelize.DATE, allowNull: false },
      updated_at:       { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tenant_integrations', ['tenant_id', 'kind'], { unique: true, name: 'tenant_integrations_tenant_kind' });
    console.log('✅ Table tenant_integrations créée');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tenant_integrations');
  },
};
