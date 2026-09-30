'use strict';

// Transmission d'un document validé à d'autres utilisateurs (ex. demande d'achat
// signée → acheteur). Le destinataire obtient le droit de lire le document et le
// retrouve dans l'onglet « Reçus » de la page Documents.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('document_transmissions')) {
      console.log('ℹ️  document_transmissions existe déjà, rien à faire.');
      return;
    }
    await queryInterface.createTable('document_transmissions', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      document_id:  { type: Sequelize.UUID, allowNull: false, references: { model: 'documents', key: 'id' }, onDelete: 'CASCADE' },
      from_user_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      to_user_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      message:      { type: Sequelize.TEXT, allowNull: true },
      read_at:      { type: Sequelize.DATE, allowNull: true },
      tenant_id:    { type: Sequelize.UUID, allowNull: false },
      created_at:   { type: Sequelize.DATE, allowNull: false },
      updated_at:   { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('document_transmissions', ['to_user_id']);
    await queryInterface.addIndex('document_transmissions', ['document_id']);
    console.log('✅ Table document_transmissions créée');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('document_transmissions');
  },
};
