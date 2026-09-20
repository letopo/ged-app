'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'is_absent', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('users', 'substitute_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('workflows', 'original_validator_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('workflows', 'is_substituted', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    console.log('✅ Colonnes absence/remplaçant ajoutées (users.is_absent/substitute_id, workflows.original_validator_id/is_substituted)');
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('workflows', 'is_substituted');
    await queryInterface.removeColumn('workflows', 'original_validator_id');
    await queryInterface.removeColumn('users', 'substitute_id');
    await queryInterface.removeColumn('users', 'is_absent');
  },
};
