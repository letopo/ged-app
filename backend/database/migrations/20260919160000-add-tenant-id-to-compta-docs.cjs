'use strict';

// La table compta_docs a été restaurée depuis une sauvegarde antérieure à
// l'ajout de la colonne tenant_id (celle-ci n'était créée que pour les
// NOUVELLES installations via le bootstrap CREATE TABLE IF NOT EXISTS dans
// server.js, qui ne modifie jamais une table déjà existante). Le modèle
// ComptaDoc exige cette colonne (NOT NULL) → toutes les requêtes
// échouaient avec "column ComptaDoc.tenant_id does not exist".
const HSJM_TENANT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('compta_docs');
    if (table.tenant_id) {
      console.log('ℹ️  compta_docs.tenant_id existe déjà, rien à faire.');
      return;
    }

    await queryInterface.addColumn('compta_docs', 'tenant_id', {
      type: Sequelize.UUID,
      allowNull: true, // NOT NULL appliqué après backfill, ci-dessous
    });

    await queryInterface.sequelize.query(
      `UPDATE compta_docs SET tenant_id = :tenantId WHERE tenant_id IS NULL`,
      { replacements: { tenantId: HSJM_TENANT_ID } }
    );

    await queryInterface.changeColumn('compta_docs', 'tenant_id', {
      type: Sequelize.UUID,
      allowNull: false,
    });

    console.log('✅ Colonne tenant_id ajoutée et renseignée sur compta_docs');
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('compta_docs', 'tenant_id');
  },
};
