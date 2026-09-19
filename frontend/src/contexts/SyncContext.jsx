// frontend/src/contexts/SyncContext.jsx
// Contexte de synchronisation offline — orchestre sync + queue
//
// Usage:
//   const { isSyncing, lastSyncedAt, pendingCount, triggerSync } = useSync();

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { syncAll, getLastSyncedAt }   from '../db/syncService';
import { processQueue, getPendingCount } from '../db/syncQueue';
import useOnlineStatus from '../hooks/useOnlineStatus';

const SyncContext = createContext(null);

export const useSync = () => {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside SyncProvider');
  return ctx;
};

// Intervalle de sync périodique (5 minutes)
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export function SyncProvider({ children, isAuthenticated }) {
  const { isOnline, isServerUp } = useOnlineStatus();
  const isConnected = isOnline && isServerUp;

  const [isSyncing,     setIsSyncing]     = useState(false);
  const [lastSyncedAt,  setLastSyncedAt]  = useState(null);
  const [pendingCount,  setPendingCount]  = useState(0);
  const [syncError,     setSyncError]     = useState(null);
  const [isProcessing,  setIsProcessing]  = useState(false); // traitement queue

  const syncIntervalRef   = useRef(null);
  const wasConnected      = useRef(false);
  const initialSyncDone   = useRef(false);

  // ── Rafraîchit le compteur de la queue ──────────────────────────────────────
  const refreshPendingCount = useCallback(async () => {
    try {
      const n = await getPendingCount();
      setPendingCount(n);
    } catch { /* IndexedDB peut ne pas être dispo */ }
  }, []);

  // ── Sync complète + flush queue ──────────────────────────────────────────────
  const triggerSync = useCallback(async ({ silent = false } = {}) => {
    if (!isConnected || isSyncing) return;
    if (!silent) setIsSyncing(true);
    setSyncError(null);

    try {
      // 1. Flush la queue offline en premier
      if (pendingCount > 0) {
        setIsProcessing(true);
        await processQueue();
        setIsProcessing(false);
        await refreshPendingCount();
      }

      // 2. Sync les données depuis l'API
      const { errors } = await syncAll();
      const hasErrors = Object.keys(errors).length > 0;
      if (hasErrors) setSyncError(`Erreur partielle: ${Object.keys(errors).join(', ')}`);

      // 3. Mettre à jour la date
      const d = await getLastSyncedAt();
      setLastSyncedAt(d);
    } catch (e) {
      setSyncError(e.message);
      console.error('[SyncContext] Sync échouée:', e);
    } finally {
      setIsSyncing(false);
      setIsProcessing(false);
    }
  }, [isConnected, isSyncing, pendingCount, refreshPendingCount]);

  // ── Sync au login ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      initialSyncDone.current = false;
      return;
    }
    if (!isConnected || initialSyncDone.current) return;

    initialSyncDone.current = true;

    // Charger lastSyncedAt depuis la DB (utile si déjà synced avant)
    getLastSyncedAt().then(d => setLastSyncedAt(d));
    refreshPendingCount();

    // Délai pour laisser l'UI s'afficher ET le token s'initialiser
    const t = setTimeout(() => triggerSync({ silent: true }), 3000);
    return () => clearTimeout(t);
  }, [isAuthenticated, isConnected]); // eslint-disable-line

  // ── Sync au retour en ligne ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    if (!wasConnected.current && isConnected) {
      // Retour en ligne → flush queue + sync
      console.log('[SyncContext] Retour en ligne, synchronisation…');
      triggerSync({ silent: true });
    }
    wasConnected.current = isConnected;
  }, [isConnected, isAuthenticated]); // eslint-disable-line

  // ── Sync périodique ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !isConnected) {
      clearInterval(syncIntervalRef.current);
      return;
    }

    syncIntervalRef.current = setInterval(() => {
      triggerSync({ silent: true });
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(syncIntervalRef.current);
  }, [isAuthenticated, isConnected, triggerSync]);

  // ── Écoute les messages du SW (Background Sync) ──────────────────────────────
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'PROCESS_SYNC_QUEUE') {
        refreshPendingCount();
        if (isConnected) processQueue().then(refreshPendingCount);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [isConnected, refreshPendingCount]);

  const value = {
    isSyncing,
    isProcessing,
    lastSyncedAt,
    pendingCount,
    syncError,
    triggerSync,
    refreshPendingCount,
    isConnected,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
