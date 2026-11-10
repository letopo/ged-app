'use strict';

// Parc véhicules — retour de la responsable RO SAU (09/11/2026) :
//  - vehicle_shift_checks : fiche « Prise de poste » du matin, les deux
//    ambulances sur une seule fiche (matériel vital + bouteilles d'oxygène à
//    bord) et le stock d'oxygène en réserve (pleines / vides)
//  - vehicle_checklist_templates.mission_checks : contrôles départ / retour à
//    chaque mission ; désactivés pour les ambulances (faits à la prise de poste)
//  - vehicle_inventories.unchanged / based_on_id : « Rien n'a changé » confirmé
//    en un geste (aucune sortie ni réarmement depuis l'inventaire précédent)
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('vehicle_shift_checks')) {
      await queryInterface.createTable('vehicle_shift_checks', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
        shift_date: { type: Sequelize.DATEONLY, allowNull: false }, // jour à Douala
        vehicles: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        reserve_full: { type: Sequelize.INTEGER, allowNull: true },
        reserve_empty: { type: Sequelize.INTEGER, allowNull: true },
        oxygen_level: { type: Sequelize.STRING(20), allowNull: true }, // ok | commander | urgent
        anomalies: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        critical_anomaly: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
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
      await queryInterface.addIndex('vehicle_shift_checks', ['tenant_id', 'shift_date']);
    }

    const tplCols = await queryInterface.describeTable('vehicle_checklist_templates');
    if (!tplCols.mission_checks) {
      await queryInterface.addColumn('vehicle_checklist_templates', 'mission_checks', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true });
      // Ambulances : contrôles faits à la prise de poste, plus à chaque mission
      await queryInterface.sequelize.query("UPDATE vehicle_checklist_templates SET mission_checks = false WHERE vehicle_type = 'ambulance'");
    }

    const invCols = await queryInterface.describeTable('vehicle_inventories');
    if (!invCols.unchanged) {
      await queryInterface.addColumn('vehicle_inventories', 'unchanged', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    }
    if (!invCols.based_on_id) {
      await queryInterface.addColumn('vehicle_inventories', 'based_on_id', { type: Sequelize.UUID, allowNull: true });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('vehicle_inventories', 'based_on_id');
    await queryInterface.removeColumn('vehicle_inventories', 'unchanged');
    await queryInterface.removeColumn('vehicle_checklist_templates', 'mission_checks');
    await queryInterface.dropTable('vehicle_shift_checks');
  },
};
