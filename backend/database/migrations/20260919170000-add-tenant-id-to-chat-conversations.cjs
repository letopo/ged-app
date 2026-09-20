'use strict';

// Même cause que compta_docs (migration 20260919160000) : chat_conversations
// a été restaurée depuis une sauvegarde antérieure à l'ajout de tenant_id,
// colonne que le modèle Conversation exige (NOT NULL). Provoquait un 500
// sur POST /api/chat/conversations (création d'une nouvelle discussion).
const HSJM_TENANT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('chat_conversations');
    if (table.tenant_id) {
      console.log('ℹ️  chat_conversations.tenant_id existe déjà, rien à faire.');
      return;
    }

    await queryInterface.addColumn('chat_conversations', 'tenant_id', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.sequelize.query(
      `UPDATE chat_conversations SET tenant_id = :tenantId WHERE tenant_id IS NULL`,
      { replacements: { tenantId: HSJM_TENANT_ID } }
    );

    await queryInterface.changeColumn('chat_conversations', 'tenant_id', {
      type: Sequelize.UUID,
      allowNull: false,
    });

    console.log('✅ Colonne tenant_id ajoutée et renseignée sur chat_conversations');
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('chat_conversations', 'tenant_id');
  },
};
