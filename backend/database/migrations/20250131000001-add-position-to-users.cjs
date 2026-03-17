// backend/database/migrations/20250131000001-add-position-to-users.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚀 Ajout de la colonne position à la table users');

    // Vérifier si la colonne existe déjà
    const usersTable = await queryInterface.describeTable('users');
    
    if (!usersTable.position) {
      await queryInterface.addColumn('users', 'position', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Poste ou fonction de l\'utilisateur',
      });
      console.log('✅ Colonne position ajoutée');
    } else {
      console.log('⚠️ Colonne position existe déjà');
    }

    console.log('🎉 Migration terminée avec succès !');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Rollback de la migration...');
    
    const usersTable = await queryInterface.describeTable('users');
    if (usersTable.position) {
      await queryInterface.removeColumn('users', 'position');
      console.log('✅ Colonne position supprimée');
    }
    
    console.log('✅ Rollback terminé');
  },
};