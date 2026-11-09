'use strict';

// Parc véhicules — manques « ouverts » des ambulances (demande RO SAU, 09/11/2026).
// Un manque relevé à l'inventaire reste ouvert jusqu'à ce qu'il soit réarmé :
// l'inventaire suivant le retrouve au lieu de le recréer.
// Circuit : a_commander → commande (bon papier envoyé à la pharmacie) → rearme.
//  - kind : manque (quantité), peremption (périme ce mois), niveau (pression
//    sous le minimum), panne (Pas OK)
//  - quantity : ce qui manque encore ; ordered_qty : déjà commandé
//  - history : [{ at, by, action, qty, note }]
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('vehicle_shortages')) return;
    await queryInterface.createTable('vehicle_shortages', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
      vehicle_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'vehicles', key: 'id' }, onDelete: 'CASCADE' },
      item_id: { type: Sequelize.STRING(60), allowNull: false },
      kind: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'manque' },
      label: { type: Sequelize.STRING(200), allowNull: false },
      section: { type: Sequelize.STRING(120), allowNull: true },
      unit: { type: Sequelize.STRING(30), allowNull: true },
      critical: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      quantity: { type: Sequelize.INTEGER, allowNull: true },
      ordered_qty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      restocked_qty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'a_commander' },
      opened_at: { type: Sequelize.DATE, allowNull: false },
      opened_inventory_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'vehicle_inventories', key: 'id' }, onDelete: 'SET NULL' },
      last_seen_at: { type: Sequelize.DATE, allowNull: true },
      ordered_at: { type: Sequelize.DATE, allowNull: true },
      ordered_by_name: { type: Sequelize.STRING(150), allowNull: true },
      order_note: { type: Sequelize.STRING(255), allowNull: true },
      closed_at: { type: Sequelize.DATE, allowNull: true },
      closed_by_name: { type: Sequelize.STRING(150), allowNull: true },
      closed_reason: { type: Sequelize.STRING(30), allowNull: true }, // rearme | inventaire | annule
      history: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('vehicle_shortages', ['vehicle_id', 'status']);
    await queryInterface.addIndex('vehicle_shortages', ['tenant_id', 'status']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('vehicle_shortages');
  },
};
