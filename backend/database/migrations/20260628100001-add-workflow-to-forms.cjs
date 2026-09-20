'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // forms/form_responses sont créées au démarrage de l'app (server.js), pas
    // par une migration — sur une base neuve, elles n'existent pas encore ici.
    // server.js les crée directement avec les colonnes workflow_* dans ce cas.
    const [tables] = await queryInterface.sequelize.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('forms', 'form_responses')`
    );
    if (tables.length < 2) {
      console.log('  ⏭  forms/form_responses: table(s) introuvable(s), ignoré (créées au démarrage de l\'app)');
      return;
    }

    // 1. workflow_template_id sur forms
    await queryInterface.addColumn('forms', 'workflow_template_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'workflow_templates', key: 'id' },
      onDelete: 'SET NULL',
    });

    // 2. Champs workflow sur form_responses
    await queryInterface.addColumn('form_responses', 'workflow_status', {
      type: Sequelize.STRING(30),
      allowNull: true,
      defaultValue: null,
      comment: 'null | pending_approval | approved | rejected',
    });
    await queryInterface.addColumn('form_responses', 'workflow_current_step', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('form_responses', 'workflow_data', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Snapshot du template + statut de chaque étape',
    });

    await queryInterface.addIndex('form_responses', ['workflow_status']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('forms', 'workflow_template_id');
    await queryInterface.removeColumn('form_responses', 'workflow_status');
    await queryInterface.removeColumn('form_responses', 'workflow_current_step');
    await queryInterface.removeColumn('form_responses', 'workflow_data');
  },
};
