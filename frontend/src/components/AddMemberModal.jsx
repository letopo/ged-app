// frontend/src/components/AddMemberModal.jsx
import React, { useState, useEffect } from 'react';
import { X, UserPlus, Search, Check } from 'lucide-react';
import { usersAPI } from '../services/api';

const inputStyle = {
  width: '100%', height: 34, padding: '0 10px', boxSizing: 'border-box',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
  background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none',
};
const selectStyle = {
  width: '100%', height: 34, padding: '0 8px', boxSizing: 'border-box',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
  background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none',
};
const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)', display: 'block', marginBottom: 5 };

export default function AddMemberModal({ service, fonctions, onAdd, onClose }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedFonction, setSelectedFonction] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fonctionSearch, setFonctionSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await usersAPI.getAll();
        setUsers(response.data.users || response.data.data || []);
        setError('');
      } catch {
        setError('Impossible de charger les utilisateurs');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUser || !selectedFonction) {
      setError('Veuillez sélectionner un utilisateur et une fonction');
      return;
    }
    onAdd(service.id, { userId: selectedUser, fonction: selectedFonction });
  };

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const filteredFonctions = fonctions.filter(f => f.toLowerCase().includes(fonctionSearch.toLowerCase()));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16,
    }}>
      <div className="animate-fadeIn" style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)',
        width: '100%', maxWidth: 440, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          background: 'var(--brand)', padding: '14px 18px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={18} color="#fff" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Ajouter un membre</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{service.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '16px 18px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* User search */}
          <div>
            <label style={labelStyle}>Rechercher un utilisateur</label>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
              <input
                style={{ ...inputStyle, paddingLeft: 30 }}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Nom, prénom ou email…"
              />
            </div>
          </div>

          {/* User select */}
          <div>
            <label style={labelStyle}>Utilisateur *</label>
            {loading ? (
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Chargement…</div>
            ) : (
              <select
                style={selectStyle}
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                required
              >
                <option value="">— Sélectionnez un utilisateur —</option>
                {filteredUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                ))}
              </select>
            )}
          </div>

          {/* Fonction with search */}
          <div>
            <label style={labelStyle}>
              Fonction *{' '}
              <span style={{ fontWeight: 400, color: 'var(--fg-subtle)' }}>({fonctions.length} disponibles)</span>
            </label>

            <div style={{ position: 'relative', marginBottom: 6 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
              <input
                style={{ ...inputStyle, paddingLeft: 30 }}
                type="text"
                placeholder="Rechercher une fonction…"
                value={fonctionSearch}
                onChange={e => setFonctionSearch(e.target.value)}
              />
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', maxHeight: 180, overflowY: 'auto', background: 'var(--surface-2)' }}>
              {filteredFonctions.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: 'var(--fg-muted)' }}>
                  Aucune fonction trouvée pour « {fonctionSearch} »
                </div>
              ) : filteredFonctions.map(fonction => {
                const isSelected = selectedFonction === fonction;
                return (
                  <div
                    key={fonction}
                    onClick={() => { setSelectedFonction(fonction); setFonctionSearch(''); }}
                    style={{
                      padding: '8px 12px', cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      background: isSelected ? 'var(--brand-soft)' : 'transparent',
                      color: isSelected ? 'var(--brand)' : 'var(--fg)',
                      fontWeight: isSelected ? 500 : 400,
                      fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-3)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {fonction}
                    {isSelected && <Check size={13} color="var(--brand)" />}
                  </div>
                );
              })}
            </div>

            {/* Selected fonction display */}
            {selectedFonction && (
              <div style={{
                marginTop: 6, padding: '7px 10px', borderRadius: 'var(--radius-2)',
                background: 'var(--success-soft)', border: '1px solid var(--success)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12,
              }}>
                <span style={{ color: 'var(--success)', fontWeight: 500 }}>
                  ✓ {selectedFonction}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFonction('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 11 }}
                >
                  Annuler
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '8px 10px', borderRadius: 'var(--radius-2)', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 12, border: '1px solid var(--danger)' }}>
              {error}
            </div>
          )}

          {/* Footer buttons */}
          <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
            <button
              type="button" onClick={onClose}
              style={{ flex: 1, height: 34, borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 13, cursor: 'pointer' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!selectedUser || !selectedFonction}
              style={{
                flex: 1, height: 34, borderRadius: 'var(--radius-2)', border: 'none',
                background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 500,
                cursor: (!selectedUser || !selectedFonction) ? 'not-allowed' : 'pointer',
                opacity: (!selectedUser || !selectedFonction) ? 0.5 : 1,
              }}
            >
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
