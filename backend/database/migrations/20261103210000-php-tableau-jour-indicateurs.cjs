'use strict';

// Module PHP, lot 2 (tableau du jour, indicateurs) :
//  - infirmerie et secteur enregistrés sur chaque consultation, comme dans
//    l'Excel du Point Focal (la fiche du patient peut changer ensuite) ;
//    l'existant reprend ceux de la fiche patient, l'import Excel les corrige
//    d'après la ligne de consultation ;
//  - indicateurs par mots-clés du diagnostic (paludisme, IST…), modifiables.
const DEFAUTS = [
  ['Paludisme', ['PALU'], 1],
  ['IST', ['IST', 'URETRIT', 'ECOULEMENT URETRAL', 'CHLAMYD', 'GONOC', 'SYPHIL', 'CHANCRE', 'CONDYLOM'], 2],
];

module.exports = {
  async up(queryInterface) {
    const q = (sql, opts) => queryInterface.sequelize.query(sql, opts);
    await q(`
      ALTER TABLE php_consultations
        ADD COLUMN IF NOT EXISTS infirmerie_id UUID REFERENCES php_infirmeries(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS secteur_id UUID REFERENCES php_secteurs(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS php_consultations_infirmerie_date ON php_consultations (date_consultation, infirmerie_id);
      UPDATE php_consultations c
         SET infirmerie_id = COALESCE(c.infirmerie_id, p.infirmerie_id), secteur_id = COALESCE(c.secteur_id, p.secteur_id)
        FROM php_patients p
       WHERE p.id = c.patient_id AND (c.infirmerie_id IS NULL OR c.secteur_id IS NULL);

      CREATE TABLE IF NOT EXISTS php_indicateurs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        libelle VARCHAR(100) NOT NULL,
        mots_cles JSONB NOT NULL DEFAULT '[]',
        ordre INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS php_indicateurs_tenant ON php_indicateurs (tenant_id, ordre);
    `);
    const [tenants] = await q('SELECT id FROM tenants');
    for (const t of tenants) {
      const [[{ n }]] = await q('SELECT count(*)::int AS n FROM php_indicateurs WHERE tenant_id = :t', { replacements: { t: t.id } });
      if (n) continue;
      for (const [libelle, mots, ordre] of DEFAUTS) {
        await q('INSERT INTO php_indicateurs (tenant_id, libelle, mots_cles, ordre) VALUES (:t, :libelle, :mots::jsonb, :ordre)',
          { replacements: { t: t.id, libelle, mots: JSON.stringify(mots), ordre } });
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS php_indicateurs;
      DROP INDEX IF EXISTS php_consultations_infirmerie_date;
      ALTER TABLE php_consultations DROP COLUMN IF EXISTS secteur_id, DROP COLUMN IF EXISTS infirmerie_id;
    `);
  },
};
