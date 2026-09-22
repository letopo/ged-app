'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('users');
    if (table.lang) {
      console.log('ℹ️  users.lang existe déjà, rien à faire.');
      return;
    }
    await queryInterface.addColumn('users', 'lang', {
      type: Sequelize.STRING(5),
      allowNull: false,
      defaultValue: 'fr',
    });
    console.log('✅ Colonne lang ajoutée sur users');
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'lang');
  },
};
