'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Commande spécifique à PostgreSQL pour ajouter une nouvelle valeur à un type ENUM existant
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_documents_status" ADD VALUE 'in_progress';`
    );
  },

  async down(queryInterface, Sequelize) {
    // Revenir en arrière (supprimer une valeur d'un ENUM) est une opération très complexe et dangereuse
    // en PostgreSQL car cela peut corrompre les données existantes.
    // La meilleure pratique est de ne rien faire ou simplement de logger un message.
    console.log("La valeur 'in_progress' n'a pas été retirée de 'enum_documents_status' pour des raisons de sécurité des données.");
  }
};