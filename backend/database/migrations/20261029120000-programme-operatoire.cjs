'use strict';

// Programme opératoire de la semaine rempli en même temps par tous les services
// (Chirurgie, Gynécologie, Pédiatrie…) : une semaine = un programme, chaque
// service y ajoute ses interventions jusqu'au vendredi 12 h précédent, puis le
// responsable du programme le clôt et l'envoie au Médecin Chef puis au DG.
//  - postes « Saisie du programme opératoire » et « Responsable du programme
//    opératoire » (à attribuer dans Admin › Postes & Fonctions) ;
//  - liste des services réglable par établissement (tenant_settings.bloc_services).
const POSTES = [
  ['bloc_saisie', 'Saisie du programme opératoire', 'Ajoute les interventions de son service au programme opératoire de la semaine'],
  ['bloc_responsable', 'Responsable du programme opératoire', 'Clôt le programme opératoire de la semaine et l\'envoie au Médecin Chef puis au DG'],
];
const DEFAULT_SERVICES = ['Chirurgie', 'Gynécologie', 'Pédiatrie', 'Médecine', 'ORL', 'Ophtalmologie'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS bloc_programmes (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        week_start   DATE NOT NULL,
        status       VARCHAR(20) NOT NULL DEFAULT 'ouvert',
        closed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
        closed_at    TIMESTAMPTZ,
        document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
        tenant_id    UUID NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, week_start)
      );
      CREATE TABLE IF NOT EXISTS bloc_interventions (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        programme_id         UUID NOT NULL REFERENCES bloc_programmes(id) ON DELETE CASCADE,
        service              VARCHAR(80) NOT NULL,
        jour                 VARCHAR(10) NOT NULL,
        nom_patient          VARCHAR(160) NOT NULL,
        age                  VARCHAR(20),
        nature_intervention  TEXT NOT NULL,
        intervenant          VARCHAR(120),
        numero_salle         VARCHAR(20),
        created_by           UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_by           UUID REFERENCES users(id) ON DELETE SET NULL,
        tenant_id            UUID NOT NULL,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_bloc_interventions_programme ON bloc_interventions(programme_id);
    `);

    const cols = await queryInterface.describeTable('tenant_settings');
    if (!cols.bloc_services) {
      await queryInterface.addColumn('tenant_settings', 'bloc_services', {
        type: Sequelize.JSONB, allowNull: false, defaultValue: DEFAULT_SERVICES,
      });
    }

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
      DELETE FROM user_postes WHERE poste_id IN (SELECT id FROM postes WHERE code IN ('bloc_saisie', 'bloc_responsable'));
      DELETE FROM postes WHERE code IN ('bloc_saisie', 'bloc_responsable');
      DROP TABLE IF EXISTS bloc_interventions;
      DROP TABLE IF EXISTS bloc_programmes;
    `);
    await queryInterface.removeColumn('tenant_settings', 'bloc_services');
  },
};
