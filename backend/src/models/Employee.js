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
  },
  // Lien vers le compte de connexion correspondant (si l'employé en a un),
  // pour fusionner les listes Employee + User (ex: sélection missionnaire sur un OM)
  // sans doublons. Rapproché initialement par nom/prénom, à tenir à jour ensuite.
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id',
  },
  // Catégorie/grade du personnel — détermine le taux d'indemnité de mission (repas).
  categorie: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
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
    },
    {
      fields: ['user_id']
    }
  ]
});

// Définition des associations
Employee.associate = function(models) {
  this.belongsTo(models.Service, { foreignKey: 'serviceId', as: 'service' });
  this.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
};

export default Employee;