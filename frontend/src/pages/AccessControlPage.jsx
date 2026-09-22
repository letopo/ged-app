// frontend/src/pages/AccessControlPage.jsx
// Page d'administration : gestion centralisée des droits d'accès.
// Onglet 1 — Matrice de droits  (lecture seule, référentiel)
// Onglet 2 — Par utilisateur    (modification rôle + postes)
// Onglet 3 — Audit              (journal des changements de droits)

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Grid3x3, Users, ClipboardList, Check, X, AlertTriangle, ChevronRight, Search, Loader, RefreshCw, Key, Info } from 'lucide-react';
import { accessControlService } from '../services/accessControlService';
import { ROLES, MODULES, CATEGORIES, POSTES_STATIC, getUserModules, getRoleInfo } from '../config/accessDefinitions';
import UserDrawer from '../components/UserDrawer';

// ── Helpers ─────────────────────────────────────────────────────────────────

const initials = (u) =>
  `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase() || '?';

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const ACTION_LABELS = {
  ROLE_CHANGED:       { label: 'Rôle modifié',   color: '#f59e0b' },
  POSTE_ASSIGNED:     { label: 'Poste assigné',   color: '#10b981' },
  POSTE_REMOVED:      { label: 'Poste retiré',    color: '#ef4444' },
  USER_CREATED:       { label: 'Compte créé',     color: '#3b82f6' },
  USER_DELETED:       { label: 'Compte supprimé', color: '#ef4444' },
  USER_ACTIVATED:     { label: 'Activé',          color: '#10b981' },
  USER_DEACTIVATED:   { label: 'Désactivé',       color: '#f59e0b' },
};

// ── Badge rôle ───────────────────────────────────────────────────────────────
function RoleBadge({ roleId, small = false }) {
  const info = getRoleInfo(roleId);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: small ? '2px 6px' : '3px 9px',
      borderRadius: 20,
      fontSize: small ? 11 : 12,
      fontWeight: 600,
      background: info.color + '22',
      color: info.color,
      border: `1px solid ${info.color}44`,
      whiteSpace: 'nowrap',
    }}>
      {info.label}
    </span>
  );
}

// ── Badge poste ──────────────────────────────────────────────────────────────
function PosteBadge({ code, label, small = false }) {
  const info = POSTES_STATIC.find(p => p.code === code);
  const color = info?.color || '#9ca3af';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: small ? '2px 6px' : '3px 9px',
      borderRadius: 20,
      fontSize: small ? 11 : 12,
      fontWeight: 600,
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
      whiteSpace: 'nowrap',
    }}>
      <Key size={small ? 9 : 11} />
      {label || info?.label || code}
    </span>
  );
}

// ── Cellule matrice ──────────────────────────────────────────────────────────
function MatrixCell({ granted, byPoste = false, note = null }) {
  if (note) {
    return (
      <td style={{ textAlign: 'center', padding: '6px 4px', backgroundColor: '#fff8ed' }}>
        <span title={note.text} style={{ fontSize: 16 }}>⚠️</span>
      </td>
    );
  }
  if (granted) {
    return (
      <td style={{ textAlign: 'center', padding: '6px 4px', backgroundColor: byPoste ? '#eff8ff' : '#f0fdf4' }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%', margin: '0 auto',
          background: byPoste ? '#3b82f6' : '#22c55e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={13} color="#fff" strokeWidth={3} />
        </div>
      </td>
    );
  }
  return (
    <td style={{ textAlign: 'center', padding: '6px 4px', backgroundColor: 'transparent' }}>
      <span style={{ color: 'var(--border)', fontSize: 18, lineHeight: 1 }}>—</span>
    </td>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Onglet 1 — Matrice
// ════════════════════════════════════════════════════════════════════════════
function MatrixTab({ dbPostes }) {
  const [category, setCategory] = useState('GED');

  // Colonnes dynamiques : rôles + postes (statiques + ceux présents en DB)
  const posteColumns = useMemo(() => {
    const dbCodes = new Set((dbPostes || []).map(p => p.code));
    const combined = [...POSTES_STATIC];
    (dbPostes || []).forEach(p => {
      if (!POSTES_STATIC.find(s => s.code === p.code)) {
        combined.push({ code: p.code, label: p.label, color: '#9ca3af' });
      }
    });
    return combined;
  }, [dbPostes]);

  const modules = MODULES.filter(m => m.category === category);

  return (
    <div>
      {/* Légende */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={11} color="#fff" strokeWidth={3} />
          </div>
          Accès par rôle
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={11} color="#fff" strokeWidth={3} />
          </div>
          Accès par poste fonctionnel
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          Accès email/service hardcodé (à migrer)
        </div>
      </div>

      {/* Onglets catégories */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: `1.5px solid ${category === cat ? 'var(--brand)' : 'var(--border)'}`,
              background: category === cat ? 'var(--brand)' : 'var(--surface)',
              color: category === cat ? '#fff' : 'var(--fg)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900, fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface)' }}>
              <th style={{
                textAlign: 'left', padding: '10px 14px',
                borderBottom: '2px solid var(--border)',
                position: 'sticky', left: 0, background: 'var(--surface)',
                zIndex: 2, minWidth: 210, fontWeight: 700,
              }}>
                Module
              </th>
              {/* Séparateur colonnes rôles */}
              <th colSpan={ROLES.length} style={{
                textAlign: 'center', padding: '6px 4px',
                borderBottom: '2px solid var(--border)',
                borderLeft: '2px solid var(--border)',
                color: '#22c55e', fontSize: 12, fontWeight: 700,
              }}>
                RÔLES
              </th>
              {/* Séparateur colonnes postes */}
              <th colSpan={posteColumns.length} style={{
                textAlign: 'center', padding: '6px 4px',
                borderBottom: '2px solid var(--border)',
                borderLeft: '2px solid var(--border)',
                color: '#3b82f6', fontSize: 12, fontWeight: 700,
              }}>
                POSTES FONCTIONNELS
              </th>
            </tr>
            <tr style={{ background: 'var(--surface)' }}>
              <th style={{
                position: 'sticky', left: 0, background: 'var(--surface)',
                zIndex: 2, borderBottom: '1px solid var(--border)',
              }} />
              {ROLES.map((r, i) => (
                <th key={r.id} style={{
                  padding: '8px 4px',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: i === 0 ? '2px solid var(--border)' : undefined,
                  textAlign: 'center', minWidth: 68,
                }}>
                  <div style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    maxHeight: 90, fontSize: 11, fontWeight: 600,
                    color: r.color, whiteSpace: 'nowrap',
                  }}>
                    {r.label}
                  </div>
                </th>
              ))}
              {posteColumns.map((p, i) => (
                <th key={p.code} style={{
                  padding: '8px 4px',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: i === 0 ? '2px solid var(--border)' : undefined,
                  textAlign: 'center', minWidth: 68,
                }}>
                  <div style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    maxHeight: 90, fontSize: 11, fontWeight: 600,
                    color: p.color || '#3b82f6', whiteSpace: 'nowrap',
                  }}>
                    {p.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((mod, ri) => (
              <tr key={mod.id} style={{ background: ri % 2 === 0 ? 'transparent' : 'var(--surface)' }}>
                <td style={{
                  padding: '8px 14px',
                  borderBottom: '1px solid var(--border)',
                  position: 'sticky', left: 0,
                  background: ri % 2 === 0 ? 'var(--bg, #fff)' : 'var(--surface)',
                  zIndex: 1,
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{mod.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{mod.description}</div>
                  {mod.note && (
                    <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 3, display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                      <AlertTriangle size={10} style={{ flexShrink: 0, marginTop: 1 }} />
                      {mod.note.text}
                    </div>
                  )}
                </td>
                {/* Colonnes rôles */}
                {ROLES.map((r, i) => {
                  const granted = mod.roles.includes(r.id);
                  // Si email-based et admin → déjà affiché via ⚠️ sur la colonne admin, skip note
                  return (
                    <MatrixCell
                      key={r.id}
                      granted={granted}
                      byPoste={false}
                      note={mod.note && r.id !== 'admin' ? null : null}
                      style={i === 0 ? { borderLeft: '2px solid var(--border)' } : undefined}
                    />
                  );
                })}
                {/* Colonnes postes */}
                {posteColumns.map((p, i) => {
                  const granted = mod.postes.includes(p.code);
                  return (
                    <td
                      key={p.code}
                      style={{
                        textAlign: 'center', padding: '6px 4px',
                        backgroundColor: granted ? '#eff8ff' : 'transparent',
                        borderLeft: i === 0 ? '2px solid var(--border)' : undefined,
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {granted ? (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', margin: '0 auto', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={13} color="#fff" strokeWidth={3} />
                        </div>
                      ) : (
                        <span style={{ color: 'var(--border)', fontSize: 18 }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--fg-muted)' }}>
        <Info size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
        Cette matrice est un <strong>référentiel de lecture</strong>. Pour modifier un droit réel, il faut mettre à jour le code source (App.jsx + middleware backend). L'onglet «Par utilisateur» permet d'assigner rôles et postes.
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Onglet 2 — Par utilisateur (liste + drawer)
// ════════════════════════════════════════════════════════════════════════════
function UsersTab({ users, dbPostes, onReload }) {
  const [search, setSearch] = useState('');
  const [drawerUser, setDrawerUser] = useState(null);
  const [filterRole, setFilterRole] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = users;
    if (q) list = list.filter(u =>
      (u.firstName + ' ' + u.lastName + ' ' + u.email + ' ' + u.username).toLowerCase().includes(q)
    );
    if (filterRole) list = list.filter(u => u.role === filterRole);
    return list;
  }, [users, search, filterRole]);

  // Sync drawer user quand la liste est rechargée
  useEffect(() => {
    if (drawerUser) {
      const fresh = users.find(u => u.id === drawerUser.id);
      if (fresh) setDrawerUser(fresh);
    }
  }, [users]);

  // Grouper par rôle pour l'affichage
  const byRole = useMemo(() => {
    const groups = {};
    filtered.forEach(u => {
      if (!groups[u.role]) groups[u.role] = [];
      groups[u.role].push(u);
    });
    return groups;
  }, [filtered]);

  const roleOrder = ROLES.map(r => r.id).filter(id => byRole[id]);

  return (
    <>
      {/* Barre de filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 8px 8px 30px',
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--surface)', color: 'var(--fg)', fontSize: 13,
            }}
          />
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          style={{
            padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, cursor: 'pointer',
          }}
        >
          <option value="">Tous les rôles</option>
          {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginLeft: 'auto' }}>
          {filtered.length} sur {users.length} utilisateur(s)
        </div>
      </div>

      {/* Grille de cartes */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--fg-muted)' }}>
          <Users size={40} opacity={0.25} style={{ display: 'block', margin: '0 auto 10px' }} />
          Aucun utilisateur ne correspond à ces filtres.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {roleOrder.map(roleId => {
            const roleUsers = byRole[roleId];
            const rInfo = getRoleInfo(roleId);
            return (
              <div key={roleId}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                  paddingBottom: 6, borderBottom: `2px solid ${rInfo.color}33`,
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: rInfo.color, display: 'inline-block', flexShrink: 0,
                  }} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: rInfo.color }}>{rInfo.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>— {roleUsers.length} compte(s)</span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 10,
                }}>
                  {roleUsers.map(u => (
                    <UserCard key={u.id} user={u} onOpen={() => setDrawerUser(u)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer */}
      {drawerUser && (
        <UserDrawer
          user={drawerUser}
          dbPostes={dbPostes}
          onClose={() => setDrawerUser(null)}
          onUpdate={onReload}
        />
      )}
    </>
  );
}

// ── Carte utilisateur ─────────────────────────────────────────────────────────
function UserCard({ user, onOpen }) {
  const rInfo = getRoleInfo(user.role);
  const posteCodes = (user.postes || []).map(p => p.code);
  const moduleCount = getUserModules(user.role, posteCodes).length;

  return (
    <div
      onClick={onOpen}
      style={{
        padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
        border: `1px solid var(--border)`,
        background: 'var(--surface)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = rInfo.color + '88'; e.currentTarget.style.boxShadow = `0 2px 12px ${rInfo.color}22`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: rInfo.color + '22', color: rInfo.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 14,
        border: `2px solid ${rInfo.color}44`,
      }}>
        {`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '?'}
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.firstName} {user.lastName}
          </span>
          {!user.isActive && (
            <span style={{ flexShrink: 0, padding: '1px 6px', borderRadius: 10, fontSize: 10, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              Inactif
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
          {user.email}
        </div>
        <div style={{ marginTop: 6, display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          {(user.postes || []).map(p => {
            const pInfo = POSTES_STATIC.find(s => s.code === p.code);
            const color = pInfo?.color || '#9ca3af';
            return (
              <span key={p.code} style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '2px 6px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                background: color + '20', color,
              }}>
                <Key size={8} />
                {p.label || p.code}
              </span>
            );
          })}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
            {moduleCount} modules
          </span>
        </div>
      </div>
      <ChevronRight size={14} color="var(--fg-muted)" style={{ flexShrink: 0, marginTop: 3 }} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Onglet 3 — Audit
// ════════════════════════════════════════════════════════════════════════════
function AuditTab({ logs, loading }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return logs;
    return logs.filter(l =>
      (l.userName + ' ' + l.userEmail + ' ' + l.action + ' ' + JSON.stringify(l.details || {})).toLowerCase().includes(q)
    );
  }, [logs, search]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher dans les logs…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '7px 8px 7px 30px',
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--surface)', color: 'var(--fg)', fontSize: 13,
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', alignSelf: 'center' }}>
          {filtered.length} entrée(s)
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg-muted)', fontSize: 14 }}>
          <ClipboardList size={40} opacity={0.3} style={{ display: 'block', margin: '0 auto 10px' }} />
          Aucune entrée d'audit trouvée pour les actions de droits d'accès.
        </div>
      ) : (
        <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                {['Date', 'Effectué par', 'Action', 'Détails'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid var(--border)', fontWeight: 700, fontSize: 12, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => {
                const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: '#9ca3af' };
                const det = log.details || {};
                return (
                  <tr key={log.id || i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--surface)' }}>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--fg-muted)', fontSize: 12 }}>
                      {fmtDate(log.createdAt)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{log.userName || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{log.userEmail}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: actionInfo.color + '22', color: actionInfo.color,
                        border: `1px solid ${actionInfo.color}44`,
                      }}>
                        {actionInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>
                      {log.action === 'ROLE_CHANGED' && (
                        <span>
                          <strong>{det.targetUser}</strong> :{' '}
                          <RoleBadge roleId={det.oldRole} small /> → <RoleBadge roleId={det.newRole} small />
                        </span>
                      )}
                      {(log.action === 'POSTE_ASSIGNED' || log.action === 'POSTE_REMOVED') && (
                        <span>
                          <strong>{det.userName || det.userId}</strong> — <PosteBadge code={det.posteCode} label={det.posteLabel} small />
                        </span>
                      )}
                      {!['ROLE_CHANGED', 'POSTE_ASSIGNED', 'POSTE_REMOVED'].includes(log.action) && (
                        <span style={{ color: 'var(--fg-muted)' }}>{JSON.stringify(det).slice(0, 80)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Composant principal
// ════════════════════════════════════════════════════════════════════════════
export default function AccessControlPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('matrix');
  const [users, setUsers] = useState([]);
  const [dbPostes, setDbPostes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadUsers = useCallback(async () => {
    const data = await accessControlService.getUsersWithPostes();
    setUsers(data);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, postesData] = await Promise.all([
        accessControlService.getUsersWithPostes(),
        accessControlService.getPostes().catch(() => []),
      ]);
      setUsers(usersData);
      setDbPostes(Array.isArray(postesData) ? postesData : (postesData?.postes || []));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const logs = await accessControlService.getAccessAuditLogs();
      setAuditLogs(logs);
    } catch (_) {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === 'audit' && auditLogs.length === 0) loadAudit();
  }, [tab]);

  const TABS = [
    { id: 'matrix', label: 'Matrice d\'accès', icon: Grid3x3 },
    { id: 'users',  label: 'Par utilisateur',  icon: Users },
    { id: 'audit',  label: 'Audit',             icon: ClipboardList },
  ];

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={22} color="var(--brand)" />
            Gestion des droits d'accès
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--fg-muted)' }}>
            Matrice de référence, attribution des rôles et postes, journal d'audit.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--fg)', cursor: 'pointer', fontSize: 13,
          }}
        >
          <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Actualiser
        </button>
      </div>

      {/* Barre de stats */}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Utilisateurs', value: users.length, color: '#3b82f6' },
            { label: 'Modules définis', value: MODULES.length, color: '#8b5cf6' },
            { label: 'Rôles disponibles', value: ROLES.length, color: '#f59e0b' },
            { label: 'Postes en DB', value: dbPostes.length, color: '#10b981' },
            { label: 'Accès email hardcodés ⚠️', value: MODULES.filter(m => m.note).length, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{
              padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 18px',
                border: 'none', borderBottom: active ? '2px solid var(--brand)' : '2px solid transparent',
                marginBottom: -2,
                background: 'transparent',
                color: active ? 'var(--brand)' : 'var(--fg-muted)',
                fontWeight: active ? 700 : 500, fontSize: 14,
                cursor: 'pointer', transition: 'color 0.15s',
              }}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Contenu */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
          <Loader size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--brand)' }} />
          <div style={{ color: 'var(--fg-muted)', fontSize: 14 }}>{t('Chargement…')}</div>
        </div>
      ) : error ? (
        <div style={{
          padding: 24, borderRadius: 10, background: '#fef2f2',
          border: '1px solid #fecaca', color: '#dc2626', fontSize: 14,
        }}>
          <strong>Erreur :</strong> {error}
          <button onClick={load} style={{ marginLeft: 16, fontSize: 13, cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none', color: '#dc2626' }}>
            Réessayer
          </button>
        </div>
      ) : (
        <>
          {tab === 'matrix' && <MatrixTab dbPostes={dbPostes} />}
          {tab === 'users'  && <UsersTab users={users} dbPostes={dbPostes} onReload={loadUsers} />}
          {tab === 'audit'  && <AuditTab logs={auditLogs} loading={auditLoading} />}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
