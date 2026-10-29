'use strict';

// État du serveur (superadministrateur) : tables propres au serveur, pas à un
// établissement (pas de tenant_id).
//  - server_health_samples : une mesure par jour (disque, uploads, base,
//    sauvegardes) pour la tendance et l'estimation avant saturation ;
//  - server_health_state : seuils réglables (clé 'thresholds') et dernier
//    niveau d'alerte envoyé par e-mail (clé 'alerts', évite les renvois).
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS server_health_samples (
        day            DATE PRIMARY KEY,
        disk_total     BIGINT NOT NULL,
        disk_used      BIGINT NOT NULL,
        uploads_bytes  BIGINT,
        db_bytes       BIGINT,
        backups_bytes  BIGINT,
        measured_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS server_health_state (
        key         VARCHAR(40) PRIMARY KEY,
        value       JSONB NOT NULL,
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS server_health_samples;
      DROP TABLE IF EXISTS server_health_state;
    `);
  },
};
