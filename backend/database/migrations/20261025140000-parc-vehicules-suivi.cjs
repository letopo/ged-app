'use strict';

// Parc véhicules — étape 3 (tout le parc, chef sécurité logistique) :
//  - fiche véhicule enrichie (marque, modèle, année, carburant, châssis)
//  - vehicle_deadlines     : échéances (assurance, visite technique, vidange…) par date et/ou km
//  - vehicle_fuel_logs     : pleins de carburant (litres, montant, km)
//  - vehicle_maintenances  : entretiens et réparations (coût, garage, facture)
//  - vehicle_missions.destination déjà présent ; km départ / retour lus sur les contrôles
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const ts = {
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    };
    const tenant = { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' };
    const vehicle = { type: Sequelize.UUID, allowNull: false, references: { model: 'vehicles', key: 'id' }, onDelete: 'CASCADE' };
    const userRef = { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' };

    const cols = await queryInterface.describeTable('vehicles');
    const add = async (name, def) => { if (!cols[name]) await queryInterface.addColumn('vehicles', name, def); };
    await add('brand', { type: Sequelize.STRING(60), allowNull: true });
    await add('model', { type: Sequelize.STRING(60), allowNull: true });
    await add('year', { type: Sequelize.INTEGER, allowNull: true });
    await add('fuel_type', { type: Sequelize.STRING(20), allowNull: true }); // diesel | essence | autre
    await add('vin', { type: Sequelize.STRING(40), allowNull: true });

    if (!tables.includes('vehicle_deadlines')) {
      await queryInterface.createTable('vehicle_deadlines', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: tenant,
        vehicle_id: vehicle,
        kind: { type: Sequelize.STRING(30), allowNull: false },       // assurance | visite_technique | vidange | extincteur | autre
        label: { type: Sequelize.STRING(120), allowNull: false },
        due_date: { type: Sequelize.DATEONLY, allowNull: true },
        due_mileage: { type: Sequelize.INTEGER, allowNull: true },
        interval_months: { type: Sequelize.INTEGER, allowNull: true },
        interval_km: { type: Sequelize.INTEGER, allowNull: true },
        last_done_date: { type: Sequelize.DATEONLY, allowNull: true },
        last_done_mileage: { type: Sequelize.INTEGER, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        attachment_path: { type: Sequelize.STRING(255), allowNull: true },
        alerts_sent: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        ...ts,
      });
      await queryInterface.addIndex('vehicle_deadlines', ['vehicle_id'], { name: 'vehicle_deadlines_vehicle' });
    }

    if (!tables.includes('vehicle_fuel_logs')) {
      await queryInterface.createTable('vehicle_fuel_logs', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: tenant,
        vehicle_id: vehicle,
        date: { type: Sequelize.DATEONLY, allowNull: false },
        liters: { type: Sequelize.DECIMAL(8, 2), allowNull: false },
        amount: { type: Sequelize.INTEGER, allowNull: true },          // FCFA
        mileage: { type: Sequelize.INTEGER, allowNull: true },
        full_tank: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        station: { type: Sequelize.STRING(120), allowNull: true },
        attachment_path: { type: Sequelize.STRING(255), allowNull: true },
        created_by: userRef,
        created_by_name: { type: Sequelize.STRING(150), allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex('vehicle_fuel_logs', ['vehicle_id', 'date'], { name: 'vehicle_fuel_logs_vehicle_date' });
    }

    if (!tables.includes('vehicle_maintenances')) {
      await queryInterface.createTable('vehicle_maintenances', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: tenant,
        vehicle_id: vehicle,
        kind: { type: Sequelize.STRING(30), allowNull: false },        // vidange | reparation | pneus | freins | revision | carrosserie | autre
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'terminee' }, // a_faire | en_cours | terminee
        date: { type: Sequelize.DATEONLY, allowNull: false },
        mileage: { type: Sequelize.INTEGER, allowNull: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        garage: { type: Sequelize.STRING(120), allowNull: true },
        cost: { type: Sequelize.INTEGER, allowNull: true },             // FCFA
        attachment_path: { type: Sequelize.STRING(255), allowNull: true },
        deadline_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'vehicle_deadlines', key: 'id' }, onDelete: 'SET NULL' },
        check_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'vehicle_checks', key: 'id' }, onDelete: 'SET NULL' },
        created_by: userRef,
        created_by_name: { type: Sequelize.STRING(150), allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex('vehicle_maintenances', ['vehicle_id', 'date'], { name: 'vehicle_maintenances_vehicle_date' });
    }
    console.log('✅ Parc véhicules : échéances, carburant et entretien prêts');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('vehicle_maintenances');
    await queryInterface.dropTable('vehicle_fuel_logs');
    await queryInterface.dropTable('vehicle_deadlines');
    for (const c of ['brand', 'model', 'year', 'fuel_type', 'vin']) await queryInterface.removeColumn('vehicles', c);
  },
};
