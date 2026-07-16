import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Tenant = sequelize.define('Tenant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  subdomain: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Sous-domaine (ex: hsjm → hsjm.hsjmcam.net)'
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  primaryColor: {
    type: DataTypes.STRING(7),
    allowNull: true,
    comment: 'Couleur de marque au format hex (#1B3A6B) appliquée à --brand'
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'cancelled'),
    defaultValue: 'active',
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  adminEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contactName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  autoDeleteAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'tenants',
  timestamps: true,
  underscored: true
});

export default Tenant;
