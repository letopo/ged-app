'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('shift_types', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      code: {
        type: Sequelize.STRING(10),
        allowNull: false,
        unique: true,
        comment: 'Code du shift (P, R, J, N, A, etc.)'
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Nom du shift'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: true,
        comment: 'Couleur hexadécimale pour affichage (#RRGGBB)'
      },
      start_time: {
        type: Sequelize.TIME,
        allowNull: true,
        comment: 'Heure de début (si applicable)'
      },
      end_time: {
        type: Sequelize.TIME,
        allowNull: true,
        comment: 'Heure de fin (si applicable)'
      },
      is_work_day: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Indique si c\'est un jour de travail'
      },
      is_night_shift: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Indique si c\'est une garde de nuit'
      },
      requires_notification: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Nécessite une notification de rappel'
      },
      notification_hours_before: {
        type: Sequelize.INTEGER,
        defaultValue: 24,
        comment: 'Heures avant le shift pour notifier'
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

    // Insérer les types de shifts par défaut
    const now = new Date();
    
    await queryInterface.bulkInsert('shift_types', [
      // Shifts de base
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'P',
        name: 'Présent',
        description: 'Journée de travail normale',
        color: '#22c55e',
        start_time: '07:30:00',
        end_time: '16:30:00',
        is_work_day: true,
        is_night_shift: false,
        requires_notification: false,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'R',
        name: 'Repos',
        description: 'Jour de repos',
        color: '#94a3b8',
        start_time: null,
        end_time: null,
        is_work_day: false,
        is_night_shift: false,
        requires_notification: false,
        created_at: now,
        updated_at: now
      },
      
      // Shifts jour/nuit
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'J',
        name: 'Jour',
        description: 'Shift de jour (7h - 17h30)',
        color: '#3b82f6',
        start_time: '07:00:00',
        end_time: '17:30:00',
        is_work_day: true,
        is_night_shift: false,
        requires_notification: true,
        notification_hours_before: 12,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'N',
        name: 'Nuit',
        description: 'Shift de nuit (17h - 7h30)',
        color: '#1e293b',
        start_time: '17:00:00',
        end_time: '07:30:00',
        is_work_day: true,
        is_night_shift: true,
        requires_notification: true,
        notification_hours_before: 12,
        created_at: now,
        updated_at: now
      },
      
      // Astreintes
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'A',
        name: 'Astreinte à domicile',
        description: 'Astreinte à domicile (7h - 7h)',
        color: '#f59e0b',
        start_time: '07:00:00',
        end_time: '07:00:00',
        is_work_day: true,
        is_night_shift: false,
        requires_notification: true,
        notification_hours_before: 24,
        created_at: now,
        updated_at: now
      },
      
      // Congés et absences
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'CA',
        name: 'Congé Annuel',
        description: 'Congé annuel',
        color: '#8b5cf6',
        start_time: null,
        end_time: null,
        is_work_day: false,
        is_night_shift: false,
        requires_notification: false,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'CM',
        name: 'Congé Maladie',
        description: 'Congé maladie',
        color: '#ef4444',
        start_time: null,
        end_time: null,
        is_work_day: false,
        is_night_shift: false,
        requires_notification: false,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'F',
        name: 'Formation',
        description: 'Formation',
        color: '#06b6d4',
        start_time: '07:30:00',
        end_time: '17:30:00',
        is_work_day: true,
        is_night_shift: false,
        requires_notification: true,
        notification_hours_before: 48,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'H',
        name: 'Hors service',
        description: 'Hors service',
        color: '#64748b',
        start_time: null,
        end_time: null,
        is_work_day: false,
        is_night_shift: false,
        requires_notification: false,
        created_at: now,
        updated_at: now
      },
      
      // Shifts spéciaux
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'ST',
        name: 'Service Technique',
        description: 'Service technique',
        color: '#10b981',
        start_time: '06:30:00',
        end_time: '15:30:00',
        is_work_day: true,
        is_night_shift: false,
        requires_notification: false,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'JA',
        name: 'Journée Astreinte',
        description: 'Journée d\'astreinte',
        color: '#fb923c',
        start_time: '07:00:00',
        end_time: '07:00:00',
        is_work_day: true,
        is_night_shift: false,
        requires_notification: true,
        notification_hours_before: 24,
        created_at: now,
        updated_at: now
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'RA',
        name: 'Repos après Astreinte',
        description: 'Repos après astreinte',
        color: '#c084fc',
        start_time: null,
        end_time: null,
        is_work_day: false,
        is_night_shift: false,
        requires_notification: false,
        created_at: now,
        updated_at: now
      }
    ]);

    console.log('✅ Table shift_types créée avec 12 types de shifts par défaut');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('shift_types');
  }
};