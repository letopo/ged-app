'use strict';

// Discussion : taille du fichier joint et document de la GED partagé dans un
// message. La table est créée au démarrage du serveur sur une installation
// neuve (server.js, qui ajoute aussi ces colonnes) : rien à faire si elle
// n'existe pas encore.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        IF to_regclass('public.chat_messages') IS NOT NULL THEN
          ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_size INTEGER;
          ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_document_id UUID;
        END IF;
      END $$;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE IF EXISTS chat_messages DROP COLUMN IF EXISTS attachment_document_id;
      ALTER TABLE IF EXISTS chat_messages DROP COLUMN IF EXISTS attachment_size;
    `);
  },
};
