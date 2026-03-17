module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Créer la table des dossiers
    await queryInterface.createTable('invoice_folders', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('inbox', 'custom', 'archive'),
        defaultValue: 'custom'
      },
      position: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // 2. Ajouter la colonne invoice_folder_id à la table documents
    await queryInterface.addColumn('documents', 'invoice_folder_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'invoice_folders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 3. Créer le dossier par défaut "Boîte de réception"
    // Note: On utilise un UUID brut ou une méthode SQL brute pour insérer
    return queryInterface.sequelize.query(`
      INSERT INTO invoice_folders (id, name, type, position, created_at, updated_at)
      VALUES ('${crypto.randomUUID()}', 'Boîte de réception', 'inbox', 0, NOW(), NOW())
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('documents', 'invoice_folder_id');
    await queryInterface.dropTable('invoice_folders');
  }
};
// Nécessaire pour le UUID dans la migration si node version < 19, sinon utiliser une librairie uuid
const crypto = require('crypto');