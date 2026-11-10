'use strict';

// Prise de poste en deux parties (retour du 10/11/2026) : le chauffeur remplit
// la partie « Véhicule », l'infirmier la partie « Matériel médical » + oxygène.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const cols = await queryInterface.describeTable('vehicle_shift_checks');
    if (!cols.part) {
      await queryInterface.addColumn('vehicle_shift_checks', 'part', { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'soignant' });
    }
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('vehicle_shift_checks', 'part');
  },
};
