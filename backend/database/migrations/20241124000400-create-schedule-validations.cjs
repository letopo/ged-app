'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('schedule_validations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      schedule_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'schedules',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'Planning à valider'
      },
      validator_role: {
        type: Sequelize.ENUM(
          'dds',           // Directrice des Soins
          'medical_chief', // Médecin Chef
          'dg'             // Directeur Général
        ),
        allowNull: false,
        comment: 'Rôle du validateur'
      },
      validator_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Utilisateur validateur'
      },
      validation_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Ordre de validation (1, 2, 3...)'
      },
      status: {
        type: Sequelize.ENUM(
          'pending',   // En attente
          'approved',  // Approuvé
          'rejected'   // Rejeté
        ),
        defaultValue: 'pending',
        comment: 'Statut de la validation'
      },
      validated_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date de validation/rejet'
      },
      comments: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Commentaires du validateur'
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Raison du rejet'
      },
      notification_sent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Notification envoyée au validateur'
      },
      notification_sent_at: {
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

    // Index composé pour recherche par planning
    await queryInterface.addIndex('schedule_validations', ['schedule_id', 'validation_order'], {
      name: 'schedule_validations_schedule_order_idx'
    });

    // Index pour recherche par validateur
    await queryInterface.addIndex('schedule_validations', ['validator_user_id', 'status'], {
      name: 'schedule_validations_validator_status_idx'
    });

    // Index pour les validations en attente
    await queryInterface.addIndex('schedule_validations', ['status'], {
      name: 'schedule_validations_status_idx'
    });

    console.log('✅ Table schedule_validations créée');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('schedule_validations');
  }
};