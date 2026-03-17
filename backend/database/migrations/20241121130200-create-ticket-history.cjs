'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ticket_history', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      ticket_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tickets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      action: {
        type: Sequelize.ENUM('created', 'called', 'started', 'transferred', 'completed', 'cancelled'),
        allowNull: false
      },
      queue_type: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      position_number: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('ticket_history', ['ticket_id'], {
      name: 'ticket_history_ticket_id_idx'
    });

    await queryInterface.addIndex('ticket_history', ['action'], {
      name: 'ticket_history_action_idx'
    });

    await queryInterface.addIndex('ticket_history', ['created_at'], {
      name: 'ticket_history_created_at_idx'
    });
    
    console.log('✅ Table ticket_history créée avec succès');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ticket_history');
  }
};