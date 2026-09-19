// backend/src/models/MissionMealThreshold.js
// Seuils horaires (un jeu de valeurs par tenant) qui conditionnent le calcul
// des indemnités de mission, selon la note de service "Frais de mission" :
// - Petit-déjeuner si départ ≤ heureLimitePetitDejeuner (07:30 par défaut)
// - Déjeuner si la mission couvre [heureDejeunerDebut, heureDejeunerFin] (12h-14h)
// - Dîner si la mission couvre [heureDinerDebut, heureLimiteDiner] (18h-20h)
// - Prime de sécurité (montantPrimeSecurite) si retour ≥ heureLimiteDiner (20h) —
//   heureLimiteDiner sert donc à la fois de fin de fenêtre dîner et de seuil
//   de la prime de sécurité, car les deux coïncident dans la note de service.
// - Péage chauffeur (montantPeageChauffeur) : montant fixe ajouté automatiquement
//   dès qu'un conducteur est désigné sur l'ordre de mission.
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MissionMealThreshold = sequelize.define('MissionMealThreshold', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  heureLimitePetitDejeuner: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '07:30:00',
    field: 'heure_limite_petit_dejeuner',
  },
  heureDejeunerDebut: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '12:00:00',
    field: 'heure_dejeuner_debut',
  },
  heureDejeunerFin: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '14:00:00',
    field: 'heure_dejeuner_fin',
  },
  heureDinerDebut: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '18:00:00',
    field: 'heure_diner_debut',
  },
  heureLimiteDiner: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '20:00:00',
    field: 'heure_limite_diner',
  },
  montantPrimeSecurite: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 5000,
    field: 'montant_prime_securite',
  },
  montantPeageChauffeur: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 1000,
    field: 'montant_peage_chauffeur',
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
}, {
  tableName: 'mission_meal_thresholds',
  timestamps: true,
  underscored: true,
});

export default MissionMealThreshold;
