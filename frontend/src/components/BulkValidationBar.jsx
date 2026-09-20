// frontend/src/components/BulkValidationBar.jsx
import React from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export default function BulkValidationBar({ selectedCount, maxSelection, onApprove, onReject, onCancel, disabled }) {
  if (selectedCount === 0) return null;

  const isMaxReached = selectedCount >= maxSelection;

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9000,
      background: 'var(--brand)', borderRadius: 'var(--radius-4)',
      boxShadow: 'var(--shadow-3)',
      display: 'flex', alignItems: 'center', gap: 0,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.15)',
    }}>
      {/* Counter */}
      <div style={{
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
        borderRight: '1px solid rgba(255,255,255,0.18)',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: '#fff', color: 'var(--brand)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, flexShrink: 0,
        }}>
          {selectedCount}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
            {selectedCount} document{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
          </div>
          {isMaxReached && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
              Limite de {maxSelection} documents atteinte
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4 }}>
        <button
          onClick={onApprove}
          disabled={disabled}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 36, padding: '0 14px', borderRadius: 'var(--radius-2)',
            border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
            background: 'var(--success)', color: '#fff',
            fontSize: 13, fontWeight: 500, opacity: disabled ? 0.5 : 1,
          }}
        >
          <CheckCircle size={14} /> Approuver tout
        </button>

        <button
          onClick={onReject}
          disabled={disabled}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 36, padding: '0 14px', borderRadius: 'var(--radius-2)',
            border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
            background: 'var(--danger)', color: '#fff',
            fontSize: 13, fontWeight: 500, opacity: disabled ? 0.5 : 1,
          }}
        >
          <XCircle size={14} /> Rejeter tout
        </button>

        <button
          onClick={onCancel}
          disabled={disabled}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            height: 36, padding: '0 12px', borderRadius: 'var(--radius-2)',
            border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer',
            background: 'transparent', color: '#fff',
            fontSize: 13, fontWeight: 500, opacity: disabled ? 0.5 : 1,
          }}
        >
          <X size={14} /> Annuler
        </button>
      </div>
    </div>
  );
}
