'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'totp_secret', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('users', 'totp_enabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
    console.log('✅ Colonnes 2FA ajoutées à users');
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'totp_secret');
    await queryInterface.removeColumn('users', 'totp_enabled');
  }
};
