'use strict';

// Sessions : version des jetons de l'utilisateur. Incrémentée à la
// désactivation et au changement / à la réinitialisation du mot de passe,
// elle invalide tous les jetons émis avant (API et temps réel).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const cols = await queryInterface.describeTable('users');
    if (!cols.token_version) {
      await queryInterface.addColumn('users', 'token_version', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    }
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'token_version');
  },
};
