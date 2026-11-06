'use strict';

// Module PHP (demande du personnel PHP, 06/11/2026) : le secteur PENJA EST
// quitte l'Infirmerie Nyombe pour l'Infirmerie PHP Bas, historique compris.
// « P EST », saisi à la main dans le classeur, est le même secteur : il est
// fusionné dans PENJA EST. L'import Excel applique la même règle
// (SECTEUR_ALIASES et SECTEUR_INFIRMERIE dans utils/phpExcelImport.js).
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    // 1. « P EST » → PENJA EST (renommé s'il n'existe pas encore de PENJA EST)
    await q(`
      UPDATE php_secteurs p SET code = 'SEC_PENJA_EST', nom = 'PENJA EST', updated_at = now()
       WHERE p.code = 'SEC_P_EST'
         AND NOT EXISTS (SELECT 1 FROM php_secteurs s WHERE s.code = 'SEC_PENJA_EST');
    `);
    for (const table of ['php_patients', 'php_consultations']) {
      await q(`
        UPDATE ${table} t SET secteur_id = s.id
          FROM php_secteurs p JOIN php_secteurs s ON s.code = 'SEC_PENJA_EST' AND s.tenant_id = p.tenant_id
         WHERE p.code = 'SEC_P_EST' AND t.secteur_id = p.id;
      `);
    }
    await q(`DELETE FROM php_secteurs WHERE code = 'SEC_P_EST';`);

    // 2. PENJA EST, ses patients et toutes ses consultations → INF_PHP_BAS
    await q(`
      UPDATE php_secteurs s SET infirmerie_id = i.id, updated_at = now()
        FROM php_infirmeries i
       WHERE s.code = 'SEC_PENJA_EST' AND i.code = 'INF_PHP_BAS' AND i.tenant_id = s.tenant_id;
    `);
    for (const table of ['php_patients', 'php_consultations']) {
      await q(`
        UPDATE ${table} t SET infirmerie_id = s.infirmerie_id
          FROM php_secteurs s
         WHERE s.code = 'SEC_PENJA_EST' AND t.secteur_id = s.id
           AND t.infirmerie_id IS DISTINCT FROM s.infirmerie_id;
      `);
    }
  },

  // Seul le rattachement du secteur est rendu à Nyombe : l'infirmerie d'origine
  // de chaque consultation n'est pas conservée (un réimport du classeur la rétablit
  // si la règle de l'import est retirée).
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE php_secteurs s SET infirmerie_id = i.id, updated_at = now()
        FROM php_infirmeries i
       WHERE s.code = 'SEC_PENJA_EST' AND i.code = 'INF_NYOMBE' AND i.tenant_id = s.tenant_id;
    `);
  },
};
