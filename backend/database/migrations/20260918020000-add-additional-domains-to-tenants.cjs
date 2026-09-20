'use strict';

// Permet à un tenant d'être accessible par plusieurs noms/IP (ex: à la fois
// par nom de domaine et par IP LAN directe), en plus de sa `domain` principale.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tenants', 'additional_domains', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    console.log('✅ Colonne additional_domains ajoutée à tenants');
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('tenants', 'additional_domains');
  },
};
