'use strict';

// Aligne le calcul des indemnités de mission sur la note de service réelle :
// - petit-déjeuner si départ ≤ 07:30 (au lieu de 07:00)
// - déjeuner si la mission couvre la fenêtre 12h-14h
// - dîner si la mission couvre la fenêtre 18h-20h
// - prime de sécurité (montant fixe, par personne) si retour ≥ 20h
// - hébergement (par catégorie) si la mission dure plus d'une journée
// - péage chauffeur (montant fixe) si un conducteur est désigné sur l'OM
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('mission_meal_rates', 'montant_hebergement', {
      type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0,
    });

    await queryInterface.addColumn('mission_meal_thresholds', 'heure_dejeuner_debut', {
      type: Sequelize.TIME, allowNull: false, defaultValue: '12:00:00',
    });
    await queryInterface.addColumn('mission_meal_thresholds', 'heure_dejeuner_fin', {
      type: Sequelize.TIME, allowNull: false, defaultValue: '14:00:00',
    });
    await queryInterface.addColumn('mission_meal_thresholds', 'heure_diner_debut', {
      type: Sequelize.TIME, allowNull: false, defaultValue: '18:00:00',
    });
    await queryInterface.addColumn('mission_meal_thresholds', 'montant_prime_securite', {
      type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 5000,
    });
    await queryInterface.addColumn('mission_meal_thresholds', 'montant_peage_chauffeur', {
      type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 1000,
    });

    await queryInterface.sequelize.query(
      `UPDATE mission_meal_thresholds SET heure_limite_petit_dejeuner = '07:30:00' WHERE heure_limite_petit_dejeuner = '07:00:00'`
    );
    await queryInterface.changeColumn('mission_meal_thresholds', 'heure_limite_petit_dejeuner', {
      type: Sequelize.TIME, allowNull: false, defaultValue: '07:30:00',
    });

    console.log('✅ Règles de mission étendues : fenêtres déjeuner/dîner, prime de sécurité, hébergement, péage chauffeur');
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('mission_meal_rates', 'montant_hebergement');
    await queryInterface.removeColumn('mission_meal_thresholds', 'heure_dejeuner_debut');
    await queryInterface.removeColumn('mission_meal_thresholds', 'heure_dejeuner_fin');
    await queryInterface.removeColumn('mission_meal_thresholds', 'heure_diner_debut');
    await queryInterface.removeColumn('mission_meal_thresholds', 'montant_prime_securite');
    await queryInterface.removeColumn('mission_meal_thresholds', 'montant_peage_chauffeur');
  },
};
