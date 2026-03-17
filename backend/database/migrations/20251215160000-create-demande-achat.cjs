// backend/database/migrations/20251217000000-fix-demande-achat.cjs
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Supprimer l'ancienne table si elle existe
    try {
      await queryInterface.dropTable('DemandesAchats');
    } catch (e) {
      console.log('Table DemandesAchats n\'existe pas, création de demandes_achats');
    }
    
    // Créer la nouvelle table avec UUID
    await queryInterface.createTable('demandes_achats', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      da_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      requester_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      da_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      domain: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      domain_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      delivery_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      purchase_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      article_nature: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      request_description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      beneficiary_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      beneficiary_email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      beneficiary_phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_magasin_output: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      linked_doc_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_for_works: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      non_ref_articles: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: '[]',
      },
      total_ref_value: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00,
      },
      total_non_ref_value: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00,
      },
      attached_documents: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: '[]',
      },
      supplier_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('draft', 'pending_approval', 'approved', 'rejected', 'in_progress', 'completed'),
        defaultValue: 'draft',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Ajouter un index pour améliorer les performances
    await queryInterface.addIndex('demandes_achats', ['requester_id']);
    await queryInterface.addIndex('demandes_achats', ['status']);
    await queryInterface.addIndex('demandes_achats', ['da_number']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('demandes_achats');
  }
};