import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || '/api';

const STATUS_COLORS = {
  active:    { bg: '#dcfce7', color: '#166534', label: 'Actif' },
  suspended: { bg: '#fef9c3', color: '#854d0e', label: 'Suspendu' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Résilié' },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.active;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600
    }}>
      {s.label}
    </span>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 12, padding: '20px 24px',
      boxShadow: 'var(--shadow-1)', borderLeft: `4px solid ${color}`,
      minWidth: 140
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function SuperAdminPage() {
  const { token } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', subdomain: '', contactName: '', contactPhone: '',
    adminFirstName: '', adminLastName: '', adminEmail: '', adminUsername: '',
    autoDeleteAt: '', notes: ''
  });

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAll = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API}/super-admin/tenants`, { headers }),
        fetch(`${API}/super-admin/stats`, { headers })
      ]);
      const d1 = await r1.json();
      const d2 = await r2.json();
      if (d1.success) setTenants(d1.tenants);
      if (d2.success) setStats(d2.stats);
    } catch (err) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/super-admin/tenants`, {
        method: 'POST', headers,
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setShowForm(false);
      setForm({ name: '', subdomain: '', contactName: '', contactPhone: '', adminFirstName: '', adminLastName: '', adminEmail: '', adminUsername: '', autoDeleteAt: '', notes: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatus = async (id, status, name) => {
    const label = STATUS_COLORS[status]?.label || status;
    if (!confirm(`Passer "${name}" en statut "${label}" ?`)) return;
    try {
      const res = await fetch(`${API}/super-admin/tenants/${id}/status`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      fetchAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Supprimer définitivement "${name}" et tous ses utilisateurs ?`)) return;
    try {
      const res = await fetch(`${API}/super-admin/tenants/${id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      fetchAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--input-bg)',
    color: 'var(--fg)', fontSize: 14, boxSizing: 'border-box'
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 };
  const fieldGroup = { marginBottom: 14 };

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)' }}>Chargement...</div>
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Super Administration</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--fg-muted)', fontSize: 14 }}>
            Gestion des clients SaaS — GED Platform
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            background: 'var(--brand)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 20px', fontWeight: 600,
            cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          {showForm ? '✕ Annuler' : '+ Nouveau client'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
          <StatCard label="Total clients" value={stats.total}     color="#6366f1" />
          <StatCard label="Actifs"        value={stats.active}    color="#16a34a" />
          <StatCard label="Suspendus"     value={stats.suspended} color="#ca8a04" />
          <StatCard label="Résiliés"      value={stats.cancelled} color="#dc2626" />
        </div>
      )}

      {/* Formulaire création */}
      {showForm && (
        <div style={{
          background: 'var(--surface)', borderRadius: 12, padding: 28,
          boxShadow: 'var(--shadow-2)', marginBottom: 32,
          border: '1px solid var(--border)'
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Nouveau client</h2>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              {/* Infos société */}
              <div>
                <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Informations client
                </h3>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Nom de la société *</label>
                  <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex: Hôpital Sainte-Marie" />
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Sous-domaine * <span style={{ fontWeight: 400 }}>(hsjm → hsjm.hsjmcam.net)</span></label>
                  <input style={inputStyle} value={form.subdomain} onChange={e => setForm(f => ({ ...f, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} required placeholder="ex: hsjm" />
                  {form.subdomain && (
                    <div style={{ fontSize: 12, color: 'var(--brand)', marginTop: 4 }}>
                      URL : https://{form.subdomain}.hsjmcam.net
                    </div>
                  )}
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Nom du contact</label>
                  <input style={inputStyle} value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Responsable" />
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Téléphone contact</label>
                  <input style={inputStyle} value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+237 6xx xxx xxx" />
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Auto-suppression (optionnel)</label>
                  <input style={inputStyle} type="date" value={form.autoDeleteAt} onChange={e => setForm(f => ({ ...f, autoDeleteAt: e.target.value }))} />
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Notes internes</label>
                  <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes visibles uniquement par le super-admin" />
                </div>
              </div>

              {/* Admin du tenant */}
              <div>
                <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Administrateur du client
                </h3>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Prénom *</label>
                  <input style={inputStyle} value={form.adminFirstName} onChange={e => setForm(f => ({ ...f, adminFirstName: e.target.value }))} required placeholder="Jean" />
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Nom *</label>
                  <input style={inputStyle} value={form.adminLastName} onChange={e => setForm(f => ({ ...f, adminLastName: e.target.value }))} required placeholder="DUPONT" />
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Email *</label>
                  <input style={inputStyle} type="email" value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} required placeholder="admin@societe.com" />
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Nom d'utilisateur *</label>
                  <input style={inputStyle} value={form.adminUsername} onChange={e => setForm(f => ({ ...f, adminUsername: e.target.value }))} required placeholder="J-DUPONT" />
                </div>
                <div style={{ background: '#eff6ff', borderRadius: 8, padding: '12px 16px', marginTop: 8, fontSize: 13, color: '#1d4ed8' }}>
                  Un mot de passe temporaire sera généré automatiquement et envoyé par email à l'administrateur.
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', cursor: 'pointer' }}>
                Annuler
              </button>
              <button type="submit" disabled={submitting} style={{ padding: '9px 24px', borderRadius: 8, background: 'var(--brand)', color: '#fff', border: 'none', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Création...' : 'Créer le client'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des tenants */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, boxShadow: 'var(--shadow-1)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 15 }}>
          Clients ({tenants.length})
        </div>
        {tenants.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)' }}>Aucun client pour l'instant.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', fontSize: 12, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>Client</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>Domaine</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>Contact</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>Statut</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>Créé le</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>Auto-supp.</th>
                <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t, i) => (
                <tr key={t.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg)' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>/{t.slug}</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <a href={`https://${t.domain}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)', fontSize: 13 }}>
                      {t.domain}
                    </a>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13 }}>
                    <div>{t.contactName || t.adminEmail || '—'}</div>
                    {t.contactPhone && <div style={{ color: 'var(--fg-muted)' }}>{t.contactPhone}</div>}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <StatusBadge status={t.status} />
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--fg-muted)' }}>
                    {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--fg-muted)' }}>
                    {t.autoDeleteAt ? new Date(t.autoDeleteAt).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {t.slug !== 'hsjm' && (
                        <>
                          {t.status !== 'active' && (
                            <button
                              onClick={() => handleStatus(t.id, 'active', t.name)}
                              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #16a34a', color: '#16a34a', background: 'transparent', cursor: 'pointer' }}
                            >
                              Activer
                            </button>
                          )}
                          {t.status !== 'suspended' && (
                            <button
                              onClick={() => handleStatus(t.id, 'suspended', t.name)}
                              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #ca8a04', color: '#ca8a04', background: 'transparent', cursor: 'pointer' }}
                            >
                              Suspendre
                            </button>
                          )}
                          {t.status !== 'cancelled' && (
                            <button
                              onClick={() => handleStatus(t.id, 'cancelled', t.name)}
                              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #dc2626', color: '#dc2626', background: 'transparent', cursor: 'pointer' }}
                            >
                              Résilier
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(t.id, t.name)}
                            style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #dc2626', color: '#fff', background: '#dc2626', cursor: 'pointer' }}
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                      {t.slug === 'hsjm' && (
                        <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontStyle: 'italic' }}>Tenant principal</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
