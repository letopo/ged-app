// backend/database/migrations/20251217000000-fix-demande-achat.cjs
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. SUPPRIMER L'ANCIENNE TABLE SI ELLE EXISTE (NETTOYAGE RADICAL)
      // On utilise CASCADE pour forcer la suppression des contraintes bloquantes
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS "DemandesAchats" CASCADE;', { transaction });
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS "demandes_achats" CASCADE;', { transaction });

      // 2. CRÉER LA NOUVELLE TABLE PROPREMENT
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
          defaultValue: [], // Correction: [] au lieu de '[]' pour compatibilité
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
          defaultValue: [], // Correction
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
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      // 3. AJOUTER LES INDEX
      await queryInterface.addIndex('demandes_achats', ['requester_id'], { transaction });
      await queryInterface.addIndex('demandes_achats', ['status'], { transaction });
      await queryInterface.addIndex('demandes_achats', ['da_number'], { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Erreur migration demandes_achats:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('demandes_achats');
  }
};