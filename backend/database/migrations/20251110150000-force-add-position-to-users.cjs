'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Vérifier d'abord si la colonne existe pour éviter une erreur si elle a été ajoutée manuellement
    const tableInfo = await queryInterface.describeTable('users');
    if (!tableInfo.position) {
      await queryInterface.addColumn('users', 'position', {
        type: Sequelize.STRING,
        allowNull: true, // Réglez l'allowNull selon ce qui est défini dans src/models/User.js
      });
      console.log('Colonne position ajoutée à la table users.');
    } else {
      console.log('Colonne position existe déjà dans la table users. Aucune action nécessaire.');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'position');
  }
};