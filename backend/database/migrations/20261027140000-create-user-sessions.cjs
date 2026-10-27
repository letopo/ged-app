'use strict';

// Appareils connectés : une ligne par connexion (jeton de session sid).
// Permet d'afficher les appareils d'un compte (navigateur, système, IP,
// dates) et d'en déconnecter un à distance. Pas de tenant_id : une session
// appartient à un utilisateur, et elle doit être lisible hors contexte
// d'établissement (super-admin, temps réel).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('user_sessions')) return;
    await queryInterface.createTable('user_sessions', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id:      { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      remember:     { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ip:           { type: Sequelize.STRING(64), allowNull: true },
      user_agent:   { type: Sequelize.TEXT, allowNull: true },
      last_seen_at: { type: Sequelize.DATE, allowNull: false },
      expires_at:   { type: Sequelize.DATE, allowNull: false },
      revoked_at:   { type: Sequelize.DATE, allowNull: true },
      created_at:   { type: Sequelize.DATE, allowNull: false },
      updated_at:   { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('user_sessions', ['user_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('user_sessions');
  },
};
