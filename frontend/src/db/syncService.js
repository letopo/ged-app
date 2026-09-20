// frontend/src/db/syncService.js
// Tire les données de l'API vers la base locale IndexedDB

import db from './localDB';
import {
  documentsAPI,
  workflowAPI,
  usersAPI,
  listsAPI,
  workflowTemplatesAPI,
} from '../services/api';


// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise la réponse axios qui peut avoir plusieurs shapes */
const extractArray = (res, ...keys) => {
  const d = res?.data;
  if (!d) return [];
  for (const k of keys) {
    if (Array.isArray(d[k])) return d[k];
  }
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.data)) return d.data;
  return [];
};

// ─── Sync individuelle ────────────────────────────────────────────────────────

export async function syncDocuments() {
  const res  = await documentsAPI.getAll();
  const docs = extractArray(res, 'documents', 'data');
  if (docs.length) await db.documents.bulkPut(docs);
  return docs.length;
}

export async function syncMyTasks() {
  // Récupère toutes les tâches (pending + queued)
  const [pendingRes, queuedRes] = await Promise.all([
    workflowAPI.getMyTasks('pending'),
    workflowAPI.getMyTasks('queued'),
  ]);
  const tasks = [
    ...extractArray(pendingRes, 'tasks', 'data'),
    ...extractArray(queuedRes,  'tasks', 'data'),
  ];
  if (tasks.length) await db.myTasks.bulkPut(tasks);
  return tasks.length;
}

export async function syncUsers() {
  const res   = await usersAPI.getAll();
  const users = extractArray(res, 'users', 'data');
  if (users.length) await db.users.bulkPut(users);
  return users.length;
}

export async function syncServices() {
  const res      = await listsAPI.getServices();
  const services = extractArray(res, 'services', 'data');
  if (services.length) await db.services.bulkPut(services);
  return services.length;
}

export async function syncCategories() {
  const res        = await documentsAPI.getCategories();
  const categories = extractArray(res, 'categories', 'data');
  if (categories.length) {
    await db.categories.clear();
    await db.categories.bulkAdd(categories.map((c, i) => ({ _id: i + 1, category: c })));
  }
  return categories.length;
}

export async function syncWorkflowTemplates() {
  try {
    const res       = await workflowTemplatesAPI.getAll();
    const templates = extractArray(res, 'templates', 'data');
    if (templates.length) await db.workflowTemplates.bulkPut(templates);
    return templates.length;
  } catch {
    return 0;
  }
}

// ─── Sync complète ────────────────────────────────────────────────────────────

/**
 * Synchronise toutes les entités en parallèle.
 * Les erreurs individuelles n'arrêtent pas les autres.
 * Retourne un résumé { ok, counts, errors }.
 */
export async function syncAll({ onProgress } = {}) {
  const tasks = [
    { name: 'documents',         fn: syncDocuments },
    { name: 'myTasks',           fn: syncMyTasks },
    { name: 'users',             fn: syncUsers },
    { name: 'services',          fn: syncServices },
    { name: 'categories',        fn: syncCategories },
    { name: 'workflowTemplates', fn: syncWorkflowTemplates },
  ];

  const counts = {};
  const errors = {};

  await Promise.all(
    tasks.map(async ({ name, fn }) => {
      try {
        counts[name] = await fn();
        onProgress?.(name, counts[name]);
      } catch (e) {
        errors[name] = e.message;
        console.warn(`[Sync] ${name} échoué:`, e.message);
      }
    })
  );

  const ok = Object.keys(errors).length === 0;
  await db.syncMeta.put({ key: 'lastSyncedAt', value: new Date().toISOString() });

  return { ok, counts, errors };
}

/** Lit la date du dernier sync depuis la DB locale */
export async function getLastSyncedAt() {
  const meta = await db.syncMeta.get('lastSyncedAt');
  return meta?.value ? new Date(meta.value) : null;
}
