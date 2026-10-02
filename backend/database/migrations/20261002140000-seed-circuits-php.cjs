'use strict';

const HSJM_TENANT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';

// Modèles de workflow des factures PHP (Sage) :
// - « Circuit Facture PHP » : Service Facturation → Directeur Général → CCG
// - « Circuit Relevé Factures PHP » (relevé journalier) : Service Facturation → Directeur Général
// Étapes « par poste » : chaque facture va au titulaire actuel du poste. Pour le
// DG (deux titulaires), Michel VAUTROT est le titulaire préféré s'il l'occupe.
// Le nom de chaque étape devient le titre du cadre de signature dans le PDF.
// Modifiables ensuite dans Organisation › Modèles workflow. Pas créés s'ils existent.
module.exports = {
  up: async (queryInterface) => {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements }).then(([rows]) => rows);
    const [admin] = await q(`SELECT id FROM users WHERE role = 'superadmin' ORDER BY created_at LIMIT 1`);
    const [dg] = await q(`SELECT id FROM users WHERE upper(last_name) = 'VAUTROT' LIMIT 1`);
    const step = (n, name, posteCode, userId = null) => ({
      step: n, order: n, name, label: name, validatorType: 'poste', posteCode, userId, role: null, deadlineDays: null, onReject: 'back_to_sender',
    });
    const templates = [
      { name: 'Circuit Facture PHP', description: 'Factures patients PHP importées de Sage : arrêtée par la facturation, signée par le DG, contrôlée par la CCG.',
        categories: ['Facture PHP Sage'],
        validators: [step(1, 'Service Facturation', 'facturation'), step(2, 'Directeur Général', 'dg', dg?.id || null), step(3, 'CCG', 'ccg')] },
      { name: 'Circuit Relevé Factures PHP', description: 'Relevé journalier des factures PHP arrêtées, signé par le DG en fin de journée.',
        categories: ['Relevé Factures PHP'],
        validators: [step(1, 'Service Facturation', 'facturation'), step(2, 'Directeur Général', 'dg', dg?.id || null)] },
    ];
    for (const t of templates) {
      const exists = await q(`SELECT id FROM workflow_templates WHERE name = :name AND tenant_id = :tenant`, { name: t.name, tenant: HSJM_TENANT_ID });
      if (exists.length) { console.log(`  ⏭  modèle « ${t.name} » déjà présent`); continue; }
      await q(`INSERT INTO workflow_templates (id, name, description, categories, validators, created_by, is_active, tenant_id, created_at, updated_at)
               VALUES (gen_random_uuid(), :name, :description, CAST(:categories AS jsonb), CAST(:validators AS jsonb), :createdBy, true, :tenant, now(), now())`,
      { name: t.name, description: t.description, categories: JSON.stringify(t.categories), validators: JSON.stringify(t.validators), createdBy: admin?.id || null, tenant: HSJM_TENANT_ID });
      console.log(`✅ modèle « ${t.name} » créé`);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`DELETE FROM workflow_templates WHERE name IN ('Circuit Facture PHP', 'Circuit Relevé Factures PHP') AND tenant_id = '${HSJM_TENANT_ID}'`);
  },
};
