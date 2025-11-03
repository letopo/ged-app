// src/models/Motif.js

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Motif = sequelize.define('Motif', {
  // Je recrée les colonnes probables, ajustez si nécessaire
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  }
}, {
  tableName: 'motifs',
  timestamps: true,
  underscored: true,
});

export default Motif;