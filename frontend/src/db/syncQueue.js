// frontend/src/db/syncQueue.js
// File d'attente pour les actions effectuées hors-ligne
// Chaque action est rejouée dès le retour en ligne

import db from './localDB';
import axiosInstance from '../services/api';

const MAX_ATTEMPTS = 3;

// ─── Types d'actions supportées ──────────────────────────────────────────────

export const QUEUE_ACTIONS = {
  VALIDATE_TASK:    'validate_task',    // PUT /workflows/:id/validate
  UPLOAD_DOCUMENT:  'upload_document',  // POST /documents/upload  (base64 + meta)
  CREATE_DOCUMENT:  'create_document',  // POST /documents/upload
  ADD_COMMENT:      'add_comment',      // POST /workflows/document/:id/comments
  RELANCER:         'relancer',         // POST /workflows/document/:id/relancer
};

// ─── Ajout dans la file ───────────────────────────────────────────────────────

/**
 * Enfile une action offline.
 * @param {string} type       — une des constantes QUEUE_ACTIONS
 * @param {string} endpoint   — URL relative, ex: '/workflows/42/validate'
 * @param {string} method     — 'POST' | 'PUT' | 'PATCH'
 * @param {object} data       — corps de la requête
 * @param {string} description — label lisible par l'utilisateur
 */
export async function enqueue(type, endpoint, method, data, description = '') {
  const id = await db.syncQueue.add({
    type,
    endpoint,
    method,
    data,
    description,
    status: 'pending',
    createdAt: new Date().toISOString(),
    attempts: 0,
    error: null,
  });
  console.log(`[Queue] Action enfilée #${id}: ${description}`);
  return id;
}

/** Nombre d'actions en attente */
export async function getPendingCount() {
  return db.syncQueue.where('status').equals('pending').count();
}

/** Toutes les actions en attente */
export async function getPendingActions() {
  return db.syncQueue.where('status').equals('pending').toArray();
}

/** Toutes les actions (pour afficher l'historique) */
export async function getAllActions() {
  return db.syncQueue.orderBy('createdAt').reverse().toArray();
}

/** Supprime les actions terminées (done/failed) de plus de 7 jours */
export async function cleanOldActions() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.syncQueue
    .where('status').anyOf(['done', 'failed'])
    .and(item => item.createdAt < cutoff)
    .delete();
}

// ─── Traitement de la file ────────────────────────────────────────────────────

/**
 * Traite toutes les actions en attente.
 * Appelé automatiquement au retour en ligne.
 * @param {function} onProgress — callback(processed, total, item)
 * @returns {{ processed: number, failed: number }}
 */
export async function processQueue({ onProgress } = {}) {
  const pending = await getPendingActions();
  if (!pending.length) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed    = 0;

  for (const item of pending) {
    const attempt = (item.attempts || 0) + 1;

    try {
      await db.syncQueue.update(item.id, { status: 'processing', attempts: attempt });

      // Appel API réel
      await axiosInstance({
        method: item.method.toLowerCase(),
        url:    item.endpoint,
        data:   item.data,
        headers: item.method === 'POST' && item.data instanceof FormData
          ? { 'Content-Type': 'multipart/form-data' }
          : {},
      });

      await db.syncQueue.update(item.id, { status: 'done', error: null });
      processed++;
      onProgress?.(processed, pending.length, item);
      console.log(`[Queue] ✅ Action traitée #${item.id}: ${item.description}`);

    } catch (e) {
      const msg = e?.response?.data?.message || e.message;
      if (attempt >= MAX_ATTEMPTS) {
        await db.syncQueue.update(item.id, { status: 'failed', error: msg });
        failed++;
        console.error(`[Queue] ❌ Action abandonnée #${item.id}: ${msg}`);
      } else {
        await db.syncQueue.update(item.id, { status: 'pending', error: msg });
        console.warn(`[Queue] ⚠️ Tentative ${attempt}/${MAX_ATTEMPTS} échouée #${item.id}: ${msg}`);
      }
    }
  }

  await cleanOldActions();
  return { processed, failed };
}
