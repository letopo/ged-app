'use strict';

// Réglages généraux d'un tenant (Paramètres › Délais et session) : délai
// d'expiration des validations, seuil « en retard », déconnexion après
// inactivité, durée de session, taille maximale des fichiers. Sans ligne pour
// un tenant, les valeurs par défaut (utils/tenantSettings.js) s'appliquent.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('tenant_settings')) {
      console.log('ℹ️  tenant_settings existe déjà, rien à faire.');
      return;
    }
    await queryInterface.createTable('tenant_settings', {
      id:                     { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id:              { type: Sequelize.UUID, allowNull: false, unique: true, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
      workflow_deadline_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 7 },
      late_days:              { type: Sequelize.INTEGER, allowNull: false, defaultValue: 2 },
      session_idle_minutes:   { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
      session_max_days:       { type: Sequelize.INTEGER, allowNull: false, defaultValue: 7 },
      max_upload_mb:          { type: Sequelize.INTEGER, allowNull: false, defaultValue: 50 },
      updated_by:             { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at:             { type: Sequelize.DATE, allowNull: false },
      updated_at:             { type: Sequelize.DATE, allowNull: false },
    });
    console.log('✅ Table tenant_settings créée');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tenant_settings');
  },
};
