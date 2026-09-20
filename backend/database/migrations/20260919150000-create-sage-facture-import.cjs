'use strict';

// Suivi des factures patient PHP importées automatiquement depuis Sage
// (SQL Server, base HSJM) par le job backend/src/utils/sageFactureSync.js.
// Chaque ligne correspond à une pièce Sage (F_DOCENTETE.DO_Piece) déjà
// transformée en Document GED + circuit de validation — sert uniquement à
// éviter les doublons d'import et à garder une trace brute pour audit.
// À ne pas confondre avec `php_factures` (factures FOURNISSEURS scannées par
// la secrétaire, module totalement différent).

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sage_facture_imports', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },

      // F_DOCENTETE.DO_Piece côté Sage (ex: "FA00000311670") — anti-doublon
      sage_doc_piece:   { type: Sequelize.STRING(64), allowNull: false, unique: true },
      // F_COMPTET.CT_Num du patient/client Sage
      sage_client_num:  { type: Sequelize.STRING(64), allowNull: true },
      patient_nom:      { type: Sequelize.STRING(255), allowNull: true },
      // Clé de regroupement des pièces d'un même passage patient (à affiner)
      encounter_key:    { type: Sequelize.STRING(128), allowNull: true },

      montant_ht:       { type: Sequelize.DECIMAL(18, 2), allowNull: true },
      montant_ttc:      { type: Sequelize.DECIMAL(18, 2), allowNull: true },

      document_id:      { type: Sequelize.UUID, allowNull: true, references: { model: 'documents', key: 'id' }, onDelete: 'SET NULL' },

      // Copie brute des lignes Sage au moment de l'import (audit/traçabilité)
      raw_snapshot:     { type: Sequelize.JSONB, allowNull: true },

      imported_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },

      tenant_id:        { type: Sequelize.UUID, allowNull: false },

      created_at:       { type: Sequelize.DATE, allowNull: false },
      updated_at:       { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('sage_facture_imports', ['sage_client_num']);
    await queryInterface.addIndex('sage_facture_imports', ['encounter_key']);
    await queryInterface.addIndex('sage_facture_imports', ['tenant_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('sage_facture_imports');
  },
};
