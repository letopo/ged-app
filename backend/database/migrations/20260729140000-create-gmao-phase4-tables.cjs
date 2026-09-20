'use strict';

// Crée les 6 tables Phase 4 du GMAO (Contrats, Pièces de rechange, Mouvements
// de stock, Demandes d'acquisition, Budget) — jamais migrées en production,
// seulement testées en local via un modèle Sequelize sans migration associée.
// tenant_id est inclus dès la création (cohérent avec le hook CLS global).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
    };
    const tenantId = {
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onDelete: 'CASCADE',
      },
    };

    await queryInterface.createTable('gmao_contrats', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      reference: { type: Sequelize.STRING(50), allowNull: true },
      prestataire: { type: Sequelize.STRING(255), allowNull: false },
      type_contrat: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'maintenance_totale' },
      date_debut: { type: Sequelize.DATEONLY, allowNull: false },
      date_fin: { type: Sequelize.DATEONLY, allowNull: false },
      montant: { type: Sequelize.FLOAT, allowNull: true },
      periodicite: { type: Sequelize.STRING(20), allowNull: true },
      equipements_couverts: { type: Sequelize.TEXT, allowNull: true },
      services_couverts: { type: Sequelize.TEXT, allowNull: true },
      statut: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'actif' },
      description: { type: Sequelize.TEXT, allowNull: true },
      contact_prestataire: { type: Sequelize.STRING(255), allowNull: true },
      telephone: { type: Sequelize.STRING(30), allowNull: true },
      email: { type: Sequelize.STRING(255), allowNull: true },
      alerte_renouvellement: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 30 },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      ...tenantId,
      ...timestamps,
    });

    await queryInterface.createTable('gmao_pieces_rechange', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      reference: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      designation: { type: Sequelize.STRING(255), allowNull: false },
      categorie: { type: Sequelize.STRING(100), allowNull: true },
      quantite_stock: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      quantite_min: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      unite: { type: Sequelize.STRING(30), allowNull: true, defaultValue: 'unité' },
      prix_unitaire: { type: Sequelize.FLOAT, allowNull: true },
      fournisseur: { type: Sequelize.STRING(255), allowNull: true },
      localisation: { type: Sequelize.STRING(100), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      ...tenantId,
      ...timestamps,
    });

    await queryInterface.createTable('gmao_mouvements_pieces', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      piece_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'gmao_pieces_rechange', key: 'id' }, onDelete: 'CASCADE' },
      type: { type: Sequelize.STRING(20), allowNull: false },
      quantite: { type: Sequelize.INTEGER, allowNull: false },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      // Pas de FK stricte vers `interventions` : cette table est créée au
      // démarrage de l'app (server.js), pas par une migration — sur une base
      // neuve elle n'existe pas encore à ce stade. Intégrité gérée côté appli.
      intervention_id: { type: Sequelize.INTEGER, allowNull: true },
      motif: { type: Sequelize.STRING(255), allowNull: true },
      prix_unitaire: { type: Sequelize.FLOAT, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      ...tenantId,
      ...timestamps,
    });

    await queryInterface.createTable('gmao_acquisitions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      reference: { type: Sequelize.STRING(50), allowNull: true },
      designation: { type: Sequelize.STRING(255), allowNull: false },
      type_equipement: { type: Sequelize.STRING(100), allowNull: true },
      quantite: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      service_demandeur: { type: Sequelize.STRING(100), allowNull: true },
      demandeur_nom: { type: Sequelize.STRING(255), allowNull: true },
      demandeur_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      priorite: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'normale' },
      motif: { type: Sequelize.TEXT, allowNull: true },
      specifications: { type: Sequelize.TEXT, allowNull: true },
      budget_estime: { type: Sequelize.FLOAT, allowNull: true },
      statut: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'en_attente' },
      date_demande: { type: Sequelize.DATEONLY, allowNull: false },
      date_approbation: { type: Sequelize.DATEONLY, allowNull: true },
      date_commande: { type: Sequelize.DATEONLY, allowNull: true },
      date_reception: { type: Sequelize.DATEONLY, allowNull: true },
      fournisseur: { type: Sequelize.STRING(255), allowNull: true },
      numero_commande: { type: Sequelize.STRING(100), allowNull: true },
      prix_achat: { type: Sequelize.FLOAT, allowNull: true },
      // Pas de FK stricte vers `equipements` : table créée au démarrage de
      // l'app (server.js), absente à ce stade sur une base neuve.
      equipement_id: { type: Sequelize.INTEGER, allowNull: true },
      motif_rejet: { type: Sequelize.TEXT, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      ...tenantId,
      ...timestamps,
    });

    await queryInterface.createTable('gmao_budget_lignes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      annee: { type: Sequelize.INTEGER, allowNull: false },
      categorie: { type: Sequelize.STRING(100), allowNull: false },
      montant: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
      description: { type: Sequelize.TEXT, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      ...tenantId,
      ...timestamps,
    });

    await queryInterface.createTable('gmao_budget_depenses', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      annee: { type: Sequelize.INTEGER, allowNull: false },
      type: { type: Sequelize.STRING(10), allowNull: false },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      description: { type: Sequelize.STRING(500), allowNull: true },
      categorie: { type: Sequelize.STRING(100), allowNull: true },
      montant: { type: Sequelize.FLOAT, allowNull: false },
      fournisseur: { type: Sequelize.STRING(255), allowNull: true },
      numero_facture: { type: Sequelize.STRING(100), allowNull: true },
      montant_ht: { type: Sequelize.FLOAT, allowNull: true },
      tva: { type: Sequelize.FLOAT, allowNull: true },
      statut_facture: { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'en_attente' },
      created_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      ...tenantId,
      ...timestamps,
    });

    // Index tenant_id (cohérent avec les autres tables multi-tenant)
    for (const table of ['gmao_contrats', 'gmao_pieces_rechange', 'gmao_mouvements_pieces', 'gmao_acquisitions', 'gmao_budget_lignes', 'gmao_budget_depenses']) {
      await queryInterface.addIndex(table, ['tenant_id'], { name: `${table}_tenant_id_idx` });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('gmao_mouvements_pieces');
    await queryInterface.dropTable('gmao_pieces_rechange');
    await queryInterface.dropTable('gmao_acquisitions');
    await queryInterface.dropTable('gmao_budget_depenses');
    await queryInterface.dropTable('gmao_budget_lignes');
    await queryInterface.dropTable('gmao_contrats');
  },
};
