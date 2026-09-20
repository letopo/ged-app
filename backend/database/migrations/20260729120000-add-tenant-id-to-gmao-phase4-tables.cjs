'use strict';

const HSJM_TENANT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';

// Tables Phase 4 du GMAO créées sans tenant_id (contrats, pièces, mouvements,
// acquisitions, budget) — absentes des migrations tenant précédentes.
const MISSING_TABLES = [
  'gmao_contrats',
  'gmao_pieces_rechange',
  'gmao_mouvements_pieces',
  'gmao_acquisitions',
  'gmao_budget_lignes',
  'gmao_budget_depenses',
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const table of MISSING_TABLES) {
      const [tables] = await queryInterface.sequelize.query(
        `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='${table}'`
      );
      if (tables.length === 0) {
        console.log(`⚠️  Table ${table} introuvable, ignorée`);
        continue;
      }

      const [cols] = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = '${table}' AND column_name = 'tenant_id'`
      );
      if (cols.length > 0) {
        console.log(`  ⏭  ${table}: tenant_id déjà présent`);
        continue;
      }

      await queryInterface.addColumn(table, 'tenant_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onDelete: 'CASCADE',
      });

      await queryInterface.sequelize.query(
        `UPDATE "${table}" SET tenant_id = '${HSJM_TENANT_ID}'`
      );

      await queryInterface.changeColumn(table, 'tenant_id', {
        type: Sequelize.UUID,
        allowNull: false,
      });

      await queryInterface.addIndex(table, ['tenant_id'], {
        name: `${table}_tenant_id_idx`,
      });

      console.log(`✅ tenant_id ajouté → ${table}`);
    }
  },

  down: async (queryInterface) => {
    for (const table of MISSING_TABLES) {
      try {
        await queryInterface.removeIndex(table, `${table}_tenant_id_idx`);
        await queryInterface.removeColumn(table, 'tenant_id');
      } catch (e) { /* ignore */ }
    }
  },
};
