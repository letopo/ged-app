'use strict';

// Postes organisationnels assignables (comptable, DG, DDS, DS, médecin chef,
// chef de pôle, RH, achat) — remplacent les identités figées par email dans le
// routage des workflows. Un poste est détenu par 0..n utilisateurs (table N-N).

const POSTES = [
  { code: 'comptable',     label: 'Comptable',            description: 'Création des pièces de caisse / imputation budgétaire' },
  { code: 'dg',            label: 'Directeur Général',    description: 'Validation finale' },
  { code: 'rh',            label: 'Ressources Humaines',  description: 'Documents et catégories RH' },
  { code: 'dds',           label: 'Directrice des Soins', description: 'Ordre de mission paramédical' },
  { code: 'ds',            label: 'Directeur du Soutien', description: 'Ordre de mission paramédical' },
  { code: 'medecin_chef',  label: 'Médecin Chef',         description: 'Ordre de mission stratégie avancée' },
  { code: 'chef_de_pole',  label: 'Chef de pôle',         description: 'Ordre de mission administratif' },
  { code: 'achat',         label: 'Service Achat',        description: "Demandes d'achat" },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1) Catalogue des postes
    await queryInterface.createTable('postes', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      code:        { type: Sequelize.STRING(40), allowNull: false, unique: true },
      label:       { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.STRING(255), allowNull: true },
      created_at:  { type: Sequelize.DATE, allowNull: false },
      updated_at:  { type: Sequelize.DATE, allowNull: false },
    });

    // 2) Assignations poste <-> utilisateur (N-N)
    await queryInterface.createTable('user_postes', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      poste_id:    { type: Sequelize.UUID, allowNull: false, references: { model: 'postes', key: 'id' }, onDelete: 'CASCADE' },
      user_id:     { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      assigned_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      assigned_at: { type: Sequelize.DATE, allowNull: false },
      created_at:  { type: Sequelize.DATE, allowNull: false },
      updated_at:  { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint('user_postes', {
      fields: ['poste_id', 'user_id'],
      type: 'unique',
      name: 'user_postes_poste_user_unique',
    });

    // 3) Seed du catalogue
    const now = new Date();
    await queryInterface.bulkInsert('postes', POSTES.map(p => ({
      id: Sequelize.literal('gen_random_uuid()'),
      code: p.code, label: p.label, description: p.description,
      created_at: now, updated_at: now,
    })));

    // 4) Data-migration : pré-assigner DG et RH depuis les emails connus
    const assignByEmail = async (posteCode, email) => {
      await queryInterface.sequelize.query(`
        INSERT INTO user_postes (id, poste_id, user_id, assigned_at, created_at, updated_at)
        SELECT gen_random_uuid(), p.id, u.id, now(), now(), now()
        FROM postes p, users u
        WHERE p.code = :posteCode AND lower(u.email) = lower(:email)
        ON CONFLICT ON CONSTRAINT user_postes_poste_user_unique DO NOTHING
      `, { replacements: { posteCode, email } });
    };
    await assignByEmail('dg', 'hopitalcameroun@ordredemaltefrance.org');
    await assignByEmail('rh', 'hsjm.rh@gmail.com');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('user_postes');
    await queryInterface.dropTable('postes');
  },
};
