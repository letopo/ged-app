// frontend/src/components/WorkflowSubmission.jsx
import { useState, useEffect, useMemo } from 'react';
import { workflowAPI, usersAPI } from '../services/api';
import { CheckCircle, XCircle, Loader, Users, Search } from 'lucide-react';

export default function WorkflowSubmission({ document, onSuccess, onCancel }) {
  const [users, setUsers] = useState([]);
  const [selectedValidators, setSelectedValidators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (currentUser) setCurrentUserId(currentUser.id);
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await usersAPI.getAll();
      setUsers(response.data.users);
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const q = searchTerm.toLowerCase();
    return users.filter(u =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }, [users, searchTerm]);

  const toggleValidator = (userId) =>
    setSelectedValidators(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedValidators.length === 0) { setError('Veuillez sélectionner au moins un validateur'); return; }
    try {
      setLoading(true); setError('');
      await workflowAPI.submitForValidation(document.id, selectedValidators);
      setSuccess('Document soumis pour validation avec succès !');
      setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '8px 14px', paddingLeft: 40,
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-3)',
    background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
  };

  if (loadingUsers) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, color: 'var(--fg)', gap: 8 }}>
      <Loader size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
      <span>Chargement des utilisateurs...</span>
    </div>
  );

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-2)', padding: 24, maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <Users size={22} style={{ color: 'var(--brand)' }} />
          Soumettre pour validation
        </h2>
        {onCancel && (
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--fg)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-muted)'}
          >
            <XCircle size={22} />
          </button>
        )}
      </div>

      {/* Infos document */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-3)', padding: 16, marginBottom: 24, border: '1px solid var(--border)' }}>
        <h3 style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: 6, fontSize: 13, margin: '0 0 6px' }}>Document</h3>
        <p style={{ color: 'var(--fg)', fontSize: 14, margin: 0 }}>{document.title}</p>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '2px 0 0' }}>{document.filename}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 12 }}>
            Sélectionner les validateurs
            <span style={{ color: 'var(--fg-muted)', marginLeft: 8 }}>
              ({selectedValidators.length} sélectionné{selectedValidators.length > 1 ? 's' : ''})
            </span>
          </label>

          {/* Recherche */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
            <input type="text" placeholder="Rechercher par nom ou email..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} style={inputStyle} />
          </div>

          {/* Liste */}
          <div style={{ maxHeight: 256, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filteredUsers.length > 0 ? filteredUsers.map((u) => {
              const selected = selectedValidators.includes(u.id);
              return (
                <div key={u.id} onClick={() => toggleValidator(u.id)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '10px 12px',
                    borderRadius: 'var(--radius-2)', border: `2px solid ${selected ? 'var(--brand)' : 'var(--border)'}`,
                    background: selected ? 'var(--brand-soft)' : 'var(--surface)',
                    cursor: 'pointer', transition: 'border-color .15s, background .15s',
                  }}
                >
                  <input type="checkbox" checked={selected} onChange={() => toggleValidator(u.id)}
                    style={{ width: 14, height: 14, marginRight: 12, accentColor: 'var(--brand)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, color: 'var(--fg)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {u.firstName} {u.lastName}
                      {u.id === currentUserId && (
                        <span style={{ fontSize: 10, background: 'var(--success-soft)', color: 'var(--success)', padding: '2px 6px', borderRadius: 999 }}>Vous</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{u.email}</div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--fg-muted)', fontSize: 13 }}>
                {searchTerm ? 'Aucun utilisateur trouvé pour cette recherche.' : 'Aucun utilisateur disponible.'}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 14, background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-3)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <XCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ marginBottom: 16, padding: 14, background: 'var(--success-soft)', border: '1px solid var(--success)', borderRadius: 'var(--radius-3)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: 'var(--success)' }}>{success}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          {onCancel && (
            <button type="button" onClick={onCancel} disabled={loading} style={{
              flex: 1, padding: '10px 16px', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-3)', background: 'var(--surface-2)', color: 'var(--fg)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'background .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
            >
              Annuler
            </button>
          )}
          <button type="submit" disabled={loading || selectedValidators.length === 0} style={{
            flex: 1, padding: '10px 16px',
            background: 'var(--brand)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-3)',
            fontSize: 13, fontWeight: 500, cursor: (loading || selectedValidators.length === 0) ? 'not-allowed' : 'pointer',
            opacity: (loading || selectedValidators.length === 0) ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background .15s',
          }}
            onMouseEnter={e => { if (!loading && selectedValidators.length > 0) e.currentTarget.style.background = 'var(--brand-active)'; }}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
          >
            {loading ? <><Loader size={16} className="animate-spin" />Soumission...</> : 'Soumettre pour validation'}
          </button>
        </div>
      </form>
    </div>
  );
}
