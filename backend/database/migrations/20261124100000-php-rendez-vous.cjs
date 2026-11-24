'use strict';

// Rendez-vous du module PHP (24/11/2026). La table php_rendez_vous n'avait
// jamais eu de migration : présente en dev (ancien sync), absente en prod, où
// la fenêtre « Rendez-vous » et l'enregistrement d'un RDV depuis une
// consultation échouaient. Même définition que la table de dev.
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS php_rendez_vous (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id uuid NOT NULL REFERENCES php_patients(id) ON DELETE CASCADE,
        consultation_id uuid REFERENCES php_consultations(id) ON DELETE SET NULL,
        date_rdv date NOT NULL,
        heure_rdv time without time zone,
        service varchar(255),
        motif text,
        notes text,
        status varchar(20) NOT NULL DEFAULT 'planifie'
          CONSTRAINT php_rendez_vous_status_check CHECK (status IN ('planifie', 'honore', 'annule', 'reporte')),
        cree_par_id uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryInterface.sequelize.query('CREATE INDEX IF NOT EXISTS idx_php_rdv_date ON php_rendez_vous (date_rdv)');
    await queryInterface.sequelize.query('CREATE INDEX IF NOT EXISTS idx_php_rdv_patient ON php_rendez_vous (patient_id)');
    await queryInterface.sequelize.query('CREATE INDEX IF NOT EXISTS idx_php_rdv_status ON php_rendez_vous (status)');
  },
  // Ne supprime pas la table : elle existait déjà en dev avec des données
  down: async () => {},
};
