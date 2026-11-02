'use strict';

// Discussion : mettre une conversation en sourdine (plus de notifications).
// Table créée au démarrage du serveur sur une installation neuve (server.js
// ajoute aussi la colonne).
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        IF to_regclass('public.chat_conversation_members') IS NOT NULL THEN
          ALTER TABLE chat_conversation_members ADD COLUMN IF NOT EXISTS muted BOOLEAN NOT NULL DEFAULT false;
        END IF;
      END $$;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE IF EXISTS chat_conversation_members DROP COLUMN IF EXISTS muted;');
  },
};
