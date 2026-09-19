// frontend/src/hooks/useOfflineData.js
//
// Hook générique : sert les données depuis la DB locale (offline) ou l'API (online).
// Remplace les appels directs aux API dans les composants.
//
// Usage:
//   const { data, loading, error, isFromCache, refresh } =
//     useOfflineData('documents', () => documentsAPI.getAll(), { extract: r => r.data?.data });
//
//   const { data: tasks } =
//     useOfflineData('myTasks', () => workflowAPI.getMyTasks('pending'));

import { useState, useEffect, useRef, useCallback } from 'react';
import db from '../db/localDB';
import useOnlineStatus from './useOnlineStatus';

/**
 * @param {string}   table     - Nom de la table Dexie (documents|myTasks|users|services|...)
 * @param {function} apiFn     - Fonction qui retourne une Promise<AxiosResponse>
 * @param {object}   options
 *   @param {function} options.extract     - Extrait le tableau depuis la réponse API
 *   @param {function} options.dbQuery     - Filtre/tri Dexie personnalisé (reçoit db[table])
 *   @param {boolean}  options.disabled    - Désactive ce hook
 *   @param {any[]}    options.deps        - Dépendances supplémentaires pour re-fetch
 */
export default function useOfflineData(table, apiFn, {
  extract    = (res) => res?.data?.data ?? res?.data ?? [],
  dbQuery    = null,
  disabled   = false,
  deps       = [],
} = {}) {
  const { isOnline, isServerUp } = useOnlineStatus();
  const isConnected = isOnline && isServerUp;

  const [data,        setData]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async () => {
    if (disabled) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    // ── 1. Charger la DB locale d'abord (instantané) ──────────────────────────
    try {
      const local = dbQuery
        ? await dbQuery(db[table])
        : await db[table].toArray();

      if (local?.length && mountedRef.current) {
        setData(local);
        setIsFromCache(true);
        setLoading(false); // affiche les données locales immédiatement
      }
    } catch {
      // DB locale vide ou erreur — on continue avec l'API
    }

    // ── 2. Si online, récupérer les données fraîches depuis l'API ─────────────
    if (isConnected && apiFn) {
      try {
        const res  = await apiFn();
        const rows = normalizeExtract(extract(res));

        if (mountedRef.current) {
          setData(rows);
          setIsFromCache(false);
          setLoading(false);
        }

        // Mettre à jour la DB locale en arrière-plan
        if (rows.length && db[table]) {
          db[table].bulkPut(rows).catch(() => {});
        }
      } catch (e) {
        if (mountedRef.current) {
          // Si on a des données locales, on les garde sans afficher d'erreur
          setError(e?.response?.data?.message || e.message);
          setLoading(false);
        }
      }
    } else {
      // Offline — s'assurer que loading est bien false
      if (mountedRef.current) setLoading(false);
    }
  }, [isConnected, disabled, table, ...deps]); // eslint-disable-line

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, isFromCache, refresh: fetchData };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeExtract(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    // { data: [...] }, { documents: [...] }, { tasks: [...] }, etc.
    for (const key of ['data', 'documents', 'tasks', 'users', 'services', 'templates', 'items']) {
      if (Array.isArray(value[key])) return value[key];
    }
  }
  return [];
}
