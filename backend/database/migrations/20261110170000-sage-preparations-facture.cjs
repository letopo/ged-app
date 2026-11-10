'use strict';

// Facturation assistée (10/11/2026), en attendant le module Objets Métiers :
// la GED prépare la facture d'un BPC (liste exacte des BL), la facturation la
// crée dans Sage comme aujourd'hui, puis la GED la retrouve (lecture seule),
// contrôle qu'elle contient bien tous les BL et l'envoie en signature.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('sage_preparations_facture')) return;
    await queryInterface.createTable('sage_preparations_facture', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
      compte_tiers: { type: Sequelize.STRING(17), allowNull: false },
      patient_nom: { type: Sequelize.STRING(255), allowNull: true },
      patient_type: { type: Sequelize.STRING(40), allowNull: true },
      bpc_start: { type: Sequelize.DATEONLY, allowNull: false },
      bpc_end: { type: Sequelize.DATEONLY, allowNull: false },
      bl: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },          // [{ piece, date, service, montant }]
      montant: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
      // a_transformer | incomplete | facturee | annulee
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'a_transformer' },
      factures: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },    // factures Sage trouvées
      manquants: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },   // BL préparés pas encore facturés
      oublies: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },     // BL du BPC restés en BL, non préparés
      checked_at: { type: Sequelize.DATE, allowNull: true },
      invoiced_at: { type: Sequelize.DATE, allowNull: true },
      note: { type: Sequelize.STRING(500), allowNull: true },
      prepared_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      prepared_by_name: { type: Sequelize.STRING(150), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('sage_preparations_facture', ['tenant_id', 'status']);
    await queryInterface.addIndex('sage_preparations_facture', ['tenant_id', 'compte_tiers', 'bpc_start']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('sage_preparations_facture');
  },
};
