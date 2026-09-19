'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('tenants', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      domain: { type: DataTypes.STRING, allowNull: false, unique: true },
      slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      logo_url: { type: DataTypes.STRING, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      admin_email: { type: DataTypes.STRING, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false }
    });
    console.log('✅ Table tenants créée');
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('tenants');
  }
};
