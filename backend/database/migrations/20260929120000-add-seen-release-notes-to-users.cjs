'use strict';

// Identifiants des notes « Nouveautés » déjà vues par l'utilisateur
// (fenêtre générale à l'ouverture, bulles par écran/formulaire).
// Les notes elles-mêmes sont livrées avec le frontend (src/releaseNotes.js).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('users');
    if (table.seen_release_notes) {
      console.log('ℹ️  users.seen_release_notes existe déjà, rien à faire.');
      return;
    }
    await queryInterface.addColumn('users', 'seen_release_notes', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });
    console.log('✅ Colonne seen_release_notes ajoutée sur users');
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'seen_release_notes');
  },
};
