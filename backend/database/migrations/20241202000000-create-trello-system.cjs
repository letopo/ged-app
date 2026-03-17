'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ============================================
    // 1. TABLE: trello_boards (Tableaux par service)
    // ============================================
    await queryInterface.createTable('trello_boards', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nom du tableau (ex: Moyens Généraux, Biomédical, Informatique)'
      },
      service_type: {
        type: Sequelize.ENUM('MG', 'Biomedical', 'Informatique'),
        allowNull: false,
        unique: true,
        comment: 'Type de service technique'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      settings: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Paramètres du tableau (couleurs, règles, etc.)'
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

    await queryInterface.addIndex('trello_boards', ['service_type'], {
      name: 'trello_boards_service_type_idx'
    });

    // ============================================
    // 2. TABLE: trello_lists (Colonnes)
    // ============================================
    await queryInterface.createTable('trello_lists', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      board_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'trello_boards',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nom de la colonne (ex: À faire, En cours, Terminé)'
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Ordre d\'affichage'
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: true,
        comment: 'Couleur hex de la colonne'
      },
      is_archived: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
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

    await queryInterface.addIndex('trello_lists', ['board_id', 'position'], {
      name: 'trello_lists_board_position_idx'
    });

    // ============================================
    // 3. TABLE: trello_cards (Tâches)
    // ============================================
    await queryInterface.createTable('trello_cards', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      list_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'trello_lists',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Titre de la tâche'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Description détaillée'
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Ordre dans la colonne'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium',
        allowNull: false,
        comment: 'Priorité de la tâche'
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date d\'échéance'
      },
      assigned_to: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Technicien assigné'
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Créateur de la tâche'
      },
      linked_work_request_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'documents',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Lien vers la Demande de Travaux'
      },
      status: {
        type: Sequelize.ENUM('todo', 'in_progress', 'blocked', 'completed', 'cancelled'),
        defaultValue: 'todo',
        allowNull: false
      },
      labels: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
        comment: 'Étiquettes (électrique, plomberie, urgent, etc.)'
      },
      estimated_hours: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Temps estimé en heures'
      },
      actual_hours: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Temps réel passé'
      },
      location: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Localisation (service, salle, etc.)'
      },
      equipment: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Équipement concerné'
      },
      parts_used: {
        type: Sequelize.JSONB,
        defaultValue: [],
        comment: 'Pièces utilisées [{name, quantity, ref}]'
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date de complétion'
      },
      is_archived: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
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

    await queryInterface.addIndex('trello_cards', ['list_id', 'position'], {
      name: 'trello_cards_list_position_idx'
    });
    await queryInterface.addIndex('trello_cards', ['assigned_to'], {
      name: 'trello_cards_assigned_to_idx'
    });
    await queryInterface.addIndex('trello_cards', ['priority'], {
      name: 'trello_cards_priority_idx'
    });
    await queryInterface.addIndex('trello_cards', ['status'], {
      name: 'trello_cards_status_idx'
    });
    await queryInterface.addIndex('trello_cards', ['linked_work_request_id'], {
      name: 'trello_cards_work_request_idx'
    });
    await queryInterface.addIndex('trello_cards', ['due_date'], {
      name: 'trello_cards_due_date_idx'
    });

    // ============================================
    // 4. TABLE: trello_comments (Commentaires)
    // ============================================
    await queryInterface.createTable('trello_comments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      card_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'trello_cards',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Contenu du commentaire'
      },
      is_edited: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
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

    await queryInterface.addIndex('trello_comments', ['card_id', 'created_at'], {
      name: 'trello_comments_card_date_idx'
    });

    // ============================================
    // 5. TABLE: trello_attachments (Pièces jointes)
    // ============================================
    await queryInterface.createTable('trello_attachments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      card_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'trello_cards',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      uploaded_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      file_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Chemin du fichier'
      },
      file_type: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'MIME type'
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Taille en octets'
      },
      attachment_type: {
        type: Sequelize.ENUM('photo_before', 'photo_after', 'document', 'other'),
        defaultValue: 'other',
        allowNull: false,
        comment: 'Type de pièce jointe'
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

    await queryInterface.addIndex('trello_attachments', ['card_id'], {
      name: 'trello_attachments_card_idx'
    });

    // ============================================
    // 6. TABLE: trello_activity_logs (Historique)
    // ============================================
    await queryInterface.createTable('trello_activity_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      card_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'trello_cards',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      action_type: {
        type: Sequelize.ENUM(
          'card_created',
          'card_moved',
          'card_updated',
          'card_archived',
          'card_assigned',
          'card_unassigned',
          'comment_added',
          'attachment_added',
          'due_date_set',
          'priority_changed',
          'status_changed',
          'label_added',
          'label_removed'
        ),
        allowNull: false
      },
      action_data: {
        type: Sequelize.JSONB,
        defaultValue: {},
        comment: 'Données de l\'action (old_value, new_value, etc.)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('trello_activity_logs', ['card_id', 'created_at'], {
      name: 'trello_activity_logs_card_date_idx'
    });
    await queryInterface.addIndex('trello_activity_logs', ['action_type'], {
      name: 'trello_activity_logs_action_type_idx'
    });

    // ============================================
    // 7. DONNÉES INITIALES
    // ============================================
    
    // Créer les tableaux par défaut
    const boards = await queryInterface.bulkInsert('trello_boards', [
      {
        id: Sequelize.literal('gen_random_uuid()'),
        name: 'Moyens Généraux',
        service_type: 'MG',
        description: 'Gestion des tâches de maintenance générale (plomberie, électricité, bâtiment)',
        is_active: true,
        settings: JSON.stringify({
          default_labels: ['Électricité', 'Plomberie', 'Bâtiment', 'Climatisation', 'Urgent']
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        name: 'Biomédical',
        service_type: 'Biomedical',
        description: 'Gestion de la maintenance des équipements médicaux',
        is_active: true,
        settings: JSON.stringify({
          default_labels: ['Réparation', 'Maintenance préventive', 'Calibration', 'Pièces', 'Urgent']
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        name: 'Informatique',
        service_type: 'Informatique',
        description: 'Gestion des interventions informatiques et réseau',
        is_active: true,
        settings: JSON.stringify({
          default_labels: ['Matériel', 'Logiciel', 'Réseau', 'Assistance', 'Urgent']
        }),
        created_at: new Date(),
        updated_at: new Date()
      }
    ], { returning: true });

    // Créer les colonnes par défaut pour chaque tableau
    const defaultLists = [
      { name: '📝 À faire', position: 0, color: '#E8E8E8' },
      { name: '🚧 En cours', position: 1, color: '#FEF3C7' },
      { name: '⏸️ Bloqué', position: 2, color: '#FEE2E2' },
      { name: '✅ Terminé', position: 3, color: '#D1FAE5' }
    ];

    for (let i = 0; i < 3; i++) { // Pour chaque board
      for (const list of defaultLists) {
        await queryInterface.bulkInsert('trello_lists', [{
          id: Sequelize.literal('gen_random_uuid()'),
          board_id: Sequelize.literal(`(SELECT id FROM trello_boards ORDER BY created_at LIMIT 1 OFFSET ${i})`),
          name: list.name,
          position: list.position,
          color: list.color,
          is_archived: false,
          created_at: new Date(),
          updated_at: new Date()
        }]);
      }
    }

    console.log('✅ Système Trello créé avec succès:');
    console.log('   📋 3 tableaux: MG, Biomédical, Informatique');
    console.log('   📊 4 colonnes par tableau: À faire, En cours, Bloqué, Terminé');
    console.log('   🎯 Prêt pour la gestion des tâches techniques');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('trello_activity_logs');
    await queryInterface.dropTable('trello_attachments');
    await queryInterface.dropTable('trello_comments');
    await queryInterface.dropTable('trello_cards');
    await queryInterface.dropTable('trello_lists');
    await queryInterface.dropTable('trello_boards');
  }
};