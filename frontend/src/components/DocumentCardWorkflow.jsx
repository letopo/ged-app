// frontend/src/components/DocumentCardWorkflow.jsx
// Circuit de validation sur les cartes de la vue Grille, en version compacte :
// toutes les cartes gardent la même hauteur. Le détail (progression complète,
// discussion, relance) s'ouvre dans une fenêtre.
import React from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { XCircle, RefreshCw, ListChecks, X } from 'lucide-react';
import WorkflowProgress from './WorkflowProgress';
import { useAuth } from '../contexts/AuthContext';

const fmtShort = (d, locale) => (d ? new Date(d).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }) : '');

// Fine barre de progression : verte si approuvé, rouge si rejeté, bleue en cours
export function WorkflowBar({ approved, total, status }) {
  const { t } = useTranslation();
  const color = status === 'approved' ? 'var(--success)' : status === 'rejected' ? 'var(--danger)' : 'var(--brand)';
  const pct = total ? Math.round((Math.min(approved, total) / total) * 100) : 0;
  return (
    <div title={t('Workflow : {{approved}}/{{total}}', { approved, total })}
      style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(pct, status === 'rejected' ? 6 : 0)}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{approved}/{total}</span>
    </div>
  );
}

// Bandeau « Rejeté par … · date · « motif » » + Relancer / Détails
export function RejectionSummary({ doc, canRelance, onDetails, onRelance }) {
  const { t, i18n } = useTranslation();
  const locale = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', ar: 'ar-SA' }[i18n.language] || 'fr-FR';
  const step = (doc.workflows || []).filter((w) => w.status === 'rejected')
    .sort((a, b) => new Date(a.validatedAt || a.updatedAt || 0) - new Date(b.validatedAt || b.updatedAt || 0))[0];
  const who = step?.validator ? `${step.validator.firstName || ''} ${step.validator.lastName || ''}`.trim() : '';
  const when = fmtShort(step?.validatedAt || step?.updatedAt, locale);
  const small = {
    flex: 1, height: 28, borderRadius: 'var(--radius-2)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  };
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ marginBottom: 8 }}>
      <div style={{ background: 'var(--danger-soft)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)', borderRadius: 'var(--radius-2)', padding: '6px 8px', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--danger)', minWidth: 0 }}>
          <XCircle size={12} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {who ? t('Rejeté par {{name}}', { name: who }) : t('Rejeté')}{when ? ` · ${when}` : ''}
          </span>
        </div>
        {step?.comment && (
          <div title={step.comment} style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            « {step.comment} »
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {canRelance && (
          <button onClick={onRelance} style={{ ...small, border: 'none', background: '#f97316', color: '#fff' }}>
            <RefreshCw size={11} /> {t('Relancer')}
          </button>
        )}
        <button onClick={onDetails} style={{ ...small, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)' }}>
          <ListChecks size={12} /> {t('Détails')}
        </button>
      </div>
    </div>
  );
}

// Fenêtre : progression complète + discussion + relance
export function WorkflowDetailsModal({ doc, startRelance, onClose, onRelanced, onReassign }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);
  return ReactDOM.createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', background: 'var(--surface)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{t('Circuit de validation')}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
          </div>
          <button onClick={onClose} aria-label={t('Fermer')} style={{ width: 32, height: 32, borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ padding: 16 }}>
          <WorkflowProgress
            workflows={doc.workflows}
            documentStatus={doc.status}
            documentId={doc.id}
            submittedBy={doc.userId}
            isAdmin={isAdmin}
            onReassign={isAdmin ? onReassign : null}
            onRelanced={() => { onRelanced?.(); onClose(); }}
            hideDiscussion={doc.status !== 'rejected'}
            startRelance={startRelance}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
