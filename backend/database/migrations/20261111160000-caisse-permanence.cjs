'use strict';

// Caisse de permanence de la pharmacie (11/11/2026) : remplace le classeur
// « CAISSE HSJM.xlsx » (une feuille par service de jour 7 h-16 h 30 / de nuit
// 16 h 30-7 h, réécrite chaque semaine). Une séance par service ; le solde
// d'ouverture reprend les espèces comptées à la clôture de la séance précédente.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('caisse_permanence_seances')) {
      await queryInterface.createTable('caisse_permanence_seances', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
        date: { type: Sequelize.DATEONLY, allowNull: false },
        periode: { type: Sequelize.STRING(5), allowNull: false },                 // jour | nuit
        statut: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'ouverte' }, // ouverte | cloturee
        caissiere_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
        caissiere_nom: { type: Sequelize.STRING(150), allowNull: true },
        precedente_id: { type: Sequelize.UUID, allowNull: true },
        solde_ouverture: { type: Sequelize.DECIMAL(14, 0), allowNull: false, defaultValue: 0 },
        montant_recu: { type: Sequelize.DECIMAL(14, 0), allowNull: true },          // compté à la passation
        ecart_reception: { type: Sequelize.DECIMAL(14, 0), allowNull: true },
        note_ouverture: { type: Sequelize.STRING(500), allowNull: true },
        especes_comptees: { type: Sequelize.DECIMAL(14, 0), allowNull: true },
        billetage: { type: Sequelize.JSONB, allowNull: true },
        solde_theorique: { type: Sequelize.DECIMAL(14, 0), allowNull: true },
        ecart_cloture: { type: Sequelize.DECIMAL(14, 0), allowNull: true },
        note_cloture: { type: Sequelize.STRING(500), allowNull: true },
        cloturee_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });
      await queryInterface.addIndex('caisse_permanence_seances', ['tenant_id', 'date', 'periode'], { unique: true });
      await queryInterface.addIndex('caisse_permanence_seances', ['tenant_id', 'statut']);
    }
    if (!tables.includes('caisse_permanence_mouvements')) {
      await queryInterface.createTable('caisse_permanence_mouvements', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
        seance_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'caisse_permanence_seances', key: 'id' }, onDelete: 'CASCADE' },
        type: { type: Sequelize.STRING(10), allowNull: false },                     // caution | recette | sortie
        mode: { type: Sequelize.STRING(15), allowNull: false, defaultValue: 'especes' }, // especes | orange_money
        libelle: { type: Sequelize.STRING(120), allowNull: false },
        patient_nom: { type: Sequelize.STRING(150), allowNull: true },
        montant: { type: Sequelize.DECIMAL(14, 0), allowNull: false },
        saisi_par: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
        saisi_par_nom: { type: Sequelize.STRING(150), allowNull: true },
        annule: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        motif_annulation: { type: Sequelize.STRING(300), allowNull: true },
        annule_par_nom: { type: Sequelize.STRING(150), allowNull: true },
        annule_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });
      await queryInterface.addIndex('caisse_permanence_mouvements', ['seance_id']);
      await queryInterface.addIndex('caisse_permanence_mouvements', ['tenant_id', 'patient_nom']);
    }
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('caisse_permanence_mouvements');
    await queryInterface.dropTable('caisse_permanence_seances');
  },
};
