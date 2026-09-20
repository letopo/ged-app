'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tenants', 'primary_color', {
      type: Sequelize.STRING(7),
      allowNull: true,
      comment: 'Couleur de marque au format hex (#1B3A6B) appliquée à --brand'
    });
    console.log('✅ Colonne primary_color ajoutée à tenants');
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('tenants', 'primary_color');
  }
};
