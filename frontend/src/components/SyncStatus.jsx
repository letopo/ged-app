// frontend/src/components/SyncStatus.jsx
// Indicateur de synchronisation dans la topbar
// Affiche : syncing / pending actions / last sync / offline

import { RefreshCw, CloudOff, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useSync } from '../contexts/SyncContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function SyncStatus() {
  const {
    isSyncing,
    isProcessing,
    lastSyncedAt,
    pendingCount,
    syncError,
    triggerSync,
    isConnected,
  } = useSync();

  // Offline
  if (!isConnected) {
    return (
      <div
        title={pendingCount ? `${pendingCount} action(s) en attente de sync` : 'Mode hors-ligne'}
        style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'default' }}
      >
        <CloudOff size={14} style={{ color: 'var(--warning)' }} />
        {pendingCount > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            background: 'var(--warning)', color: '#fff',
            borderRadius: 10, padding: '1px 6px', minWidth: 18, textAlign: 'center',
          }}>
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  // En cours de sync / traitement queue
  if (isSyncing || isProcessing) {
    return (
      <div
        title={isProcessing ? 'Envoi des actions offline…' : 'Synchronisation…'}
        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
      >
        <RefreshCw
          size={14}
          style={{
            color: 'var(--brand)',
            animation: 'spin 1s linear infinite',
          }}
        />
        <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
          {isProcessing ? `Envoi (${pendingCount})…` : 'Sync…'}
        </span>
      </div>
    );
  }

  // Actions en attente (online mais pas encore traitées)
  if (pendingCount > 0) {
    return (
      <button
        onClick={() => triggerSync()}
        title={`${pendingCount} action(s) à synchroniser — cliquer pour envoyer`}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '2px 6px', borderRadius: 'var(--radius-2)',
        }}
      >
        <Clock size={14} style={{ color: 'var(--warning)' }} />
        <span style={{
          fontSize: 11, fontWeight: 700,
          background: 'var(--warning)', color: '#fff',
          borderRadius: 10, padding: '1px 6px',
        }}>
          {pendingCount}
        </span>
      </button>
    );
  }

  // Erreur
  if (syncError) {
    return (
      <button
        onClick={() => triggerSync()}
        title={`Erreur: ${syncError} — cliquer pour réessayer`}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <AlertCircle size={14} style={{ color: 'var(--danger)' }} />
      </button>
    );
  }

  // Tout est OK — afficher la date du dernier sync (discret)
  if (lastSyncedAt) {
    const ago = formatDistanceToNow(lastSyncedAt, { addSuffix: true, locale: fr });
    return (
      <button
        onClick={() => triggerSync()}
        title={`Dernière sync: ${ago} — cliquer pour actualiser`}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '2px 4px', borderRadius: 'var(--radius-2)',
          opacity: 0.6,
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; }}
      >
        <CheckCircle size={13} style={{ color: 'var(--success)' }} />
      </button>
    );
  }

  // Pas encore synced
  return (
    <button
      onClick={() => triggerSync()}
      title="Synchroniser les données"
      style={{
        display: 'flex', alignItems: 'center',
        background: 'none', border: 'none', cursor: 'pointer',
      }}
    >
      <RefreshCw size={13} style={{ color: 'var(--fg-muted)' }} />
    </button>
  );
}
