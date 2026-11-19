'use strict';

// Planning RO SAU (19/11/2026) : codes composés du planning papier.
//   F/J : formation et assure les référencements de jour
//   F/N : formation la journée + travail de nuit
//   R/F : repos de 7h30 à 14h + formation l'après-midi
// Ajoutés pour l'établissement qui a déjà le code « F » (Formation).
const CODES = [
  ['F/J', 'Formation et assure les référencements de jour', '#0ea5e9', true, false],
  ['F/N', 'Formation la journée + travail de nuit', '#1e3a8a', true, true],
  ['R/F', 'Repos de 7h30 à 14h + formation l\'après-midi', '#a78bfa', true, false],
];

module.exports = {
  up: async (queryInterface) => {
    for (const [code, name, color, travail, nuit] of CODES) {
      const [deja] = await queryInterface.sequelize.query('SELECT 1 FROM shift_types WHERE code = :code LIMIT 1', { replacements: { code } });
      if (deja.length) continue;
      await queryInterface.sequelize.query(`
        INSERT INTO shift_types (id, code, name, description, color, start_time, end_time, is_work_day, is_night_shift,
          requires_notification, notification_hours_before, is_active, created_at, updated_at, tenant_id)
        SELECT gen_random_uuid(), :code, :name, :name, :color, NULL, NULL, :travail, :nuit, false, 24, true, NOW(), NOW(), tenant_id
        FROM shift_types WHERE code = 'F' LIMIT 1`, { replacements: { code, name, color, travail, nuit } });
    }
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`DELETE FROM shift_types WHERE code IN ('F/J', 'F/N', 'R/F')
      AND NOT EXISTS (SELECT 1 FROM schedule_assignments a WHERE a.shift_code = shift_types.code)`);
  },
};
