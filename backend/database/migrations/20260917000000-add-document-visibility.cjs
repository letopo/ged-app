'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('documents', 'visibility', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'personal',
      comment: "'personal' (auteur + validateurs de workflow) ou 'service' (tout le service)",
    });
    await queryInterface.addColumn('documents', 'service_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'services', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('documents', ['service_id']);
    await queryInterface.addIndex('documents', ['visibility']);

    // template_permissions est créée au démarrage de l'app (server.js), pas par
    // une migration — sur une base neuve, elle n'existe pas encore à ce stade.
    // Sur une base neuve, server.js la crée directement avec default_visibility.
    const [tplTable] = await queryInterface.sequelize.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='template_permissions'`
    );
    if (tplTable.length > 0) {
      await queryInterface.addColumn('template_permissions', 'default_visibility', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'personal',
        comment: 'Visibilité par défaut des documents créés avec ce template',
      });
    } else {
      console.log('  ⏭  template_permissions: table introuvable, ignorée (créée au démarrage de l\'app)');
    }

    console.log('✅ Colonnes visibility/service_id (documents) et default_visibility (template_permissions) ajoutées');
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('documents', ['visibility']);
    await queryInterface.removeIndex('documents', ['service_id']);
    await queryInterface.removeColumn('documents', 'service_id');
    await queryInterface.removeColumn('documents', 'visibility');
    await queryInterface.removeColumn('template_permissions', 'default_visibility');
  },
};
