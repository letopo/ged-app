'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ✅ CORRECTION : Utiliser le bon nom de type ENUM
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'gardien';
      ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'agent_accueil_php';
      ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'agent_accueil_normal';
      ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'caissier';
      ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'chef_de_service';
    `);
    
    console.log('✅ Rôles ajoutés:');
    console.log('   - gardien (Agent au portail)');
    console.log('   - agent_accueil_php (Agent d\'accueil PHP)');
    console.log('   - agent_accueil_normal (Agent d\'accueil Normal)');
    console.log('   - caissier (Agent de caisse)');
    console.log('   - chef_de_service (Chef de service)');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⚠️ Rollback: Impossible de supprimer des valeurs ENUM en PostgreSQL');
  }
};