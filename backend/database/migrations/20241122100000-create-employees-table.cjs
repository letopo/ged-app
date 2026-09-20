// backend/database/migrations/20251201000000-create-employees-table.cjs
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employees', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      birth_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      birth_place: {
        type: Sequelize.STRING,
        allowNull: false
      },
      gender: {
        type: Sequelize.ENUM('M', 'F'),
        allowNull: false
      },
      children_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      matricule: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      marital_status: {
        type: Sequelize.ENUM('Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf(ve)'),
        allowNull: false
      },
      service_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'services',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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

    // Création des index pour optimiser les performances
    await queryInterface.addIndex('employees', ['matricule'], {
      name: 'employees_matricule_index'
    });

    await queryInterface.addIndex('employees', ['service_id'], {
      name: 'employees_service_id_index'
    });

    await queryInterface.addIndex('employees', ['last_name', 'first_name'], {
      name: 'employees_name_index'
    });

    await queryInterface.addIndex('employees', ['is_active'], {
      name: 'employees_is_active_index'
    });
  },

  async down(queryInterface, Sequelize) {
    // Supprimer les index d'abord
    await queryInterface.removeIndex('employees', 'employees_matricule_index');
    await queryInterface.removeIndex('employees', 'employees_service_id_index');
    await queryInterface.removeIndex('employees', 'employees_name_index');
    await queryInterface.removeIndex('employees', 'employees_is_active_index');
    
    // Supprimer la table
    await queryInterface.dropTable('employees');
  }
};