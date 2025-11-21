// src/models/index.js - VERSION FINALE ET ROBUSTE

import sequelize from '../config/database.js';

// 1. Importer tous les modèles
import User from './User.js';
import Document from './Document.js';
import Workflow from './Workflow.js';
import Service from './Service.js';
import Motif from './Motif.js';
import ServiceMember from './ServiceMember.js';
import Employee from './Employee.js'; // NOUVEAU MODÈLE
import PushSubscription from './PushSubscription.js';


const db = {
  User,
  Document,
  Workflow,
  Service,
  Motif,
  ServiceMember,
  Employee, // AJOUT
};

// 2. Parcourir tous les modèles et appeler leur méthode 'associate' si elle existe.
//    Ceci garantit que les associations ne sont créées qu'après que TOUS les modèles
//    ont été importés et sont disponibles dans l'objet 'db'.
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;

// 3. Exporter les modèles pour le reste de l'application
export { User, Document, Workflow, Service, Motif, ServiceMember, Employee, sequelize, PushSubscription }; // AJOUT Employee
export default db;