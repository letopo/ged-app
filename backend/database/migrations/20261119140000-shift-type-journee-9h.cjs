'use strict';

// Planning des Moyens Généraux (19/11/2026) : code « J° » = journée 09 h - 17 h 30,
// utilisé sur le planning papier. Ajouté pour chaque établissement qui a déjà le code « J ».
module.exports = {
  up: async (queryInterface) => {
    const [deja] = await queryInterface.sequelize.query(`SELECT 1 FROM shift_types WHERE code = 'J°' LIMIT 1`);
    if (deja.length) return;
    await queryInterface.sequelize.query(`
      INSERT INTO shift_types (id, code, name, description, color, start_time, end_time, is_work_day, is_night_shift,
        requires_notification, notification_hours_before, is_active, created_at, updated_at, tenant_id)
      SELECT gen_random_uuid(), 'J°', 'Journée', 'Journée : 09 h - 17 h 30', '#38bdf8', '09:00', '17:30', true, false,
        false, 24, true, NOW(), NOW(), tenant_id
      FROM shift_types WHERE code = 'J'
      LIMIT 1`);
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`DELETE FROM shift_types WHERE code = 'J°'
      AND NOT EXISTS (SELECT 1 FROM schedule_assignments a WHERE a.shift_code = 'J°')`);
  },
};
