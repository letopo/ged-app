// frontend/src/pages/PostesManagement.jsx
// Admin : assigner / retirer les titulaires des postes organisationnels.
import React, { useState, useEffect, useMemo } from 'react';
import { postesAPI, usersAPI } from '../services/api';
import { Briefcase, Plus, X, Loader, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const PostesManagement = () => {
  const [postes, setPostes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null); // code du poste en cours d'ajout
  const [picked, setPicked] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [pRes, uRes] = await Promise.all([postesAPI.getAll(), usersAPI.getAll()]);
      setPostes(pRes.data.data || []);
      const list = uRes.data.data || uRes.data.users || uRes.data || [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error("Erreur de chargement des postes");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const usersById = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);

  const handleAssign = async (code) => {
    if (!picked) return;
    try {
      await postesAPI.assignHolder(code, picked);
      toast.success('Titulaire assigné');
      setAdding(null); setPicked('');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || "Échec de l'assignation");
    }
  };

  const handleRemove = async (code, userId) => {
    try {
      await postesAPI.removeHolder(code, userId);
      toast.success('Titulaire retiré');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Échec du retrait');
    }
  };

  const fullName = (u) => u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email : '—';

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)' }}><Loader className="animate-spin" /> Chargement…</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Briefcase size={22} style={{ color: 'var(--brand)' }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>Postes & Fonctions</h1>
      </div>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 24 }}>
        Assignez les titulaires des postes qui pilotent les circuits de validation (comptable, DG, DDS…).
        Plus besoin de modifier un email dans le code : changez le titulaire ici.
      </p>

      <div style={{ display: 'grid', gap: 14 }}>
        {postes.map(p => (
          <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{p.label}</div>
                {p.description && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{p.description}</div>}
              </div>
              {adding === p.code ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <select value={picked} onChange={e => setPicked(e.target.value)}
                    style={{ height: 32, borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, padding: '0 8px' }}>
                    <option value="">Choisir un utilisateur…</option>
                    {users.filter(u => !(p.holders || []).some(h => h.id === u.id)).map(u => (
                      <option key={u.id} value={u.id}>{fullName(u)} ({u.email})</option>
                    ))}
                  </select>
                  <button onClick={() => handleAssign(p.code)} disabled={!picked}
                    style={{ height: 32, padding: '0 12px', borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: picked ? 'pointer' : 'not-allowed', opacity: picked ? 1 : 0.6 }}>
                    Assigner
                  </button>
                  <button onClick={() => { setAdding(null); setPicked(''); }}
                    style={{ height: 32, width: 32, borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer' }}>
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <button onClick={() => { setAdding(p.code); setPicked(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  <Plus size={14} /> Titulaire
                </button>
              )}
            </div>

            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(p.holders || []).length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>Aucun titulaire</span>
              ) : (
                (p.holders || []).map(h => (
                  <span key={h.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 999, fontSize: 12.5, color: 'var(--fg)' }}>
                    {fullName(h)}
                    <button onClick={() => handleRemove(p.code, h.id)} title="Retirer"
                      style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 0 }}>
                      <X size={13} />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PostesManagement;
