'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('schedule_changes_log', {
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
        comment: 'Planning modifié'
      },
      assignment_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'ID de l\'affectation modifiée (peut être null si supprimée)'
      },
      changed_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'RESTRICT',
        comment: 'Utilisateur ayant effectué la modification'
      },
      change_type: {
        type: Sequelize.ENUM(
          'create',        // Création d'affectation
          'update',        // Modification d'affectation
          'delete',        // Suppression d'affectation
          'status_change', // Changement de statut du planning
          'validation',    // Validation/rejet
          'publish'        // Publication
        ),
        allowNull: false,
        comment: 'Type de modification'
      },
      affected_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Date affectée par le changement'
      },
      affected_employee: {
        type: Sequelize.STRING(200),
        allowNull: true,
        comment: 'Nom de l\'employé affecté'
      },
      old_value: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Ancienne valeur (JSON)'
      },
      new_value: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Nouvelle valeur (JSON)'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Description du changement'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'Adresse IP de l\'utilisateur'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User agent du navigateur'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Index pour recherche par planning
    await queryInterface.addIndex('schedule_changes_log', ['schedule_id', 'created_at'], {
      name: 'schedule_changes_log_schedule_date_idx'
    });

    // Index pour recherche par utilisateur
    await queryInterface.addIndex('schedule_changes_log', ['changed_by_user_id', 'created_at'], {
      name: 'schedule_changes_log_user_date_idx'
    });

    // Index pour recherche par type de changement
    await queryInterface.addIndex('schedule_changes_log', ['change_type'], {
      name: 'schedule_changes_log_type_idx'
    });

    console.log('✅ Table schedule_changes_log créée');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('schedule_changes_log');
  }
};