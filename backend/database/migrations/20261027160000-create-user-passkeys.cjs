'use strict';

// Connexion sans mot de passe (passkeys / WebAuthn) : empreinte, Face ID ou
// code PIN de l'appareil. Facultatif, une ligne par appareil enregistré ; le
// mot de passe reste toujours valable. Pas de tenant_id : la connexion
// retrouve la clé par son identifiant, puis vérifie l'établissement du compte.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('user_passkeys')) return;
    await queryInterface.createTable('user_passkeys', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id:       { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      credential_id: { type: Sequelize.TEXT, allowNull: false, unique: true },
      public_key:    { type: Sequelize.TEXT, allowNull: false },
      counter:       { type: Sequelize.BIGINT, allowNull: false, defaultValue: 0 },
      transports:    { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      name:          { type: Sequelize.STRING(120), allowNull: true },
      last_used_at:  { type: Sequelize.DATE, allowNull: true },
      created_at:    { type: Sequelize.DATE, allowNull: false },
      updated_at:    { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('user_passkeys', ['user_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('user_passkeys');
  },
};
