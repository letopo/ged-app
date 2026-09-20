// backend/src/models/ComptaDoc.js — Module Comptabilité (pièces de caisse scannées)
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ComptaDoc = sequelize.define('ComptaDoc', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // N° ORDRE — numéro d'ordre séquentiel
  numeroOrdre:     { type: DataTypes.INTEGER, allowNull: true, field: 'numero_ordre' },
  // DATE RÉCEPTION — date de saisie
  dateReception:   { type: DataTypes.DATEONLY, allowNull: true, field: 'date_reception' },
  // LIBELLÉ — description extraite par IA
  libelle:         { type: DataTypes.TEXT, allowNull: true },
  // DATE PIÈCE — date figurant sur la pièce (extraite)
  datePiece:       { type: DataTypes.DATEONLY, allowNull: true, field: 'date_piece' },
  // N° RÉFÉRENCE — numéro de référence de la pièce (extrait)
  numeroPiece:     { type: DataTypes.STRING(120), allowNull: true, field: 'numero_piece' },
  // N° COMPTABLE — code comptable attribué par la comptable
  numeroComptable: { type: DataTypes.STRING(120), allowNull: true, field: 'numero_comptable' },
  // MONTANT
  montant:         { type: DataTypes.DECIMAL(18, 2), allowNull: true },
  devise:          { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'XAF' },
  // TYPE — entrée ou sortie de caisse
  typeMouvement:   {
    type: DataTypes.ENUM('entree', 'sortie', 'inconnu'),
    allowNull: false,
    defaultValue: 'inconnu',
    field: 'type_mouvement',
  },
  documentId:      { type: DataTypes.UUID, allowNull: true, field: 'document_id' },
  statut:          { type: DataTypes.ENUM('brouillon', 'valide'), allowNull: false, defaultValue: 'brouillon' },
  extraction:      { type: DataTypes.JSONB, allowNull: true },
  saisiPar:        { type: DataTypes.UUID, allowNull: true, field: 'saisi_par' },
  // Pièces multi-lignes : toutes les lignes d'une même pièce partagent le même group_id
  groupId:         { type: DataTypes.UUID, allowNull: true, field: 'group_id' },
  ligneOrdre:      { type: DataTypes.INTEGER, allowNull: true, defaultValue: 1, field: 'ligne_ordre' },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
}, {
  tableName: 'compta_docs',
  timestamps: true,
  underscored: true,
});

ComptaDoc.associate = function (models) {
  this.belongsTo(models.Document, { foreignKey: 'documentId', as: 'document' });
  this.belongsTo(models.User, { foreignKey: 'saisiPar', as: 'saisiParUser' });
};

export default ComptaDoc;
