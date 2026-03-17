'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('positions', {
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
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM('offline', 'available', 'busy'),
        defaultValue: 'offline'
      },
      last_active_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Index unique sur queue_type + position_number
    await queryInterface.addIndex('positions', ['queue_type', 'position_number'], {
      unique: true,
      name: 'positions_queue_position_unique'
    });

    // Créer les positions par défaut
    const now = new Date();
    
    await queryInterface.bulkInsert('positions', [
      // Accueil PHP - 2 positions
      {
        id: Sequelize.literal('gen_random_uuid()'),
        queue_type: 'accueil_php',
        position_number: 1,
        status: 'offline',
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        queue_type: 'accueil_php',
        position_number: 2,
        status: 'offline',
        created_at: now,
        updated_at: now
      },
      // Accueil Normal - 2 positions
      {
        id: Sequelize.literal('gen_random_uuid()'),
        queue_type: 'accueil_normal',
        position_number: 1,
        status: 'offline',
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        queue_type: 'accueil_normal',
        position_number: 2,
        status: 'offline',
        created_at: now,
        updated_at: now
      },
      // Caisse - 1 position
      {
        id: Sequelize.literal('gen_random_uuid()'),
        queue_type: 'caisse',
        position_number: 1,
        status: 'offline',
        created_at: now,
        updated_at: now
      }
    ]);

    console.log('✅ Table positions créée avec 5 positions par défaut');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('positions');
  }
};