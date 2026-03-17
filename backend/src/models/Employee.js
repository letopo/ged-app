// src/models/Employee.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  birthDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  birthPlace: {
    type: DataTypes.STRING,
    allowNull: false
  },
  gender: {
    type: DataTypes.ENUM('M', 'F'),
    allowNull: false
  },
  childrenCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  matricule: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  maritalStatus: {
    type: DataTypes.ENUM('Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf(ve)'),
    allowNull: false
  },
  serviceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'services',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'employees',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['matricule']
    },
    {
      fields: ['service_id']
    }
  ]
});

// Définition des associations
Employee.associate = function(models) {
  this.belongsTo(models.Service, { foreignKey: 'serviceId', as: 'service' });
};

export default Employee;