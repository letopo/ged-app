'use strict';

// Réglages de messagerie (SMTP) propres à chaque tenant, modifiables depuis
// Paramètres › Messagerie. Sans ligne pour un tenant, l'envoi retombe sur la
// configuration du serveur (.env : SMTP_*, WORKFLOW_ENABLE_NOTIFICATIONS).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('tenant_mail_settings')) {
      console.log('ℹ️  tenant_mail_settings existe déjà, rien à faire.');
      return;
    }
    await queryInterface.createTable('tenant_mail_settings', {
      id:                 { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id:          { type: Sequelize.UUID, allowNull: false, unique: true, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
      enabled:            { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      host:               { type: Sequelize.STRING(255), allowNull: true },
      port:               { type: Sequelize.INTEGER, allowNull: true },
      security:           { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'starttls' }, // none | starttls | ssl
      username:           { type: Sequelize.STRING(255), allowNull: true },
      password_encrypted: { type: Sequelize.TEXT, allowNull: true },
      from_name:          { type: Sequelize.STRING(150), allowNull: true },
      from_email:         { type: Sequelize.STRING(255), allowNull: true },
      reply_to:           { type: Sequelize.STRING(255), allowNull: true },
      admin_can_manage:   { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      last_test_at:       { type: Sequelize.DATE, allowNull: true },
      last_test_ok:       { type: Sequelize.BOOLEAN, allowNull: true },
      last_test_error:    { type: Sequelize.TEXT, allowNull: true },
      last_sent_at:       { type: Sequelize.DATE, allowNull: true },
      last_error_at:      { type: Sequelize.DATE, allowNull: true },
      last_error:         { type: Sequelize.TEXT, allowNull: true },
      updated_by:         { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at:         { type: Sequelize.DATE, allowNull: false },
      updated_at:         { type: Sequelize.DATE, allowNull: false },
    });
    console.log('✅ Table tenant_mail_settings créée');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tenant_mail_settings');
  },
};
