'use strict';

// Module PHP, lot 3 : registre de pharmacie (feuille PHARMACIE de l'Excel du
// Point Focal). Une ligne = un produit prescrit à un patient, avec sa source
// (pharmacie HSJM, hôpital extérieur, médecin du travail), la quantité
// prescrite et la quantité servie ; le reste à servir s'en déduit.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS php_pharmacie_lignes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        patient_id UUID NOT NULL REFERENCES php_patients(id) ON DELETE CASCADE,
        consultation_id UUID REFERENCES php_consultations(id) ON DELETE SET NULL,
        date_prescription DATE NOT NULL,
        source VARCHAR(20) NOT NULL DEFAULT 'hsjm',
        produit VARCHAR(255) NOT NULL,
        quantite_prescrite INTEGER NOT NULL DEFAULT 1,
        quantite_servie INTEGER NOT NULL DEFAULT 0,
        servi_le TIMESTAMPTZ,
        servi_par_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        excel_ref VARCHAR(80),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS php_pharmacie_tenant_date ON php_pharmacie_lignes (tenant_id, date_prescription);
      CREATE INDEX IF NOT EXISTS php_pharmacie_patient ON php_pharmacie_lignes (patient_id);
      CREATE INDEX IF NOT EXISTS php_pharmacie_consultation ON php_pharmacie_lignes (consultation_id);
      CREATE INDEX IF NOT EXISTS php_pharmacie_excel_ref ON php_pharmacie_lignes (excel_ref);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS php_pharmacie_lignes;');
  },
};
