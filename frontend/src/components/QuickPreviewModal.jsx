// frontend/src/components/QuickPreviewModal.jsx
import React from 'react';
import { X, Eye, Calendar, User, FileText } from 'lucide-react';

const QuickPreviewModal = ({ task, onClose }) => {
  if (!task) return null;

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');
  const apiBaseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.60)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 640, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ background: 'var(--brand)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileText size={26} style={{ color: '#fff' }} />
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>Aperçu rapide</h2>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: 0 }}>{task.document.category}</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            padding: 8, borderRadius: 'var(--radius-2)', background: 'none', border: 'none',
            cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center',
            transition: 'background .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.20)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 16, margin: '0 0 16px' }}>
            {task.document.title}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {[
              { Icon: User, label: 'Demandeur', value: `${task.document.uploadedBy?.firstName} ${task.document.uploadedBy?.lastName}` },
              { Icon: Calendar, label: 'Date de soumission', value: formatDate(task.createdAt) },
            ].map(({ Icon, label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--fg-muted)' }}>
                <Icon size={18} />
                <div>
                  <p style={{ fontSize: 11, color: 'var(--fg-subtle)', margin: 0 }}>{label}</p>
                  <p style={{ fontWeight: 600, color: 'var(--fg)', fontSize: 13, margin: 0 }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {task.document.metadata && (
            <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-3)', padding: 16, marginBottom: 16, border: '1px solid var(--border)' }}>
              <h4 style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: 12, fontSize: 13, margin: '0 0 12px' }}>Détails du document</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--fg)' }}>
                {task.document.metadata.service && (
                  <p style={{ margin: 0 }}>
                    <span style={{ color: 'var(--fg-muted)' }}>Service : </span>
                    <span style={{ fontWeight: 600 }}>{task.document.metadata.service}</span>
                  </p>
                )}
                {task.document.metadata.date_debut && task.document.metadata.date_fin && (
                  <p style={{ margin: 0 }}>
                    <span style={{ color: 'var(--fg-muted)' }}>Période : </span>
                    <span style={{ fontWeight: 600 }}>
                      {formatDate(task.document.metadata.date_debut)} → {formatDate(task.document.metadata.date_fin)}
                    </span>
                  </p>
                )}
                {task.document.metadata.motif && (
                  <p style={{ margin: 0 }}>
                    <span style={{ color: 'var(--fg-muted)' }}>Motif : </span>
                    <span style={{ fontWeight: 600 }}>{task.document.metadata.motif}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {task.comment && (
            <div style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand)', borderRadius: 'var(--radius-3)', padding: 16 }}>
              <h4 style={{ fontWeight: 600, color: 'var(--brand)', marginBottom: 8, fontSize: 13, margin: '0 0 8px' }}>Commentaire</h4>
              <p style={{ fontSize: 13, color: 'var(--fg)', margin: 0 }}>{task.comment}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button onClick={onClose} style={{
            padding: '8px 24px', background: 'var(--surface-2)', color: 'var(--fg)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-3)',
            fontSize: 13, cursor: 'pointer', transition: 'background .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
          >
            Fermer
          </button>
          <a href={`${apiBaseUrl}/${task.document.filePath}`} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 24px', background: 'var(--brand)', color: '#fff',
              borderRadius: 'var(--radius-3)', fontSize: 13, fontWeight: 500,
              textDecoration: 'none', transition: 'background .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-active)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
          >
            <Eye size={16} />
            Voir le document complet
          </a>
        </div>
      </div>
    </div>
  );
};

export default QuickPreviewModal;
