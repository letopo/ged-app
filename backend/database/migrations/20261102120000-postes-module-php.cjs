'use strict';

// Postes d'accès au module PHP (à attribuer dans Admin › Postes & Fonctions),
// en plus des administrateurs et du rôle « Point Focal PHP » :
//  - php         : utilisation complète (patients, consultations, import Excel) ;
//  - php_lecture : consultation seule (listes, statistiques, exports).
const POSTES = [
  ['php', 'Module PHP', 'Utilisation complète du module PHP — Point Focal Hôpital (patients, consultations, import Excel)'],
  ['php_lecture', 'Module PHP — consultation', 'Consultation seule du module PHP : listes, statistiques et exports'],
];

module.exports = {
  up: async (queryInterface) => {
    const [tenants] = await queryInterface.sequelize.query('SELECT id FROM tenants');
    for (const t of tenants) {
      for (const [code, label, description] of POSTES) {
        await queryInterface.sequelize.query(`
          INSERT INTO postes (id, code, label, description, tenant_id, created_at, updated_at)
          SELECT gen_random_uuid(), :code, :label, :description, :tenantId, NOW(), NOW()
          ON CONFLICT (code) DO NOTHING
        `, { replacements: { code, label, description, tenantId: t.id } });
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DELETE FROM user_postes WHERE poste_id IN (SELECT id FROM postes WHERE code IN ('php', 'php_lecture'));
      DELETE FROM postes WHERE code IN ('php', 'php_lecture');
    `);
  },
};
