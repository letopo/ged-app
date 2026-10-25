'use strict';

// Parc véhicules (étape 1 : ambulances RO SAU)
//  - vehicles                     : fiche véhicule, état (disponible / en mission / indisponible)
//  - vehicle_checklist_templates  : check-list modèle en sections (Véhicule → chauffeur,
//                                   Matériel médical → soignant), modifiable dans l'interface
//  - vehicle_missions             : sortie d'un véhicule (liée à l'ordre de mission, ou
//                                   « sortie urgente » rattachée à l'OM créé ensuite)
//  - vehicle_checks               : contrôle départ / retour d'une section, figé une fois signé
// + poste « chef_securite_logistique » (gestion du parc) dans chaque tenant.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const ts = {
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    };
    const tenant = { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' };
    const userRef = { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' };

    if (!tables.includes('vehicle_checklist_templates')) {
      await queryInterface.createTable('vehicle_checklist_templates', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: tenant,
        name: { type: Sequelize.STRING(150), allowNull: false },
        vehicle_type: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'ambulance' },
        sections: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        updated_by: userRef,
        ...ts,
      });
    }

    if (!tables.includes('vehicles')) {
      await queryInterface.createTable('vehicles', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: tenant,
        label: { type: Sequelize.STRING(120), allowNull: false },
        immatriculation: { type: Sequelize.STRING(40), allowNull: false },
        vehicle_type: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'ambulance' },
        service_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'services', key: 'id' }, onDelete: 'SET NULL' },
        manager_poste_code: { type: Sequelize.STRING(60), allowNull: true },
        checklist_template_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'vehicle_checklist_templates', key: 'id' }, onDelete: 'SET NULL' },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'disponible' }, // disponible | en_mission | indisponible
        unavailable_reason: { type: Sequelize.STRING(255), allowNull: true },
        mileage: { type: Sequelize.INTEGER, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
      await queryInterface.addIndex('vehicles', ['tenant_id', 'immatriculation'], { unique: true, name: 'vehicles_tenant_immat_uq' });
    }

    if (!tables.includes('vehicle_missions')) {
      await queryInterface.createTable('vehicle_missions', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: tenant,
        vehicle_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'vehicles', key: 'id' }, onDelete: 'CASCADE' },
        document_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'documents', key: 'id' }, onDelete: 'SET NULL' },
        title: { type: Sequelize.STRING(255), allowNull: true },
        destination: { type: Sequelize.STRING(255), allowNull: true },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'planifiee' }, // planifiee | en_cours | terminee | annulee
        planned_departure_at: { type: Sequelize.DATE, allowNull: true },
        planned_return_at: { type: Sequelize.DATE, allowNull: true },
        departed_at: { type: Sequelize.DATE, allowNull: true },
        returned_at: { type: Sequelize.DATE, allowNull: true },
        crew: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        urgent: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        om_after_departure: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        alerts_sent: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        created_by: userRef,
        ...ts,
      });
      await queryInterface.addIndex('vehicle_missions', ['vehicle_id', 'status'], { name: 'vehicle_missions_vehicle_status' });
      await queryInterface.addIndex('vehicle_missions', ['document_id'], { name: 'vehicle_missions_document' });
    }

    if (!tables.includes('vehicle_checks')) {
      await queryInterface.createTable('vehicle_checks', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: tenant,
        vehicle_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'vehicles', key: 'id' }, onDelete: 'CASCADE' },
        mission_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'vehicle_missions', key: 'id' }, onDelete: 'CASCADE' },
        phase: { type: Sequelize.STRING(10), allowNull: false },          // depart | retour
        section_key: { type: Sequelize.STRING(40), allowNull: false },    // vehicule | materiel | …
        section_label: { type: Sequelize.STRING(120), allowNull: false },
        items: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },   // modèle figé au moment du contrôle
        answers: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        total_items: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        answered_items: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        anomalies: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        critical_anomaly: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        mileage: { type: Sequelize.INTEGER, allowNull: true },
        comment: { type: Sequelize.TEXT, allowNull: true },
        performed_by: userRef,
        performed_by_name: { type: Sequelize.STRING(150), allowNull: true },
        performed_at: { type: Sequelize.DATE, allowNull: false },
        signature_path: { type: Sequelize.STRING(255), allowNull: true },
        document_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'documents', key: 'id' }, onDelete: 'SET NULL' },
        sha256: { type: Sequelize.STRING(64), allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex('vehicle_checks', ['mission_id', 'phase', 'section_key'], { unique: true, name: 'vehicle_checks_mission_phase_section_uq' });
      await queryInterface.addIndex('vehicle_checks', ['vehicle_id', 'performed_at'], { name: 'vehicle_checks_vehicle_date' });
    }

    // Poste « Chef sécurité logistique » (gestion du parc) dans chaque tenant
    const [tenants] = await queryInterface.sequelize.query('SELECT id FROM tenants');
    for (const t of tenants) {
      await queryInterface.sequelize.query(`
        INSERT INTO postes (id, code, label, description, tenant_id, created_at, updated_at)
        SELECT gen_random_uuid(), 'chef_securite_logistique', 'Chef sécurité logistique',
               'Gestion du parc de véhicules : fiches, check-lists, contrôles et anomalies', :tenantId, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM postes WHERE code = 'chef_securite_logistique' AND tenant_id = :tenantId)
      `, { replacements: { tenantId: t.id } });
    }
    console.log('✅ Parc véhicules : tables et poste chef_securite_logistique prêts');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('vehicle_checks');
    await queryInterface.dropTable('vehicle_missions');
    await queryInterface.dropTable('vehicles');
    await queryInterface.dropTable('vehicle_checklist_templates');
    await queryInterface.sequelize.query(
      `DELETE FROM user_postes WHERE poste_id IN (SELECT id FROM postes WHERE code = 'chef_securite_logistique')`
    );
    await queryInterface.sequelize.query(`DELETE FROM postes WHERE code = 'chef_securite_logistique'`);
  },
};
