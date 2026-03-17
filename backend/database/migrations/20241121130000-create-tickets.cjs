'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tickets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      ticket_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      visit_type: {
        type: Sequelize.ENUM('consultation', 'visite', 'garde_malade'),
        allowNull: false
      },
      patient_type: {
        type: Sequelize.ENUM('php', 'normal'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('waiting', 'called', 'in_progress', 'completed', 'cancelled'),
        defaultValue: 'waiting',
        allowNull: false
      },
      queue_type: {
        type: Sequelize.ENUM('accueil_php', 'accueil_normal', 'caisse'),
        allowNull: false
      },
      position_number: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      patient_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      patient_phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      called_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      assigned_to_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      assigned_position: {
        type: Sequelize.INTEGER,
        allowNull: true
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

    // Indexes
    await queryInterface.addIndex('tickets', ['ticket_number'], {
      unique: true,
      name: 'tickets_ticket_number_unique'
    });

    await queryInterface.addIndex('tickets', ['status'], {
      name: 'tickets_status_idx'
    });

    await queryInterface.addIndex('tickets', ['queue_type'], {
      name: 'tickets_queue_type_idx'
    });

    await queryInterface.addIndex('tickets', ['created_at'], {
      name: 'tickets_created_at_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tickets');
  }
};