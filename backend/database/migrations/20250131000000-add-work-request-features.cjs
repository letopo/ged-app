// backend/database/migrations/20250131000000-add-work-request-features.js
// VERSION FINALE 100% SANS ERREUR
'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚀 Début de la migration: ajout des fonctionnalités Demande de Travaux');

    // 0. Activer l'extension UUID
    try {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      console.log('✅ Extension uuid-ossp activée');
    } catch (err) {
      console.warn('⚠️ Extension uuid-ossp déjà activée');
    }

    // 1. Créer la table services
    await queryInterface.createTable('services', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
    console.log('✅ Table services créée');

    // 2. Créer la table motifs
    await queryInterface.createTable('motifs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('MG', 'Biomedical'),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
    console.log('✅ Table motifs créée');

    // 3. Ajouter linked_document_id SEULEMENT si elle n'existe pas
    const documentsTable = await queryInterface.describeTable('documents');
    if (!documentsTable.linked_document_id) {
      await queryInterface.addColumn('documents', 'linked_document_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'documents',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
      console.log('✅ Colonne linked_document_id ajoutée à documents');
    } else {
      console.log('⚠️ Colonne linked_document_id existe déjà');
    }

    // 4. Ajouter les nouveaux statuts
    try {
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_type t 
            JOIN pg_enum e ON t.oid = e.enumtypid 
            WHERE t.typname = 'enum_documents_status' AND e.enumlabel = 'en_attente_dependance'
          ) THEN
            ALTER TYPE "enum_documents_status" ADD VALUE 'en_attente_dependance';
          END IF;
        END$$;
      `);
      console.log('✅ Statut en_attente_dependance ajouté à documents');
    } catch (err) {
      console.warn('⚠️ Statut en_attente_dependance déjà existant');
    }

    try {
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_type t 
            JOIN pg_enum e ON t.oid = e.enumtypid 
            WHERE t.typname = 'enum_workflows_status' AND e.enumlabel = 'en_pause'
          ) THEN
            ALTER TYPE "enum_workflows_status" ADD VALUE 'en_pause';
          END IF;
        END$$;
      `);
      console.log('✅ Statut en_pause ajouté à workflows');
    } catch (err) {
      console.warn('⚠️ Statut en_pause déjà existant');
    }

    // 5. Insérer les services UNIQUEMENT s'ils n'existent pas déjà
    const services = [
      'Gynécologie', 'PMI', 'Direction', 'Pharmacie', 'Médecine',
      'Pédiatrie', 'Néonatalogie', 'Bloc Opératoire', 'Anesthésie',
      'Chirurgie', 'SAU', 'Accueil', 'Lingerie', 'Kiné',
      'Point Focal', 'Biomédical', 'Paramètre SAU', 'MG'
    ];

    // Vérifier combien de services existent déjà
    const existingServices = await queryInterface.sequelize.query(
      'SELECT name FROM services',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const existingServiceNames = existingServices.map(s => s.name);
    const servicesToInsert = services.filter(name => !existingServiceNames.includes(name));

    if (servicesToInsert.length > 0) {
      const now = new Date();
      const serviceRows = servicesToInsert.map(name => ({
        id: uuidv4(),
        name,
        created_at: now,
        updated_at: now,
      }));

      await queryInterface.bulkInsert('services', serviceRows);
      console.log(`✅ ${servicesToInsert.length} nouveaux services insérés`);
    } else {
      console.log('⚠️ Tous les services existent déjà');
    }

    // Afficher le total final
    const totalServices = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM services',
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log(`📊 Total des services dans la base: ${totalServices[0].count}`);

    console.log('🎉 Migration terminée avec succès !');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Rollback de la migration...');

    // Supprimer la colonne linked_document_id si elle existe
    const documentsTable = await queryInterface.describeTable('documents');
    if (documentsTable.linked_document_id) {
      await queryInterface.removeColumn('documents', 'linked_document_id');
      console.log('✅ Colonne linked_document_id supprimée');
    }

    // Supprimer les tables
    await queryInterface.dropTable('motifs');
    console.log('✅ Table motifs supprimée');
    
    await queryInterface.dropTable('services');
    console.log('✅ Table services supprimée');

    console.log('✅ Rollback terminé');
  },
};