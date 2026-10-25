'use strict';

// Parc véhicules : le superadmin voit toujours le module ; les administrateurs
// seulement s'il le leur ouvre (réglage par organisation, fermé par défaut).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const cols = await queryInterface.describeTable('tenant_settings');
    if (!cols.fleet_admin_access) {
      await queryInterface.addColumn('tenant_settings', 'fleet_admin_access', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    }
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('tenant_settings', 'fleet_admin_access');
  },
};
