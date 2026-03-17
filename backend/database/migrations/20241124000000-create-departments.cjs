'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('departments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Code du département (ex: SAU, CHIR, MED)'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Nom complet du département'
      },
      type: {
        type: Sequelize.ENUM(
          'medical',           // Services médicaux
          'paramedical',       // Services paramédicaux
          'administrative',    // Services administratifs
          'support',           // Services de support (moyens généraux)
          'pharmacy'           // Pharmacie
        ),
        allowNull: false,
        comment: 'Type de département'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
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

    // Index sur le type pour les requêtes filtrées
    await queryInterface.addIndex('departments', ['type'], {
      name: 'departments_type_idx'
    });

    // Insérer les départements par défaut
    const now = new Date();
    
    await queryInterface.bulkInsert('departments', [
      // Services médicaux
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'SAU',
        name: 'Service d\'Accueil des Urgences',
        type: 'medical',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'CHIR',
        name: 'Chirurgie',
        type: 'medical',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'MED',
        name: 'Médecine Interne',
        type: 'medical',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'PEDIATRIE',
        name: 'Pédiatrie',
        type: 'medical',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'GYNECO',
        name: 'Gynécologie',
        type: 'medical',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'MATERNITE',
        name: 'Maternité',
        type: 'medical',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'BLOC_OP',
        name: 'Bloc Opératoire',
        type: 'medical',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      
      // Services paramédicaux
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'LABO',
        name: 'Laboratoire',
        type: 'paramedical',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'RADIO',
        name: 'Radiologie',
        type: 'paramedical',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      
      // Pharmacie
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'PHCIE',
        name: 'Pharmacie',
        type: 'pharmacy',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      
      // Services administratifs
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'ADMIN',
        name: 'Administration',
        type: 'administrative',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'ACCUEIL',
        name: 'Accueil',
        type: 'administrative',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      
      // Services de support (Moyens généraux)
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'CONDUCTEURS',
        name: 'Conducteurs',
        type: 'support',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'GARDIENS',
        name: 'Gardiens',
        type: 'support',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'JARDINIERS',
        name: 'Jardiniers',
        type: 'support',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'MAINTENANCE',
        name: 'Maintenance',
        type: 'support',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ]);

    console.log('✅ Table departments créée avec 16 départements par défaut');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('departments');
  }
};