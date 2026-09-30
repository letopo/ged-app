'use strict';

// Un numéro de pièce Sage n'est unique qu'au sein d'une organisation : deux
// tenants peuvent avoir chacun une facture « FA00123 ». L'unicité globale de
// sage_doc_piece devient une unicité (tenant_id, sage_doc_piece).
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE sage_facture_imports DROP CONSTRAINT IF EXISTS sage_facture_imports_sage_doc_piece_key');
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS sage_facture_imports_tenant_piece ON sage_facture_imports (tenant_id, sage_doc_piece)');
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS sage_facture_imports_tenant_piece');
    await queryInterface.sequelize.query(
      'ALTER TABLE sage_facture_imports ADD CONSTRAINT sage_facture_imports_sage_doc_piece_key UNIQUE (sage_doc_piece)');
  },
};
