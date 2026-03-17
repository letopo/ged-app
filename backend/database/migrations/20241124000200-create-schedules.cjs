'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('schedules', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Titre du planning (ex: Planning Novembre 2025)'
      },
      schedule_type: {
        type: Sequelize.ENUM(
          'administrative',          // Personnel administratif
          'paramedical_services',    // Paramédical services hospitaliers
          'paramedical_pharmacy',    // Paramédical + pharmacie
          'medical_duties',          // Médecins (astreintes/consultations)
          'hospital_services_agents', // Agents services hospitaliers
          'general_services',        // Moyens généraux
          'emergency_reinforcement', // Renforcement SAU
          'weekend'                  // Planning weekend
        ),
        allowNull: false,
        comment: 'Type de planning'
      },
      department_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'departments',
          key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Département concerné (si applicable)'
      },
      month: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 12
        },
        comment: 'Mois du planning (1-12)'
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Année du planning'
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date de début du planning'
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date de fin du planning'
      },
      created_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'RESTRICT',
        comment: 'Utilisateur créateur'
      },
      status: {
        type: Sequelize.ENUM(
          'draft',           // Brouillon
          'pending_dds',     // En attente validation DDS
          'pending_medical', // En attente validation Médecin Chef
          'pending_dg',      // En attente validation DG
          'approved',        // Validé (publié)
          'rejected',        // Rejeté
          'archived'         // Archivé
        ),
        defaultValue: 'draft',
        comment: 'Statut du planning'
      },
      validation_workflow: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Workflow de validation requis selon le type'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes ou commentaires'
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date de publication'
      },
      published_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      pdf_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Chemin vers le PDF généré'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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

    // Index composé pour recherche rapide
    await queryInterface.addIndex('schedules', ['schedule_type', 'year', 'month'], {
      name: 'schedules_type_year_month_idx'
    });

    // Index sur le statut
    await queryInterface.addIndex('schedules', ['status'], {
      name: 'schedules_status_idx'
    });

    // Index sur les dates
    await queryInterface.addIndex('schedules', ['start_date', 'end_date'], {
      name: 'schedules_dates_idx'
    });

    console.log('✅ Table schedules créée');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('schedules');
  }
};