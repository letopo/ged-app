'use strict';

// Notes « Nouveautés » rédigées par un administrateur depuis l'application
// (page Nouveautés → Rédiger). Elles s'ajoutent à celles livrées avec le code
// (frontend src/releaseNotes.js) et s'affichent de la même façon : fenêtre à
// l'ouverture (target 'app'), bulle sur une page ('/archives') ou un
// formulaire ('form:piece-de-caisse'), une seule fois par utilisateur.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('release_notes')) {
      console.log('ℹ️  release_notes existe déjà, rien à faire.');
      return;
    }
    await queryInterface.createTable('release_notes', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      title:        { type: Sequelize.STRING(200), allowNull: false },
      // Une nouveauté par ligne
      items:        { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      // 'app' | chemin de page ('/archives') | 'form:<clé>'
      target:       { type: Sequelize.STRING(120), allowNull: false, defaultValue: 'app' },
      // 'all' | 'admins'
      audience:     { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'all' },
      // 'draft' | 'published'
      status:       { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'draft' },
      published_at: { type: Sequelize.DATE, allowNull: true },
      created_by:   { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      tenant_id:    { type: Sequelize.UUID, allowNull: false },
      created_at:   { type: Sequelize.DATE, allowNull: false },
      updated_at:   { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('release_notes', ['tenant_id', 'status']);
    console.log('✅ Table release_notes créée');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('release_notes');
  },
};
