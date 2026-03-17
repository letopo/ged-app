'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('schedule_assignments', {
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
        comment: 'Planning parent'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'Utilisateur assigné (si dans users)'
      },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'employees',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'Employé assigné (si dans employees)'
      },
      employee_name: {
        type: Sequelize.STRING(200),
        allowNull: true,
        comment: 'Nom de l\'employé (pour référence rapide)'
      },
      assignment_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date de l\'affectation'
      },
      shift_type_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'shift_types',
          key: 'id'
        },
        onDelete: 'RESTRICT',
        comment: 'Type de shift'
      },
      shift_code: {
        type: Sequelize.STRING(10),
        allowNull: false,
        comment: 'Code du shift pour référence rapide (P, R, J, N, etc.)'
      },
      department_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'departments',
          key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Département pour ce jour (si applicable)'
      },
      position: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Position/poste spécifique (ex: Poste 1, SAU, etc.)'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes spécifiques pour cette affectation'
      },
      notification_sent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Notification envoyée'
      },
      notification_sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date d\'envoi de la notification'
      },
      reminder_sent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Rappel envoyé'
      },
      reminder_sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date d\'envoi du rappel'
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

    // Index composé pour recherche rapide par planning et date
    await queryInterface.addIndex('schedule_assignments', ['schedule_id', 'assignment_date'], {
      name: 'schedule_assignments_schedule_date_idx'
    });

    // Index pour recherche par utilisateur
    await queryInterface.addIndex('schedule_assignments', ['user_id', 'assignment_date'], {
      name: 'schedule_assignments_user_date_idx'
    });

    // Index pour recherche par employé
    await queryInterface.addIndex('schedule_assignments', ['employee_id', 'assignment_date'], {
      name: 'schedule_assignments_employee_date_idx'
    });

    // Index pour les notifications à envoyer
    await queryInterface.addIndex('schedule_assignments', ['notification_sent', 'assignment_date'], {
      name: 'schedule_assignments_notification_idx'
    });

    // Index pour les rappels à envoyer
    await queryInterface.addIndex('schedule_assignments', ['reminder_sent', 'assignment_date'], {
      name: 'schedule_assignments_reminder_idx'
    });

    console.log('✅ Table schedule_assignments créée');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('schedule_assignments');
  }
};