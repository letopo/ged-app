'use strict';

// Module PHP › Patients : comptes tiers Sage d'un agent (11/11/2026). La GED
// propose les comptes qui portent son matricule dans Sage ; on ne garde ici que
// les décisions (confirmé / écarté) et les comptes ajoutés à la main.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('php_patient_comptes_sage')) return;
    await queryInterface.createTable('php_patient_comptes_sage', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
      patient_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'php_patients', key: 'id' }, onDelete: 'CASCADE' },
      compte_tiers: { type: Sequelize.STRING(17), allowNull: false },
      statut: { type: Sequelize.STRING(10), allowNull: false },          // confirme | ecarte
      source: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'auto' }, // auto (matricule) | manuel
      decided_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      decided_by_name: { type: Sequelize.STRING(150), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('php_patient_comptes_sage', ['patient_id', 'compte_tiers'], { unique: true });
    await queryInterface.addIndex('php_patient_comptes_sage', ['tenant_id', 'compte_tiers']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('php_patient_comptes_sage');
  },
};
