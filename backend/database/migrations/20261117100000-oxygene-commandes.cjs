'use strict';

// Parc véhicules — retours de la responsable RO SAU (17/11/2026) :
//  - commandes de bouteilles d'oxygène, passées ou signalées par le Biomédical
//    (vehicle_oxygen_orders) ;
//  - « bouteilles commandées » relevées avec la réserve à la prise de poste
//    (vehicle_shift_checks.reserve_ordered) ;
//  - plus de contrôle de départ / retour pour les ambulances : l'OM est monté
//    au retour, l'ambulance est contrôlée à la prise de poste.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('vehicle_oxygen_orders')) {
      await queryInterface.createTable('vehicle_oxygen_orders', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
        quantity: { type: Sequelize.INTEGER, allowNull: false },
        supplier: { type: Sequelize.STRING(150), allowNull: true },
        // ged : commande enregistrée dans la GED ; externe : déjà faite (téléphone, bon papier…)
        source: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'ged' },
        ordered_on: { type: Sequelize.DATEONLY, allowNull: false },
        expected_on: { type: Sequelize.DATEONLY, allowNull: true },
        note: { type: Sequelize.STRING(500), allowNull: true },
        status: { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'commandee' }, // commandee | recue | annulee
        ordered_by: { type: Sequelize.UUID, allowNull: true },
        ordered_by_name: { type: Sequelize.STRING(150), allowNull: true },
        received_quantity: { type: Sequelize.INTEGER, allowNull: true },
        received_at: { type: Sequelize.DATE, allowNull: true },
        received_by: { type: Sequelize.UUID, allowNull: true },
        received_by_name: { type: Sequelize.STRING(150), allowNull: true },
        cancel_reason: { type: Sequelize.STRING(300), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });
      await queryInterface.addIndex('vehicle_oxygen_orders', ['tenant_id', 'status']);
    }
    const cols = await queryInterface.describeTable('vehicle_shift_checks');
    if (!cols.reserve_ordered) {
      await queryInterface.addColumn('vehicle_shift_checks', 'reserve_ordered', { type: Sequelize.INTEGER, allowNull: true });
    }
    await queryInterface.sequelize.query("UPDATE vehicle_checklist_templates SET mission_checks = false WHERE vehicle_type = 'ambulance'");
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('vehicle_shift_checks', 'reserve_ordered');
    await queryInterface.dropTable('vehicle_oxygen_orders');
  },
};
