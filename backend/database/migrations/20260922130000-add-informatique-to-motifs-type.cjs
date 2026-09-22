'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Le type 'Informatique' est accepté côté application (listController /
    // motifController / CreateWorkRequest.jsx) depuis l'ajout du service
    // Informatique aux Demandes de travaux, mais n'avait jamais été ajouté
    // au type ENUM Postgres sous-jacent — toute création d'un motif
    // personnalisé de type Informatique échouait donc systématiquement.
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_motifs_type" ADD VALUE IF NOT EXISTS 'Informatique';`
    );
  },

  async down(queryInterface, Sequelize) {
    // Retirer une valeur d'un ENUM Postgres est une opération complexe et
    // risquée si des lignes l'utilisent déjà — on ne fait rien.
    console.log("La valeur 'Informatique' n'a pas été retirée de 'enum_motifs_type' pour des raisons de sécurité des données.");
  }
};
