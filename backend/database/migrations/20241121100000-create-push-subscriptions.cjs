'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Vérifier si la table existe déjà
    const tableExists = await queryInterface.showAllTables()
      .then(tables => tables.includes('push_subscriptions'));

    if (tableExists) {
      console.log('ℹ️  Table push_subscriptions existe déjà');
      return;
    }

    await queryInterface.createTable('push_subscriptions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      endpoint: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      subscription: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'JSON stringifié de la souscription push complète'
      },
      active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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

    // Index unique sur user_id + endpoint
    await queryInterface.addIndex('push_subscriptions', ['user_id', 'endpoint'], {
      unique: true,
      name: 'push_subscriptions_user_endpoint_unique'
    });

    // Index sur user_id + active
    await queryInterface.addIndex('push_subscriptions', ['user_id', 'active'], {
      name: 'push_subscriptions_user_active_idx'
    });

    console.log('✅ Table push_subscriptions créée');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('push_subscriptions');
  }
};