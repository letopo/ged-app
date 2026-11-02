'use strict';

// Discussion d'un document : messages automatiques (validation, signature,
// transmission…), sans auteur. Table créée au démarrage du serveur sur une
// installation neuve (server.js ajoute aussi la colonne).
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        IF to_regclass('public.chat_messages') IS NOT NULL THEN
          ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;
        END IF;
      END $$;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE IF EXISTS chat_messages DROP COLUMN IF EXISTS is_system;');
  },
};
