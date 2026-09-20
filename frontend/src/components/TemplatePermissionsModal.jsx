// frontend/src/components/TemplatePermissionsModal.jsx
import React, { useState, useEffect } from 'react';
import { templatePermissionsAPI } from '../services/api';
import { X, Shield, Users, Lock, Unlock, Loader, Search, ChevronDown, ChevronUp, RefreshCw, Building2, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'validator', label: 'Validateur' },
  { value: 'user', label: 'Utilisateur' },
];

const ROLE_STYLES = {
  admin:     { background: 'var(--danger-soft)',  color: 'var(--danger)'  },
  validator: { background: 'rgba(139,92,246,0.12)', color: '#7c3aed'      },
  user:      { background: 'var(--surface-2)',    color: 'var(--fg-muted)' },
};

const TemplatePermissionsModal = ({ isOpen, onClose }) => {
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { if (isOpen) loadData(); }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [permRes, usersRes] = await Promise.all([
        templatePermissionsAPI.getAll(),
        templatePermissionsAPI.getUsers(),
      ]);
      setPermissions(permRes.data.data || []);
      setUsers(usersRes.data.data || []);
    } catch {
      toast.error('Erreur chargement des permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
      const res = await templatePermissionsAPI.seed();
      toast.success(res.data.message);
      loadData();
    } catch {
      toast.error('Erreur lors du seed');
    }
  };

  const toggleRestricted = async (perm) => {
    setSaving(perm.id);
    try {
      await templatePermissionsAPI.update(perm.id, { isRestricted: !perm.isRestricted });
      setPermissions(prev => prev.map(p => p.id === perm.id ? { ...p, isRestricted: !p.isRestricted } : p));
      toast.success(`${perm.templateName} : ${!perm.isRestricted ? 'restreint' : 'accessible à tous'}`);
    } catch {
      toast.error('Erreur mise à jour');
    } finally {
      setSaving(null);
    }
  };

  const toggleDefaultVisibility = async (perm) => {
    const newVisibility = perm.defaultVisibility === 'service' ? 'personal' : 'service';
    setSaving(perm.id);
    try {
      await templatePermissionsAPI.update(perm.id, { defaultVisibility: newVisibility });
      setPermissions(prev => prev.map(p => p.id === perm.id ? { ...p, defaultVisibility: newVisibility } : p));
      toast.success(`${perm.templateName} : visibilité par défaut = ${newVisibility === 'service' ? 'service' : 'personnel'}`);
    } catch {
      toast.error('Erreur mise à jour de la visibilité');
    } finally {
      setSaving(null);
    }
  };

  const toggleRole = async (perm, role) => {
    const currentRoles = perm.allowedRoles || [];
    const newRoles = currentRoles.includes(role) ? currentRoles.filter(r => r !== role) : [...currentRoles, role];
    const shouldRestrict = newRoles.length > 0 || (perm.allowedUserIds?.length > 0);
    setSaving(perm.id);
    try {
      await templatePermissionsAPI.update(perm.id, { allowedRoles: newRoles, isRestricted: shouldRestrict });
      setPermissions(prev => prev.map(p => p.id === perm.id ? { ...p, allowedRoles: newRoles, isRestricted: shouldRestrict } : p));
    } catch {
      toast.error('Erreur mise à jour des rôles');
    } finally {
      setSaving(null);
    }
  };

  const toggleUser = async (perm, userId) => {
    const currentUsers = perm.allowedUserIds || [];
    const newUsers = currentUsers.includes(userId) ? currentUsers.filter(u => u !== userId) : [...currentUsers, userId];
    const shouldRestrict = newUsers.length > 0 || (perm.allowedRoles?.length > 0);
    setSaving(perm.id);
    try {
      await templatePermissionsAPI.update(perm.id, { allowedUserIds: newUsers, isRestricted: shouldRestrict });
      setPermissions(prev => prev.map(p => p.id === perm.id ? { ...p, allowedUserIds: newUsers, isRestricted: shouldRestrict } : p));
    } catch {
      toast.error('Erreur mise à jour des utilisateurs');
    } finally {
      setSaving(null);
    }
  };

  const filteredPermissions = permissions.filter(p =>
    p.templateName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  const inputStyle = {
    width: '100%', padding: '8px 14px', paddingLeft: 36,
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-3)',
    background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 9999 }}>
      <div className="animate-fadeIn" style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)',
        width: '100%', maxWidth: 896, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 8, background: 'var(--brand-soft)', borderRadius: 'var(--radius-3)', display: 'flex' }}>
              <Shield size={18} style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>Permissions des templates</h2>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>Gérez l'accès aux modèles de documents</p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-2)', color: 'var(--fg-muted)', display: 'flex', transition: 'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
            <input type="text" placeholder="Rechercher un template..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} style={inputStyle} />
          </div>
          {!loading && (
            <button onClick={handleSeed} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', background: 'var(--brand)', color: '#fff',
              fontSize: 13, fontWeight: 500, borderRadius: 'var(--radius-3)',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-active)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
            >
              <RefreshCw size={14} /> {permissions.length === 0 ? 'Initialiser' : 'Synchroniser'}
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
              <Loader className="animate-spin" size={32} style={{ color: 'var(--brand)', marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Chargement...</p>
            </div>
          ) : filteredPermissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <Shield size={48} style={{ color: 'var(--border)', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>
                {permissions.length === 0
                  ? 'Aucun template configuré. Cliquez sur "Initialiser" pour commencer.'
                  : 'Aucun résultat pour cette recherche.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredPermissions.map(perm => {
                const isExpanded = expandedId === perm.id;
                const isSaving = saving === perm.id;

                return (
                  <div key={perm.id} style={{
                    border: `1px solid ${perm.isRestricted ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-3)',
                    background: perm.isRestricted ? 'rgba(245,158,11,0.04)' : 'var(--surface)',
                  }}>
                    {/* Template row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                      <button onClick={() => toggleRestricted(perm)} disabled={isSaving}
                        title={perm.isRestricted ? 'Restreint — cliquez pour ouvrir à tous' : 'Accessible à tous — cliquez pour restreindre'}
                        style={{
                          padding: 8, borderRadius: 'var(--radius-2)', border: 'none', cursor: 'pointer',
                          background: perm.isRestricted ? 'rgba(245,158,11,0.15)' : 'var(--success-soft)',
                          color: perm.isRestricted ? '#d97706' : 'var(--success)',
                          display: 'flex', transition: 'opacity .15s',
                          opacity: isSaving ? 0.6 : 1,
                        }}
                      >
                        {isSaving ? <Loader className="animate-spin" size={14} /> : perm.isRestricted ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 500, fontSize: 13, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                          {perm.templateName}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>
                          {perm.isRestricted
                            ? `${perm.allowedRoles?.length || 0} rôle(s), ${perm.allowedUserIds?.length || 0} utilisateur(s)`
                            : 'Accessible à tous les utilisateurs'}
                        </p>
                      </div>

                      <button onClick={() => toggleDefaultVisibility(perm)} disabled={isSaving}
                        title={perm.defaultVisibility === 'service'
                          ? 'Par défaut visible par le service — cliquez pour rendre personnel'
                          : 'Par défaut personnel — cliquez pour rendre visible par le service'}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '6px 12px', fontSize: 12, fontWeight: 500,
                          borderRadius: 'var(--radius-2)', border: 'none', cursor: 'pointer', transition: 'background .15s',
                          background: perm.defaultVisibility === 'service' ? 'var(--brand-soft)' : 'var(--surface-2)',
                          color: perm.defaultVisibility === 'service' ? 'var(--brand)' : 'var(--fg-muted)',
                          opacity: isSaving ? 0.6 : 1,
                        }}
                      >
                        {perm.defaultVisibility === 'service' ? <Building2 size={13} /> : <UserIcon size={13} />}
                        {perm.defaultVisibility === 'service' ? 'Service' : 'Personnel'}
                      </button>

                      <button onClick={() => setExpandedId(isExpanded ? null : perm.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '6px 12px', fontSize: 12, fontWeight: 500,
                          color: 'var(--brand)', background: 'var(--brand-soft)',
                          border: 'none', borderRadius: 'var(--radius-2)', cursor: 'pointer', transition: 'background .15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-soft)'}
                      >
                        <Users size={13} />
                        Configurer
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>

                    {/* Expanded config */}
                    {isExpanded && (
                      <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Rôles */}
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, margin: '0 0 8px' }}>
                            Rôles autorisés
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {ROLE_OPTIONS.map(role => {
                              const isActive = (perm.allowedRoles || []).includes(role.value);
                              return (
                                <button key={role.value} onClick={() => toggleRole(perm, role.value)} disabled={isSaving}
                                  style={{
                                    padding: '6px 12px', fontSize: 12, fontWeight: 500,
                                    borderRadius: 'var(--radius-2)', cursor: 'pointer',
                                    border: `1px solid ${isActive ? 'var(--brand)' : 'var(--border)'}`,
                                    background: isActive ? 'var(--brand-soft)' : 'var(--surface)',
                                    color: isActive ? 'var(--brand)' : 'var(--fg-muted)',
                                    transition: 'all .15s',
                                  }}
                                >
                                  {isActive ? '✓ ' : ''}{role.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Utilisateurs */}
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>
                            Utilisateurs autorisés
                          </p>
                          <div style={{ maxHeight: 192, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)' }}>
                            {users.map((u, idx) => {
                              const isActive = (perm.allowedUserIds || []).includes(u.id);
                              return (
                                <label key={u.id} style={{
                                  display: 'flex', alignItems: 'center', gap: 12,
                                  padding: '8px 12px', cursor: 'pointer',
                                  background: isActive ? 'var(--brand-soft)' : 'transparent',
                                  borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                                  transition: 'background .15s',
                                }}
                                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface-2)'; }}
                                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                >
                                  <input type="checkbox" checked={isActive} onChange={() => toggleUser(perm, u.id)}
                                    disabled={isSaving}
                                    style={{ width: 14, height: 14, accentColor: 'var(--brand)', flexShrink: 0 }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                                      {u.firstName} {u.lastName}
                                    </p>
                                    <p style={{ fontSize: 11, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{u.email}</p>
                                  </div>
                                  <span style={{
                                    fontSize: 10, padding: '2px 8px', borderRadius: 999,
                                    ...(ROLE_STYLES[u.role] || ROLE_STYLES.user),
                                  }}>
                                    {u.role}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0 }}>
            {permissions.length} template(s) — Les admins ont toujours accès à tout
          </p>
          <button onClick={onClose} style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 500,
            background: 'var(--surface-2)', color: 'var(--fg)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', cursor: 'pointer', transition: 'background .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplatePermissionsModal;
