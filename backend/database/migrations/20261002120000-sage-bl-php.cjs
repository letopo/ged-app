'use strict';

const HSJM_TENANT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';

// Tableau de bord « BL PHP en attente de facturation » :
// - postes « Service Facturation » (facturation) et « CCG » (ccg), à attribuer
//   ensuite dans Administration › Postes & Fonctions ;
// - liste des postes autorisés à voir le tableau de bord, modifiable par le
//   superadmin depuis l'interface (défaut : facturation, DG, CCG).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    for (const [code, label, description] of [
      ['facturation', 'Service Facturation', 'Arrête les factures dans Sage ; suivi des BL PHP en attente de facturation'],
      ['ccg', 'CCG', 'Contrôle de gestion ; suivi des BL et factures PHP'],
    ]) {
      const [existing] = await queryInterface.sequelize.query(`SELECT id FROM postes WHERE code = :code`, { replacements: { code } });
      if (existing.length) { console.log(`  ⏭  poste « ${code} » déjà présent`); continue; }
      await queryInterface.bulkInsert('postes', [{
        id: Sequelize.literal('gen_random_uuid()'), code, label, description,
        tenant_id: HSJM_TENANT_ID, created_at: now, updated_at: now,
      }]);
    }
    const cols = await queryInterface.describeTable('tenant_settings');
    if (!cols.sage_bl_access_postes) {
      await queryInterface.addColumn('tenant_settings', 'sage_bl_access_postes', {
        type: Sequelize.JSONB, allowNull: false, defaultValue: ['facturation', 'dg', 'ccg'],
      });
    }
    console.log('✅ BL PHP : postes facturation / ccg et liste d’accès');
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('tenant_settings', 'sage_bl_access_postes');
    await queryInterface.sequelize.query(`DELETE FROM user_postes WHERE poste_id IN (SELECT id FROM postes WHERE code IN ('facturation', 'ccg'))`);
    await queryInterface.bulkDelete('postes', { code: ['facturation', 'ccg'] });
  },
};
