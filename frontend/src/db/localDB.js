// frontend/src/db/localDB.js
// Base de données locale IndexedDB via Dexie.js
// Permet la consultation et les actions offline

import Dexie from 'dexie';

const db = new Dexie('GED_OfflineDB');

db.version(1).stores({
  // Documents de l'utilisateur connecté
  // Indexés par les champs les plus filtrés
  documents: 'id, status, category, userId, archived, updatedAt, createdAt',

  // Tâches de validation assignées à l'utilisateur
  myTasks: 'id, documentId, status, step, validatorId',

  // Données de référence (rarement changées)
  users:             'id, email, role',
  services:          'id, name',
  workflowTemplates: 'id, name',

  // Catégories — stockées comme liste plate d'objets { id, category }
  categories: '++_id, category',

  // File d'attente des actions effectuées offline
  // Traitée dès le retour en ligne
  syncQueue: '++id, type, status, createdAt, attempts',

  // Métadonnées de synchronisation (lastSyncedAt, etc.)
  syncMeta: 'key',
});

export default db;
