// frontend/src/components/DocumentCard.jsx
import React from 'react';
import { Download, Eye, Trash2 } from 'lucide-react';

const CATEGORY_COLOR = {
  facture:    'var(--success)',
  contrat:    'var(--brand)',
  courrier:   'var(--info)',
  rapport:    'var(--warning)',
  formulaire: '#8b5cf6',
};

const STATUS_COLOR = {
  approved:           'var(--success)',
  validated:          'var(--success)',
  pending_validation: 'var(--warning)',
  in_progress:        'var(--warning)',
  draft:              'var(--fg-subtle)',
  rejected:           'var(--danger)',
};

const STATUS_LABEL = {
  approved:           'Approuvé',
  validated:          'Validé',
  pending_validation: 'En attente',
  in_progress:        'En cours',
  draft:              'Brouillon',
  rejected:           'Rejeté',
};

const getFileIcon = (mimeType) => {
  if (mimeType?.includes('pdf'))   return '📄';
  if (mimeType?.includes('word'))  return '📝';
  if (mimeType?.includes('excel') || mimeType?.includes('sheet')) return '📊';
  if (mimeType?.includes('image')) return '🖼️';
  return '📁';
};

const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes < 1024)            return bytes + ' B';
  if (bytes < 1024 * 1024)     return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

export default function DocumentCard({ document, onDelete, onView }) {
  const workflows    = document.Workflows || [];
  const currentWf    = workflows[0] || null;
  const totalSteps   = currentWf?.steps?.length || 0;
  const approvedSteps = currentWf?.steps?.filter(s => s.status === 'approved').length || 0;
  const progress      = totalSteps > 0 ? (approvedSteps / totalSteps) * 100 : 0;

  const statusColor = STATUS_COLOR[document.status] || 'var(--fg-subtle)';
  const catColor    = CATEGORY_COLOR[(document.category || '').toLowerCase()] || 'var(--fg-muted)';

  return (
    <div className="ged-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

      {/* Status badge */}
      <span style={{
        position: 'absolute', top: 12, right: 12,
        background: statusColor, color: '#fff',
        padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      }}>
        {STATUS_LABEL[document.status] || document.status}
      </span>

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 28, lineHeight: 1 }}>{getFileIcon(document.type)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', paddingRight: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {document.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 1 }}>
            Par {document.User?.username || 'Inconnu'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>
            {formatDate(document.createdAt)}
          </div>
        </div>
      </div>

      {/* Workflow progress */}
      {currentWf && totalSteps > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 5 }}>
            Progression ({approvedSteps}/{totalSteps})
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--brand)', borderRadius: 999, transition: 'width .3s' }} />
          </div>
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 72, overflowY: 'auto' }}>
            {currentWf.steps.map((step, i) => {
              const c = step.status === 'approved' ? 'var(--success)' : step.status === 'rejected' ? 'var(--danger)' : 'var(--fg-muted)';
              return (
                <div key={i} style={{ fontSize: 11, color: c }}>
                  {step.User?.username} ({step.status})
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Meta footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 'auto',
        fontSize: 11, color: 'var(--fg-muted)',
      }}>
        <span>{formatFileSize(document.size)}</span>
        <span style={{
          background: catColor, color: '#fff',
          padding: '2px 8px', borderRadius: 'var(--radius-2)', fontSize: 11, fontWeight: 500,
        }}>
          {document.category}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button
          onClick={() => onView(document)}
          style={{
            flex: 1, height: 32, borderRadius: 'var(--radius-2)', border: 'none',
            background: 'var(--brand)', color: '#fff',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          <Eye size={13} /> Voir
        </button>

        <a
          href={`http://localhost:3000/${document.path}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1, height: 32, borderRadius: 'var(--radius-2)',
            border: '1px solid var(--brand)', background: 'transparent', color: 'var(--brand)',
            fontSize: 12, fontWeight: 500, textDecoration: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          <Download size={13} /> Télécharger
        </a>

        <button
          onClick={() => onDelete(document.id)}
          title="Supprimer"
          style={{
            width: 32, height: 32, borderRadius: 'var(--radius-2)', border: 'none',
            background: 'var(--danger-soft)', color: 'var(--danger)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
