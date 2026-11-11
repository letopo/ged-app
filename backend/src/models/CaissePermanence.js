// backend/src/models/CaissePermanence.js — caisse de permanence de la pharmacie
// (migration 20261111160000 ; règles : utils/caissePermanence.js).
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';


export const CaisseSeance = sequelize.define('CaisseSeance', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:        { type: DataTypes.UUID, allowNull: false },
  date:            { type: DataTypes.DATEONLY, allowNull: false },
  periode:         { type: DataTypes.STRING(5), allowNull: false, validate: { isIn: [['jour', 'nuit']] } },
  statut:          { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'ouverte', validate: { isIn: [['ouverte', 'cloturee']] } },
  caissiereId:     { type: DataTypes.UUID, allowNull: true },
  caissiereNom:    { type: DataTypes.STRING(150), allowNull: true },
  precedenteId:    { type: DataTypes.UUID, allowNull: true },
  soldeOuverture:  { type: DataTypes.DECIMAL(14, 0), allowNull: false, defaultValue: 0 },
  montantRecu:     { type: DataTypes.DECIMAL(14, 0), allowNull: true },
  ecartReception:  { type: DataTypes.DECIMAL(14, 0), allowNull: true },
  noteOuverture:   { type: DataTypes.STRING(500), allowNull: true },
  especesComptees: { type: DataTypes.DECIMAL(14, 0), allowNull: true },
  billetage:       { type: DataTypes.JSONB, allowNull: true },
  soldeTheorique:  { type: DataTypes.DECIMAL(14, 0), allowNull: true },
  ecartCloture:    { type: DataTypes.DECIMAL(14, 0), allowNull: true },
  noteCloture:     { type: DataTypes.STRING(500), allowNull: true },
  clotureeAt:      { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'caisse_permanence_seances', timestamps: true, underscored: true });

export const CaisseMouvement = sequelize.define('CaisseMouvement', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId:        { type: DataTypes.UUID, allowNull: false },
  seanceId:        { type: DataTypes.UUID, allowNull: false },
  type:            { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [['caution', 'recette', 'sortie']] } },
  mode:            { type: DataTypes.STRING(15), allowNull: false, defaultValue: 'especes', validate: { isIn: [['especes', 'orange_money']] } },
  libelle:         { type: DataTypes.STRING(120), allowNull: false },
  patientNom:      { type: DataTypes.STRING(150), allowNull: true },
  montant:         { type: DataTypes.DECIMAL(14, 0), allowNull: false },
  saisiPar:        { type: DataTypes.UUID, allowNull: true },
  saisiParNom:     { type: DataTypes.STRING(150), allowNull: true },
  annule:          { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  motifAnnulation: { type: DataTypes.STRING(300), allowNull: true },
  annuleParNom:    { type: DataTypes.STRING(150), allowNull: true },
  annuleAt:        { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'caisse_permanence_mouvements', timestamps: true, underscored: true });

CaisseSeance.hasMany(CaisseMouvement, { as: 'mouvements', foreignKey: 'seanceId' });
CaisseMouvement.belongsTo(CaisseSeance, { as: 'seance', foreignKey: 'seanceId' });
