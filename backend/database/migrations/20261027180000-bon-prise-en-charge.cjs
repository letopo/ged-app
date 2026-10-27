'use strict';

// Bon de prise en charge (BPC) du personnel : circuit Médecin du travail →
// RH (complète l'assuré) → DG, puis envoi à l'accueil (ouverture du BPC dans Sage).
//  - poste « Médecin du travail » dans chaque établissement (à attribuer au
//    chef de service de médecine dans Admin › Postes & Fonctions) ;
//  - formulaire réservé (diagnostic médical) : médecin du travail, RH et
//    administrateurs (cf. TEMPLATE_POSTES dans templatePermissionController).
module.exports = {
  up: async (queryInterface) => {
    const [tenants] = await queryInterface.sequelize.query('SELECT id FROM tenants ORDER BY created_at ASC');
    for (const t of tenants) {
      await queryInterface.sequelize.query(`
        INSERT INTO postes (id, code, label, description, tenant_id, created_at, updated_at)
        SELECT gen_random_uuid(), 'medecin_travail', 'Médecin du travail',
               'Déclenche et vise les bons de prise en charge du personnel', :tenantId, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM postes WHERE code = 'medecin_travail' AND tenant_id = :tenantId)
      `, { replacements: { tenantId: t.id } });
    }

    // Formulaire restreint (la table est créée au démarrage de l'application :
    // sur une base neuve, le bouton « Synchroniser » des permissions l'ajoutera)
    const tables = await queryInterface.showAllTables();
    if (tables.includes('template_permissions') && tenants.length) {
      await queryInterface.sequelize.query(`
        INSERT INTO template_permissions (id, template_name, allowed_roles, allowed_user_ids, is_restricted, description, default_visibility, tenant_id, created_at, updated_at)
        SELECT gen_random_uuid(), 'Bon de prise en charge', '[]', '[]', TRUE,
               'Médecin du travail, RH et administrateurs', 'personal', :tenantId, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM template_permissions WHERE template_name = 'Bon de prise en charge')
      `, { replacements: { tenantId: tenants[0].id } });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`DELETE FROM template_permissions WHERE template_name = 'Bon de prise en charge'`).catch(() => {});
    await queryInterface.sequelize.query(
      `DELETE FROM user_postes WHERE poste_id IN (SELECT id FROM postes WHERE code = 'medecin_travail')`
    );
    await queryInterface.sequelize.query(`DELETE FROM postes WHERE code = 'medecin_travail'`);
  },
};
