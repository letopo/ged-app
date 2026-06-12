// backend/src/models/Poste.js
// Poste organisationnel assignable (comptable, DG, DDS, DS, médecin chef…).

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Poste = sequelize.define('Poste', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(40),
    allowNull: false,
    unique: true,
    comment: 'Identifiant stable du poste (ex: comptable, dg, dds)',
  },
  label: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'postes',
  timestamps: true,
  underscored: true,
});

export default Poste;
