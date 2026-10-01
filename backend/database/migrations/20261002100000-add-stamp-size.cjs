'use strict';

// Cachet à taille réelle : dimensions physiques du tampon de chaque utilisateur
// (en mm, 58 × 22 par défaut = format standard de l'hôpital) + interrupteur
// par organisation pour revenir à l'ancien calcul (cachet ajusté au cadre).
// Ajout de colonnes uniquement : aucun document ni circuit n'est modifié.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const users = await queryInterface.describeTable('users');
    if (!users.stamp_width_mm) {
      await queryInterface.addColumn('users', 'stamp_width_mm', { type: Sequelize.DECIMAL(5, 1), allowNull: false, defaultValue: 58 });
    }
    if (!users.stamp_height_mm) {
      await queryInterface.addColumn('users', 'stamp_height_mm', { type: Sequelize.DECIMAL(5, 1), allowNull: false, defaultValue: 22 });
    }
    const settings = await queryInterface.describeTable('tenant_settings');
    if (!settings.stamp_real_size) {
      await queryInterface.addColumn('tenant_settings', 'stamp_real_size', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true });
    }
    console.log('✅ Taille réelle des cachets : colonnes ajoutées');
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'stamp_width_mm');
    await queryInterface.removeColumn('users', 'stamp_height_mm');
    await queryInterface.removeColumn('tenant_settings', 'stamp_real_size');
  },
};
