// backend/src/models/HospitalisationPHP.js - Module PHP

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const HospitalisationPHP = sequelize.define('HospitalisationPHP', {
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
  consultationId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'consultation_id',
    references: {
      model: 'php_consultations',
      key: 'id'
    }
  },
  serviceHospitalisation: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'service_hospitalisation',
    comment: 'Service d\'hospitalisation (Médecine, Chirurgie, etc.)'
  },
  numeroChambre: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'numero_chambre'
  },
  dateEntree: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'date_entree'
  },
  dateSortie: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'date_sortie'
  },
  dureeSejour: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'duree_sejour',
    comment: 'Durée du séjour en jours (calculée automatiquement)'
  },
  status: {
    type: DataTypes.ENUM('en_cours', 'sorti', 'transfert', 'deces'),
    defaultValue: 'en_cours',
    allowNull: false
  },
  medecinResponsable: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'medecin_responsable'
  },
  diagnostic: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Diagnostic principal ayant conduit à l\'hospitalisation'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'php_hospitalisations',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['patient_id'] },
    { fields: ['consultation_id'] },
    { fields: ['date_entree'] },
    { fields: ['status'] }
  ]
});

HospitalisationPHP.associate = function(models) {
  HospitalisationPHP.belongsTo(models.PatientPHP, {
    as: 'patient',
    foreignKey: 'patient_id'
  });
  HospitalisationPHP.belongsTo(models.ConsultationPHP, {
    as: 'consultation',
    foreignKey: 'consultation_id'
  });
};

export default HospitalisationPHP;
