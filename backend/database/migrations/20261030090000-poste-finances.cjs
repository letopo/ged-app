'use strict';

// Poste « Finances » : ouvre les pages Factures PHP (Sage) et BL PHP en attente
// (consultation et modification), sans faire de la personne une signataire
// des pièces de caisse (contrairement au poste « Comptable »).
// À attribuer dans Admin › Postes & Fonctions.
const CODE = 'finances';
const LABEL = 'Finances';
const DESCRIPTION = 'Accès aux pages Factures PHP (Sage) et BL PHP en attente';

module.exports = {
  up: async (queryInterface) => {
    const [tenants] = await queryInterface.sequelize.query('SELECT id FROM tenants');
    for (const t of tenants) {
      await queryInterface.sequelize.query(`
        INSERT INTO postes (id, code, label, description, tenant_id, created_at, updated_at)
        SELECT gen_random_uuid(), :code, :label, :description, :tenantId, NOW(), NOW()
        ON CONFLICT (code) DO NOTHING
      `, { replacements: { code: CODE, label: LABEL, description: DESCRIPTION, tenantId: t.id } });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DELETE FROM user_postes WHERE poste_id IN (SELECT id FROM postes WHERE code = '${CODE}');
      DELETE FROM postes WHERE code = '${CODE}';
    `);
  },
};
