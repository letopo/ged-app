'use strict';

// Module PHP (demande du personnel PHP, 06/11/2026) : le secteur PENJA EST
// quitte l'Infirmerie Nyombe pour l'Infirmerie PHP Bas, historique compris.
// Les secteurs mal saisis dans le classeur (abréviations « P EST » / « P OUEST »,
// fautes de frappe LOUM1, IOUM1, LOUM2, LOUN2, BOUBOPU, NJOMBE) sont fusionnés
// dans le bon secteur, de la même infirmerie (PENJA OUEST reste à Nyombe).
// L'import Excel applique la même règle (SECTEUR_ALIASES et SECTEUR_INFIRMERIE
// dans utils/phpExcelImport.js).
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    // 1. Secteurs mal saisis fusionnés dans le bon (renommés si celui-ci n'existe pas)
    const FUSIONS = [
      ['SEC_P_EST', 'SEC_PENJA_EST', 'PENJA EST'],
      ['SEC_P_OUEST', 'SEC_PENJA_OUEST', 'PENJA OUEST'],
      ['SEC_LOUM1', 'SEC_LOUM_1', 'LOUM 1'],
      ['SEC_IOUM1', 'SEC_LOUM_1', 'LOUM 1'],
      ['SEC_LOUM2', 'SEC_LOUM_2', 'LOUM 2'],
      ['SEC_LOUN2', 'SEC_LOUM_2', 'LOUM 2'],
      ['SEC_BOUBOPU', 'SEC_BOUBOU', 'BOUBOU'],
      ['SEC_NJOMBE', 'SEC_NYOMBE', 'NYOMBE'],
    ];
    for (const [abrege, complet, nom] of FUSIONS) {
      await q(`
        UPDATE php_secteurs p SET code = '${complet}', nom = '${nom}', updated_at = now()
         WHERE p.code = '${abrege}'
           AND NOT EXISTS (SELECT 1 FROM php_secteurs s WHERE s.code = '${complet}');
      `);
      for (const table of ['php_patients', 'php_consultations']) {
        await q(`
          UPDATE ${table} t SET secteur_id = s.id
            FROM php_secteurs p JOIN php_secteurs s ON s.code = '${complet}' AND s.tenant_id = p.tenant_id
           WHERE p.code = '${abrege}' AND t.secteur_id = p.id;
        `);
      }
      await q(`DELETE FROM php_secteurs WHERE code = '${abrege}';`);
    }

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
