'use strict';

// Parc véhicules — inventaire hebdomadaire des ambulances (fiche RO SAU) :
//  - vehicle_checklist_templates.inventory_sections / inventory_days : lignes
//    de l'inventaire (quantités requises, péremption…) et jours (lun / mer / ven)
//  - vehicle_inventories : un inventaire signé (quantités relevées, manques,
//    liste de réassort, fiche PDF)
//  - vehicles.inventory_alerts : alertes « inventaire non fait » déjà envoyées
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const tplCols = await queryInterface.describeTable('vehicle_checklist_templates');
    if (!tplCols.inventory_sections) {
      await queryInterface.addColumn('vehicle_checklist_templates', 'inventory_sections', { type: Sequelize.JSONB, allowNull: false, defaultValue: [] });
    }
    if (!tplCols.inventory_days) {
      await queryInterface.addColumn('vehicle_checklist_templates', 'inventory_days', { type: Sequelize.JSONB, allowNull: false, defaultValue: [1, 3, 5] });
    }
    const vCols = await queryInterface.describeTable('vehicles');
    if (!vCols.inventory_alerts) {
      await queryInterface.addColumn('vehicles', 'inventory_alerts', { type: Sequelize.JSONB, allowNull: false, defaultValue: {} });
    }

    if (!tables.includes('vehicle_inventories')) {
      await queryInterface.createTable('vehicle_inventories', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
        vehicle_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'vehicles', key: 'id' }, onDelete: 'CASCADE' },
        inventory_date: { type: Sequelize.DATEONLY, allowNull: false }, // jour à Douala
        sections: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] }, // version de la fiche utilisée
        answers: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        total_items: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        answered_items: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        shortages: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        expiring: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        critical_anomaly: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        restock: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        comment: { type: Sequelize.TEXT, allowNull: true },
        performed_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
        performed_by_name: { type: Sequelize.STRING(150), allowNull: true },
        performed_at: { type: Sequelize.DATE, allowNull: false },
        signature_path: { type: Sequelize.STRING(255), allowNull: true },
        document_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'documents', key: 'id' }, onDelete: 'SET NULL' },
        sha256: { type: Sequelize.STRING(64), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });
      await queryInterface.addIndex('vehicle_inventories', ['vehicle_id', 'inventory_date']);
      await queryInterface.addIndex('vehicle_inventories', ['tenant_id', 'inventory_date']);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('vehicle_inventories');
    await queryInterface.removeColumn('vehicles', 'inventory_alerts');
    await queryInterface.removeColumn('vehicle_checklist_templates', 'inventory_days');
    await queryInterface.removeColumn('vehicle_checklist_templates', 'inventory_sections');
  },
};
