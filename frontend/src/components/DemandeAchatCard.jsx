// frontend/src/components/DemandeAchatCard.jsx
import React from 'react';
import { Calendar, User } from 'lucide-react';

export default function DemandeAchatCard({ demande, onClick, selected, getStatusConfig }) {
  const statusConfig = getStatusConfig(demande.status);
  const StatusIcon   = statusConfig.icon;

  const totalValue = typeof demande.totalNonRefValue === 'number'
    ? demande.totalNonRefValue
    : parseFloat(demande.totalNonRefValue) || 0;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px', borderRadius: 'var(--radius-3)', cursor: 'pointer',
        transition: 'box-shadow .15s',
        border: selected ? '1.5px solid var(--brand)' : '1px solid var(--border)',
        background: selected ? 'var(--brand-soft)' : 'var(--surface)',
        boxShadow: selected ? 'var(--shadow-2)' : 'none',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.boxShadow = 'var(--shadow-1)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* DA number + status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{demande.daNumber}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>{demande.domain}</div>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
          background: statusConfig.softBg || 'var(--surface-2)',
          color: statusConfig.color || 'var(--fg-muted)',
          flexShrink: 0,
        }}>
          <StatusIcon size={11} />
          {statusConfig.label}
        </span>
      </div>

      {/* Description */}
      <div style={{
        fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        lineHeight: 1.5,
      }}>
        {demande.requestDescription}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-subtle)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <User size={11} /> {demande.requester?.firstName} {demande.requester?.lastName}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={11} /> {new Date(demande.daDate).toLocaleDateString()}
        </span>
      </div>

      {totalValue > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand)' }}>
            {totalValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XAF
          </span>
        </div>
      )}
    </div>
  );
}
