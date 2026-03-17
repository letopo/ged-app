'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Cette migration est entièrement redondante.
    // Ses actions (ajout de la colonne linked_document_id et de la valeur ENUM en_attente_dependance)
    // ont déjà été effectuées par la migration 20250131000000-add-work-request-features.
    // Nous la laissons vide pour qu'elle soit marquée comme exécutée sans causer d'erreur.
    console.log('Migration 20251030153000-update-documents-table-for-workflows ignorée car redondante.');
    return Promise.resolve();
  },

  down: async (queryInterface, Sequelize) => {
    // Le "down" est également vide pour correspondre au "up".
    console.log('Migration 20251030153000-update-documents-table-for-workflows ignorée.');
    return Promise.resolve();
  },
};