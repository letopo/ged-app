'use strict';

// Programme du week-end (19/11/2026) : tableau libre, comme le modèle papier
// (en-tête Direction, services × vendredi nuit → dimanche nuit, cases fusionnées).
// Gardé tel quel dans schedules.content (les autres plannings restent sur
// schedule_assignments).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const cols = await queryInterface.describeTable('schedules');
    if (!cols.content) await queryInterface.addColumn('schedules', 'content', { type: Sequelize.JSONB, allowNull: true });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('schedules', 'content');
  },
};
