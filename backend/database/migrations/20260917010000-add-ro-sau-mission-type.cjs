'use strict';

// Ajoute le poste "chef_pole_ro_sau" et le type d'ordre de mission "RO SAU"
// (2 signataires : Chef de pôle RO SAU + Directeur Général), sur le même
// modèle que les postes/types existants (20260612120100, 20260729120100).
const HSJM_TENANT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [existingPoste] = await queryInterface.sequelize.query(
      `SELECT id FROM postes WHERE code = 'chef_pole_ro_sau'`
    );
    if (existingPoste.length === 0) {
      await queryInterface.bulkInsert('postes', [{
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'chef_pole_ro_sau',
        label: 'Chef de pôle RO SAU',
        description: 'Signataire des ordres de mission du pôle RO SAU',
        tenant_id: HSJM_TENANT_ID,
        created_at: new Date(),
        updated_at: new Date(),
      }]);
      console.log('✅ poste "chef_pole_ro_sau" créé');
    } else {
      console.log('⏭  poste "chef_pole_ro_sau" déjà présent');
    }

    const [existingType] = await queryInterface.sequelize.query(
      `SELECT id FROM ordre_mission_types WHERE code = 'ro_sau'`
    );
    if (existingType.length === 0) {
      await queryInterface.bulkInsert('ordre_mission_types', [{
        id: Sequelize.literal('gen_random_uuid()'),
        code: 'ro_sau',
        label: 'RO SAU',
        poste_chain: JSON.stringify(['chef_pole_ro_sau', 'dg']),
        is_active: true,
        tenant_id: HSJM_TENANT_ID,
        created_at: new Date(),
        updated_at: new Date(),
      }]);
      console.log('✅ type d\'ordre de mission "ro_sau" créé');
    } else {
      console.log('⏭  type d\'ordre de mission "ro_sau" déjà présent');
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('ordre_mission_types', { code: 'ro_sau' });
    await queryInterface.sequelize.query(
      `DELETE FROM user_postes WHERE poste_id = (SELECT id FROM postes WHERE code = 'chef_pole_ro_sau')`
    );
    await queryInterface.bulkDelete('postes', { code: 'chef_pole_ro_sau' });
  },
};
