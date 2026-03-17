'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('workflows', 'assigned_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Date à laquelle la tâche a été assignée au validateur',
    });

    // Initialiser assignedAt avec createdAt pour les workflows existants
    await queryInterface.sequelize.query(`
      UPDATE workflows 
      SET assigned_at = created_at 
      WHERE assigned_at IS NULL AND status = 'pending';
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('workflows', 'assigned_at');
  },
};