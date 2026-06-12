'use strict';

// Les 3 types d'ordre de mission et leur chaîne de validation (codes de poste).
// Le chef du service demandeur est ajouté en tête à la construction du workflow,
// le comptable en fin si la mission ouvre droit aux frais.

const TYPES = [
  { code: 'paramedical',   label: 'Paramédical',       chain: ['dds', 'ds', 'dg'] },
  { code: 'administratif', label: 'Administratif',     chain: ['chef_de_pole', 'dg'] },
  { code: 'strategie',     label: 'Stratégie avancée', chain: ['medecin_chef', 'dg'] },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ordre_mission_types', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      code:        { type: Sequelize.STRING(40), allowNull: false, unique: true },
      label:       { type: Sequelize.STRING(100), allowNull: false },
      poste_chain: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      is_active:   { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at:  { type: Sequelize.DATE, allowNull: false },
      updated_at:  { type: Sequelize.DATE, allowNull: false },
    });

    const now = new Date();
    await queryInterface.bulkInsert('ordre_mission_types', TYPES.map(t => ({
      id: Sequelize.literal('gen_random_uuid()'),
      code: t.code,
      label: t.label,
      poste_chain: JSON.stringify(t.chain),
      is_active: true,
      created_at: now,
      updated_at: now,
    })));
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ordre_mission_types');
  },
};
