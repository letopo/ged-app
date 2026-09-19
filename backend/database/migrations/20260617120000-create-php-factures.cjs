'use strict';

// Module factures PHP (secrétaire) : registre des factures/proformas des
// prestataires. La secrétaire scanne la pièce, l'importe dans la GED, lui
// attribue un numéro comptable, et les champs métier (fournisseur, date de
// facture, n° de facture, montant) sont pré-remplis par l'extraction OCR/IA.
// Reproduit son tableau Excel : N° DATE | DATE | DESIGNATION | DATE FACTURE |
// N° FACTURE | N° C | MONTANT.

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('php_factures', {
      id:              { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },

      // N° DATE — numéro d'ordre séquentiel attribué à la saisie
      numero_ordre:    { type: Sequelize.INTEGER, allowNull: true },
      // DATE — date de réception/saisie (défaut = aujourd'hui)
      date_reception:  { type: Sequelize.DATEONLY, allowNull: true },

      // DESIGNATION — nom du fournisseur (extrait par l'IA)
      fournisseur:     { type: Sequelize.STRING(255), allowNull: true },
      // DATE FACTURE — date de la facture (extraite)
      date_facture:    { type: Sequelize.DATEONLY, allowNull: true },
      // N° FACTURE — numéro de la facture (extrait)
      numero_facture:  { type: Sequelize.STRING(120), allowNull: true },
      // N° C — code comptable interne attribué par la secrétaire
      numero_comptable:{ type: Sequelize.STRING(120), allowNull: true },
      // MONTANT — montant total (extrait)
      montant:         { type: Sequelize.DECIMAL(18, 2), allowNull: true },
      devise:          { type: Sequelize.STRING(8), allowNull: false, defaultValue: 'XAF' },

      // Pièce archivée dans la GED
      document_id:     { type: Sequelize.UUID, allowNull: true, references: { model: 'documents', key: 'id' }, onDelete: 'SET NULL' },

      statut:          { type: Sequelize.ENUM('brouillon', 'valide'), allowNull: false, defaultValue: 'brouillon' },

      // Sortie brute de l'extraction (audit / réentraînement éventuel)
      extraction:      { type: Sequelize.JSONB, allowNull: true },

      saisi_par:       { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },

      created_at:      { type: Sequelize.DATE, allowNull: false },
      updated_at:      { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('php_factures', ['numero_ordre']);
    await queryInterface.addIndex('php_factures', ['fournisseur']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('php_factures');
    // Nettoyer le type ENUM créé par Postgres
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_php_factures_statut";');
  },
};
