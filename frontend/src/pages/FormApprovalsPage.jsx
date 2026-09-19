// frontend/src/pages/FormApprovalsPage.jsx
// Approbations de formulaires en attente pour l'utilisateur connecté

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch, ThumbsUp, ThumbsDown, Loader2, RefreshCw,
  FileText, User, Calendar, CheckCircle, ClipboardCheck,
} from 'lucide-react';
import { formsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Modal Approuver / Rejeter ────────────────────────────────────────────────

function ActionModal({ item, action, onClose, onConfirm }) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(item, action, comment);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const isApprove = action === 'approve';
  const step = item?.workflowData?.steps?.[(item.workflowCurrentStep || 1) - 1];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 460, boxShadow: 'var(--shadow-3)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {isApprove
            ? <ThumbsUp size={16} style={{ color: '#10b981' }} />
            : <ThumbsDown size={16} style={{ color: '#ef4444' }} />
          }
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>
            {isApprove ? 'Approuver l\'étape' : 'Rejeter la réponse'}
          </p>
          <button onClick={onClose} style={{ marginLeft: 'auto', padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* Info étape */}
          {step && (
            <div style={{ marginBottom: 14, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Étape {item.workflowCurrentStep}</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{step.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--fg-muted)' }}>{item.form?.title} · soumis par {item.submitter ? `${item.submitter.firstName} ${item.submitter.lastName}` : 'Anonyme'}</p>
            </div>
          )}

          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 6 }}>
            Commentaire {isApprove ? '(optionnel)' : '(recommandé)'}
          </label>
          <textarea value={comment} onChange={e => setComment(e.target.value)}
            placeholder={isApprove ? 'Approuvé sans réserve...' : 'Motif du rejet...'}
            rows={3}
            style={{ width: '100%', padding: '9px 11px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'inherit', outline: 'none' }}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={handleConfirm} disabled={loading} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px', borderRadius: 9,
              background: isApprove ? '#10b981' : '#ef4444', color: '#fff',
              border: 'none', cursor: loading ? 'default' : 'pointer',
              fontSize: 13, fontWeight: 700, opacity: loading ? .7 : 1,
            }}>
              {loading
                ? <Loader2 size={14} style={{ animation: 'spin .7s linear infinite' }} />
                : (isApprove ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />)
              }
              {isApprove ? 'Confirmer l\'approbation' : 'Confirmer le rejet'}
            </button>
            <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: 9, background: 'var(--surface-2)', border: '1.5px solid var(--border)', cursor: 'pointer', fontSize: 13, color: 'var(--fg)' }}>
              Annuler
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Carte approbation ────────────────────────────────────────────────────────

function ApprovalCard({ item, onApprove, onReject }) {
  const step      = item.workflowData?.steps?.[(item.workflowCurrentStep || 1) - 1];
  const totalSteps = item.workflowData?.steps?.length || 1;
  const navigate  = useNavigate();

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 12,
      border: '1.5px solid var(--border)', padding: '16px 18px',
      boxShadow: 'var(--shadow-1)',
    }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.form?.title || 'Formulaire'}
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <User size={10} /> {item.submitter ? `${item.submitter.firstName} ${item.submitter.lastName}` : 'Anonyme'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Calendar size={10} /> {format(new Date(item.submittedAt || item.createdAt), 'dd MMM yyyy', { locale: fr })}
            </span>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '3px 10px', borderRadius: 10, flexShrink: 0 }}>
          Ét. {item.workflowCurrentStep}/{totalSteps}
        </span>
      </div>

      {/* Workflow info */}
      {step && (
        <div style={{ padding: '9px 11px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GitBranch size={11} style={{ color: '#3b82f6', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
              {item.workflowData?.templateName}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{step.name}</p>
          {step.deadlineDays && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#f59e0b' }}>Délai requis : {step.deadlineDays} jour{step.deadlineDays > 1 ? 's' : ''}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => navigate(`/forms/${item.formId}/responses`)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, background: 'var(--surface-2)', border: '1.5px solid var(--border)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}
        >
          Voir le formulaire
        </button>
        <button
          onClick={() => onApprove(item)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, background: '#d1fae5', border: '1.5px solid #6ee7b7', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#065f46' }}
        >
          <ThumbsUp size={13} /> Approuver
        </button>
        <button
          onClick={() => onReject(item)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, background: '#fee2e2', border: '1.5px solid #fca5a5', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#991b1b' }}
        >
          <ThumbsDown size={13} /> Rejeter
        </button>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function FormApprovalsPage() {
  const { user }   = useAuth();
  const [items,    setItems]   = useState([]);
  const [loading,  setLoading] = useState(true);
  const [modal,    setModal]   = useState(null); // { item, action }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await formsAPI.getPendingApprovals();
      setItems(res.data.data || []);
    } catch (e) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = async (item, action, comment) => {
    try {
      if (action === 'approve') {
        const res = await formsAPI.approveStep(item.formId, item.id, comment);
        toast.success(res.data.message || 'Étape approuvée');
      } else {
        const res = await formsAPI.rejectStep(item.formId, item.id, comment);
        toast.success(res.data.message || 'Réponse rejetée');
      }
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erreur');
      throw e;
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ClipboardCheck size={22} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--fg)' }}>Approbations en attente</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--fg-muted)' }}>
            Formulaires dont vous êtes le validateur à l'étape en cours
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, background: 'var(--surface)', border: '1.5px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin .7s linear infinite' : 'none' }} />
          Actualiser
        </button>
      </div>

      {/* Contenu */}
      {loading && !items.length ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 12 }}>
          <Loader2 size={22} style={{ animation: 'spin .7s linear infinite', color: 'var(--brand)' }} />
        </div>
      ) : items.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', gap: 12 }}>
          <CheckCircle size={56} style={{ color: '#10b981', opacity: .5 }} />
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>Aucune approbation en attente</p>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>Toutes les soumissions ont été traitées.</p>
        </div>
      ) : (
        <>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--fg-muted)' }}>
            {items.length} soumission{items.length > 1 ? 's' : ''} à traiter
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {items.map(item => (
              <ApprovalCard
                key={item.id}
                item={item}
                onApprove={(it) => setModal({ item: it, action: 'approve' })}
                onReject={(it)  => setModal({ item: it, action: 'reject' })}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal action */}
      {modal && (
        <ActionModal
          item={modal.item}
          action={modal.action}
          onClose={() => setModal(null)}
          onConfirm={handleConfirm}
        />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
