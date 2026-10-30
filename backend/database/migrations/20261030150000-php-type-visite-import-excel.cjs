'use strict';

// Module PHP — mise à jour d'après le fichier HSJM_Gestion_v3.xlsm (octobre 2026) :
//  - consultations : type de visite (CS / RDV / AUTRE) et n° d'ordre du jour,
//    colonnes ajoutées dans l'Excel depuis avril 2026 ;
//  - excel_ref sur chaque table importée : identifiant de la ligne Excel
//    (colonne N°), pour réimporter le fichier sans créer de doublons.
const TABLES = ['php_consultations', 'php_hospitalisations', 'php_operations', 'php_repos', 'php_deces_transferts'];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE php_consultations ADD COLUMN IF NOT EXISTS type_visite VARCHAR(10);
      ALTER TABLE php_consultations DROP CONSTRAINT IF EXISTS php_consultations_type_visite_check;
      ALTER TABLE php_consultations ADD CONSTRAINT php_consultations_type_visite_check
        CHECK (type_visite IS NULL OR type_visite IN ('CS', 'RDV', 'AUTRE'));
      ALTER TABLE php_consultations ADD COLUMN IF NOT EXISTS numero_ordre INTEGER;
      CREATE INDEX IF NOT EXISTS idx_php_consult_type_visite ON php_consultations(type_visite);
    `);
    for (const t of TABLES) {
      await queryInterface.sequelize.query(`
        ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS excel_ref VARCHAR(80);
        CREATE UNIQUE INDEX IF NOT EXISTS ${t}_excel_ref_key ON ${t}(excel_ref) WHERE excel_ref IS NOT NULL;
      `);
    }
  },

  down: async (queryInterface) => {
    for (const t of TABLES) {
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS ${t}_excel_ref_key;
        ALTER TABLE ${t} DROP COLUMN IF EXISTS excel_ref;
      `);
    }
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_php_consult_type_visite;
      ALTER TABLE php_consultations DROP CONSTRAINT IF EXISTS php_consultations_type_visite_check;
      ALTER TABLE php_consultations DROP COLUMN IF EXISTS type_visite;
      ALTER TABLE php_consultations DROP COLUMN IF EXISTS numero_ordre;
    `);
  },
};
