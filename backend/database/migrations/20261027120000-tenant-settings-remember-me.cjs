'use strict';

// « Rester connecté sur cet appareil » : durée de la session (jours) quand la
// case est cochée à la connexion. 0 = option désactivée pour l'organisation.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const cols = await queryInterface.describeTable('tenant_settings');
    if (!cols.remember_me_days) {
      await queryInterface.addColumn('tenant_settings', 'remember_me_days', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 });
    }
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('tenant_settings', 'remember_me_days');
  },
};
