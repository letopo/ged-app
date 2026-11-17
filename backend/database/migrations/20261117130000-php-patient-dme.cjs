'use strict';

// Module PHP : lien entre un patient PHP (agent) et sa ou ses fiches du DME
// (17/11/2026). Rempli automatiquement quand la fiche est retrouvée de façon
// sûre (même matricule ou compte Sage), sinon confirmé ou écarté à la main.
// Le n° de dossier DME est gardé pour rechercher le patient par ce numéro.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('php_patient_dme')) return;
    await queryInterface.createTable('php_patient_dme', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
      patient_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'php_patients', key: 'id' }, onDelete: 'CASCADE' },
      dme_patient_id: { type: Sequelize.INTEGER, allowNull: false },             // patients.id du DME
      dossier_numero: { type: Sequelize.STRING(50), allowNull: true },           // patients.dossier_numero du DME
      dme_nom: { type: Sequelize.STRING(220), allowNull: true },                 // nom lu dans le DME au moment du lien
      statut: { type: Sequelize.STRING(10), allowNull: false },                  // confirme | ecarte
      source: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'auto' }, // auto | manuel
      decided_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      decided_by_name: { type: Sequelize.STRING(150), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('php_patient_dme', ['patient_id', 'dme_patient_id'], { unique: true });
    await queryInterface.addIndex('php_patient_dme', ['tenant_id', 'dme_patient_id']);
    await queryInterface.addIndex('php_patient_dme', ['tenant_id', 'dossier_numero']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('php_patient_dme');
  },
};
