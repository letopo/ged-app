'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Cette migration est redondante.
    // L'ajout de la valeur ENUM "en_pause" a déjà été effectué par la migration
    // 20250131000000-add-work-request-features.
    // Nous la laissons vide pour qu'elle soit marquée comme exécutée sans causer d'erreur.
    console.log('Migration 20251030192600-update-workflow-status-enum ignorée car redondante.');
    return Promise.resolve();
  },

  down: async (queryInterface, Sequelize) => {
    // Le "down" est également vide pour correspondre au "up".
    console.log('Migration 20251030192600-update-workflow-status-enum ignorée.');
    return Promise.resolve();
  },
};