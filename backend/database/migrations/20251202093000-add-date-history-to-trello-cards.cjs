// backend/database/migrations/20251202093000-add-date-history-to-trello-cards.cjs

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('trello_cards', 'date_history', {
      type: Sequelize.JSON, // Sera converti en JSONB pour Postgres ou JSON pour MySQL
      allowNull: true,
      defaultValue: [],
      comment: 'Historique des reports de dates'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('trello_cards', 'date_history');
  }
};