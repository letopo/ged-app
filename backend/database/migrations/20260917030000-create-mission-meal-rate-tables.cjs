'use strict';

const HSJM_TENANT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('mission_meal_rates', {
      id:                      { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      categorie:               { type: Sequelize.STRING, allowNull: false },
      montant_petit_dejeuner:  { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      montant_dejeuner:        { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      montant_diner:           { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      tenant_id:               { type: Sequelize.UUID, allowNull: false },
      created_at:              { type: Sequelize.DATE, allowNull: false },
      updated_at:              { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('mission_meal_rates', ['tenant_id', 'categorie'], { unique: true });

    await queryInterface.createTable('mission_meal_thresholds', {
      id:                            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      heure_limite_petit_dejeuner:   { type: Sequelize.TIME, allowNull: false, defaultValue: '07:00:00' },
      heure_limite_diner:            { type: Sequelize.TIME, allowNull: false, defaultValue: '20:00:00' },
      tenant_id:                     { type: Sequelize.UUID, allowNull: false, unique: true },
      created_at:                    { type: Sequelize.DATE, allowNull: false },
      updated_at:                    { type: Sequelize.DATE, allowNull: false },
    });

    // Ligne de seuils par défaut pour le tenant existant, éditable ensuite via la modale.
    await queryInterface.bulkInsert('mission_meal_thresholds', [{
      id: Sequelize.literal('gen_random_uuid()'),
      heure_limite_petit_dejeuner: '07:00:00',
      heure_limite_diner: '20:00:00',
      tenant_id: HSJM_TENANT_ID,
      created_at: new Date(),
      updated_at: new Date(),
    }]);
    console.log('✅ Tables mission_meal_rates / mission_meal_thresholds créées (seuils par défaut : 07:00 / 20:00)');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('mission_meal_thresholds');
    await queryInterface.dropTable('mission_meal_rates');
  },
};
