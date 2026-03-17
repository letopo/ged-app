'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('queue_positions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      queue_type: {
        type: Sequelize.ENUM('accueil_php', 'accueil_normal', 'caisse'),
        allowNull: false
      },
      position_number: {
        type: Sequelize.INTEGER,
        allowNull: false
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
      current_ticket_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'tickets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM('available', 'busy', 'offline'),
        defaultValue: 'offline',
        allowNull: false
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

    // Index unique sur queue_type + position_number
    await queryInterface.addIndex('queue_positions', ['queue_type', 'position_number'], {
      unique: true,
      name: 'queue_positions_type_position_unique'
    });

    await queryInterface.addIndex('queue_positions', ['user_id'], {
      name: 'queue_positions_user_id_idx'
    });

    await queryInterface.addIndex('queue_positions', ['status'], {
      name: 'queue_positions_status_idx'
    });

    // Créer les positions par défaut
    const positions = [];
    
    // Accueil PHP - 2 positions
    for (let i = 1; i <= 2; i++) {
      positions.push({
        id: Sequelize.literal('gen_random_uuid()'),
        queue_type: 'accueil_php',
        position_number: i,
        status: 'offline',
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    
    // Accueil Normal - 2 positions
    for (let i = 1; i <= 2; i++) {
      positions.push({
        id: Sequelize.literal('gen_random_uuid()'),
        queue_type: 'accueil_normal',
        position_number: i,
        status: 'offline',
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    
    // Caisse - 1 position
    positions.push({
      id: Sequelize.literal('gen_random_uuid()'),
      queue_type: 'caisse',
      position_number: 1,
      status: 'offline',
      created_at: new Date(),
      updated_at: new Date()
    });

    await queryInterface.bulkInsert('queue_positions', positions);
    
    console.log('✅ Positions créées:');
    console.log('   - Accueil PHP: 2 positions');
    console.log('   - Accueil Normal: 2 positions');
    console.log('   - Caisse: 1 position');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('queue_positions');
  }
};