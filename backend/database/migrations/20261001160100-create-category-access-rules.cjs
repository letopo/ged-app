'use strict';

// Confidentialité par type de document (Paramètres › Confidentialité) : une
// catégorie restreinte n'est visible que par les administrateurs et les
// titulaires des postes choisis (+ auteur, validateurs et destinataires si
// include_participants). Remplace les listes écrites dans le code
// (HR_ONLY_CATEGORIES, COMPTA_ONLY_CATEGORIES) : les deux règles existantes
// sont recréées pour chaque tenant, à l'identique.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('category_access_rules')) {
      await queryInterface.createTable('category_access_rules', {
        id:                   { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id:            { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
        category:             { type: Sequelize.STRING(150), allowNull: false },
        allowed_postes:       { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        include_participants: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        updated_by:           { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
        created_at:           { type: Sequelize.DATE, allowNull: false },
        updated_at:           { type: Sequelize.DATE, allowNull: false },
      });
      await queryInterface.addIndex('category_access_rules', ['tenant_id', 'category'], { unique: true, name: 'category_access_rules_tenant_category' });
    }

    // Règles historiques, pour chaque tenant existant (comportement inchangé :
    // plafond strict, sans exception pour l'auteur ni les validateurs)
    const [tenants] = await queryInterface.sequelize.query('SELECT id FROM tenants');
    const now = new Date();
    for (const { id } of tenants) {
      for (const [category, postes] of [['Attestation de départ en congé annuel', ['rh']], ['Pièce comptable', ['comptable']]]) {
        await queryInterface.sequelize.query(
          `INSERT INTO category_access_rules (id, tenant_id, category, allowed_postes, include_participants, created_at, updated_at)
           VALUES (gen_random_uuid(), :tenantId, :category, :postes::jsonb, false, :now, :now)
           ON CONFLICT (tenant_id, category) DO NOTHING`,
          { replacements: { tenantId: id, category, postes: JSON.stringify(postes), now } },
        );
      }
    }
    console.log(`✅ Règles de confidentialité initialisées pour ${tenants.length} tenant(s)`);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('category_access_rules');
  },
};
