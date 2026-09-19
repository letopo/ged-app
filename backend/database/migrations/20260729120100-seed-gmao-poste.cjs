'use strict';

const HSJM_TENANT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';

// Ajoute le poste "gmao" au catalogue — remplace l'ancienne liste d'emails
// codée en dur dans routes/gmao.js. Les titulaires s'assignent ensuite via
// l'admin "Postes & Fonctions" (ou l'API POST /postes/:code/holders).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM postes WHERE code = 'gmao'`
    );
    if (existing.length > 0) {
      console.log('  ⏭  poste "gmao" déjà présent');
      return;
    }

    const now = new Date();
    await queryInterface.bulkInsert('postes', [{
      id: Sequelize.literal('gen_random_uuid()'),
      code: 'gmao',
      label: 'Responsable GMAO',
      description: 'Accès au module de maintenance des équipements',
      tenant_id: HSJM_TENANT_ID,
      created_at: now,
      updated_at: now,
    }]);

    // Pré-assigne les anciens comptes whitelistés par email, pour continuité d'accès.
    const assignByEmail = async (email) => {
      await queryInterface.sequelize.query(`
        INSERT INTO user_postes (id, poste_id, user_id, assigned_at, created_at, updated_at)
        SELECT gen_random_uuid(), p.id, u.id, now(), now(), now()
        FROM postes p, users u
        WHERE p.code = 'gmao' AND lower(u.email) = lower(:email)
        ON CONFLICT ON CONSTRAINT user_postes_poste_user_unique DO NOTHING
      `, { replacements: { email } });
    };
    await assignByEmail('hsjm.cellulebiomedicale@gmail.com');
    await assignByEmail('hsjm.pharma@gmail.com');
    await assignByEmail('hopitalcameroun@ordredemaltefrance.org');

    console.log('✅ poste "gmao" créé et pré-assigné aux anciens comptes whitelistés');
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DELETE FROM user_postes WHERE poste_id = (SELECT id FROM postes WHERE code = 'gmao')
    `);
    await queryInterface.bulkDelete('postes', { code: 'gmao' });
  },
};
