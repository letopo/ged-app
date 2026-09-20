// frontend/src/components/AddServiceModal.jsx
import React, { useState } from 'react';
import { X, Building2 } from 'lucide-react';

const inputStyle = {
  width: '100%', height: 36, padding: '0 10px', boxSizing: 'border-box',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
  background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none',
};

export default function AddServiceModal({ onAdd, onClose }) {
  const [serviceName, setServiceName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!serviceName.trim()) { setError('Veuillez entrer un nom de service'); return; }
    onAdd(serviceName.trim());
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16,
    }}>
      <div className="animate-fadeIn" style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)',
        width: '100%', maxWidth: 420, overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          background: 'var(--brand)', padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={18} color="#fff" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Créer un nouveau service</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '18px 20px' }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)', display: 'block', marginBottom: 5 }}>
              Nom du service *
            </label>
            <input
              style={inputStyle}
              type="text"
              value={serviceName}
              onChange={e => { setServiceName(e.target.value); setError(''); }}
              placeholder="Ex: Chirurgie, Urgences, Laboratoire…"
              autoFocus
              required
            />
          </div>

          {error && (
            <div style={{
              padding: '8px 10px', borderRadius: 'var(--radius-2)', marginBottom: 12,
              background: 'var(--danger-soft)', color: 'var(--danger)',
              fontSize: 12, border: '1px solid var(--danger)',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <button
              type="button" onClick={onClose}
              style={{ flex: 1, height: 34, borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 13, cursor: 'pointer' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              style={{ flex: 1, height: 34, borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
