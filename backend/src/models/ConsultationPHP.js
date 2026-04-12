// backend/src/models/ConsultationPHP.js - Module PHP

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ConsultationPHP = sequelize.define('ConsultationPHP', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'patient_id',
    references: {
      model: 'php_patients',
      key: 'id'
    }
  },
  bonPriseEnChargeId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'bon_prise_en_charge_id',
    references: {
      model: 'php_bons_prise_en_charge',
      key: 'id'
    }
  },
  // Informations temporelles clés pour le suivi du temps d'attente
  dateConsultation: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'date_consultation'
  },
  heureArrivee: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'heure_arrivee',
    comment: 'Heure d\'arrivée du patient à l\'accueil PHP'
  },
  heureAppelMedecin: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'heure_appel_medecin',
    comment: 'Heure à laquelle le patient a été appelé par le médecin'
  },
  heureDebutConsultation: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'heure_debut_consultation',
    comment: 'Heure de début effective de la consultation médicale'
  },
  heureFinConsultation: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'heure_fin_consultation',
    comment: 'Heure de fin de la consultation'
  },
  // Durée d'attente calculée (en minutes)
  dureeAttenteMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'duree_attente_minutes',
    comment: 'Durée d\'attente entre arrivée et début consultation (en minutes)'
  },
  // Service / Médecin
  serviceName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'service_name',
    comment: 'Nom du service médical de consultation'
  },
  medecinId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'medecin_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  medecinNom: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'medecin_nom',
    comment: 'Nom du médecin (si pas dans le système)'
  },
  // Contenu médical
  motif: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Motif de la consultation'
  },
  diagnostic: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Diagnostic posé par le médecin'
  },
  ordonnance: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Prescriptions médicales'
  },
  // Résultat de la consultation → détermine la suite du workflow
  resultat: {
    type: DataTypes.ENUM(
      // Parcours patient après consultation médicale
      'pharmacie',       // Envoyé à la pharmacie
      'laboratoire',     // Envoyé au laboratoire d'analyses
      'radiologie',      // Envoyé en radiologie
      'specialiste',     // Référé à un spécialiste
      'repos',           // Repos maladie prescrit
      'hospitalisation', // Hospitalisé
      // Autres issues
      'operation',
      'transfert',
      'deces',
      'retour_travail',  // Conservé pour les données historiques
      // États
      'en_cours',
      'non_presente'
    ),
    defaultValue: 'en_cours',
    allowNull: false,
    comment: 'Parcours/issue de la consultation médicale'
  },
  // Agent d'accueil PHP qui a enregistré la consultation
  agentAccueilId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'agent_accueil_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'php_consultations',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['patient_id'] },
    { fields: ['date_consultation'] },
    { fields: ['resultat'] },
    { fields: ['service_name'] },
    { fields: ['medecin_id'] },
    { fields: ['created_at'] }
  ]
});

ConsultationPHP.associate = function(models) {
  ConsultationPHP.belongsTo(models.PatientPHP, {
    as: 'patient',
    foreignKey: 'patient_id'
  });
  ConsultationPHP.belongsTo(models.BonPriseEnCharge, {
    as: 'bon',
    foreignKey: 'bon_prise_en_charge_id'
  });
  ConsultationPHP.belongsTo(models.User, {
    as: 'medecin',
    foreignKey: 'medecin_id'
  });
  ConsultationPHP.belongsTo(models.User, {
    as: 'agentAccueil',
    foreignKey: 'agent_accueil_id'
  });
  ConsultationPHP.hasOne(models.HospitalisationPHP, {
    as: 'hospitalisation',
    foreignKey: 'consultation_id'
  });
  ConsultationPHP.hasOne(models.ReposPHP, {
    as: 'repos',
    foreignKey: 'consultation_id'
  });
  ConsultationPHP.hasOne(models.OperationPHP, {
    as: 'operation',
    foreignKey: 'consultation_id'
  });
  ConsultationPHP.hasOne(models.DecesTransfertPHP, {
    as: 'decesTransfert',
    foreignKey: 'consultation_id'
  });
};

export default ConsultationPHP;
