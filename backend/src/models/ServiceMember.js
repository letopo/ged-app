// backend/src/models/ServiceMember.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ServiceMember = sequelize.define('ServiceMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  serviceId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'service_id',
    references: {
      model: 'services',
      key: 'id',
    },
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  fonction: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [[
        'Personnel paramédical',
        'Secrétaire',
        'Major',
        'Chef de Service',
        'Chef de Service Adjoint',
        'Directrice Des Soins',
        'Médecin Chef',
        'Responsable SecuLog',
        'Directeur du Soutien',
        'Directeur Général Adjoint(e)',
        'Directeur Général',
        'Infirmier(e)',
        'Sage-femme',
        'Aide-soignant(e)',
        'Technicien de laboratoire',
        'Pharmacien(ne)',
        'Radiologue',
        'Anesthésiste',
        'Chirurgien(ne)',
        'Kinésithérapeute',
        'Comptable',
        'Responsable RH',
        'Agent d\'entretien',
        'Agent de sécurité',
        'Chauffeur',
        'Gestionnaire Logistic des Biens',
        'Technicien biomédical(e)',
        'Référent informaticien(e)',
        'Informaticien(ne)',
        'Responsable Achats'
      ]],
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
}, {
  tableName: 'service_members',
  timestamps: true,
  underscored: true,
});

// Associations
ServiceMember.associate = function(models) {
  this.belongsTo(models.Service, { foreignKey: 'serviceId', as: 'service' });
  this.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
};

export default ServiceMember;