'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ── Nouveaux champs sur la table tenants ──────────────────────────────────
    await queryInterface.addColumn('tenants', 'subdomain', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Sous-domaine client (ex: hsjm → hsjm.hsjmcam.net)'
    });
    await queryInterface.addColumn('tenants', 'status', {
      type: Sequelize.ENUM('active', 'suspended', 'cancelled'),
      defaultValue: 'active',
      allowNull: false
    });
    await queryInterface.addColumn('tenants', 'cancelled_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('tenants', 'auto_delete_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Si défini, suppression automatique à cette date'
    });
    await queryInterface.addColumn('tenants', 'contact_name', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('tenants', 'contact_phone', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('tenants', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Notes internes (non visibles du client)'
    });

    // Mettre à jour le tenant HSJM avec son sous-domaine
    await queryInterface.sequelize.query(`
      UPDATE tenants SET subdomain = 'ged', status = 'active' WHERE slug = 'hsjm'
    `);

    // ── Ajouter le rôle superadmin à l'ENUM users.role ───────────────────────
    await queryInterface.sequelize.query(`
      ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS 'superadmin'
    `);

    // Promouvoir F-YANKEU en superadmin
    await queryInterface.sequelize.query(`
      UPDATE users SET role = 'superadmin' WHERE username = 'F-YANKEU'
    `);

    console.log('✅ Tenants enrichis + rôle superadmin créé');
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('tenants', 'subdomain');
    await queryInterface.removeColumn('tenants', 'status');
    await queryInterface.removeColumn('tenants', 'cancelled_at');
    await queryInterface.removeColumn('tenants', 'auto_delete_at');
    await queryInterface.removeColumn('tenants', 'contact_name');
    await queryInterface.removeColumn('tenants', 'contact_phone');
    await queryInterface.removeColumn('tenants', 'notes');
  }
};
