// frontend/src/components/UserDrawer.jsx
// Drawer latéral droit — profil complet d'un utilisateur.
// Onglets : Droits (rôle + postes + modules) · Activité · Actions
// Usage : <UserDrawer user={u} dbPostes={[...]} onClose={fn} onUpdate={fn} />

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Shield, Key, Grid3x3, Activity, Settings2,
  Check, RefreshCw, Trash2, Power, Eye, EyeOff,
  Copy, AlertTriangle, Loader, ChevronDown, ChevronRight,
} from 'lucide-react';
import { accessControlService } from '../services/accessControlService';
import { ROLES, MODULES, CATEGORIES, POSTES_STATIC, getUserModules, getRoleInfo } from '../config/accessDefinitions';
import i18n from '../i18n/config';

// ── Helpers ──────────────────────────────────────────────────────────────────

const BCP47_LOCALES = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', ar: 'ar-SA' };

const initials = (u) =>
  `${u?.firstName?.[0] || ''}${u?.lastName?.[0] || ''}`.toUpperCase() || '?';

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString(BCP47_LOCALES[i18n.language] || 'fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ── Mini badge rôle ───────────────────────────────────────────────────────────
function RoleBadge({ roleId }) {
  const { t } = useTranslation();
  const info = getRoleInfo(roleId);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: info.color + '22', color: info.color,
      border: `1px solid ${info.color}44`,
    }}>
      {t(info.label)}
    </span>
  );
}

// ── Mini badge poste ──────────────────────────────────────────────────────────
function PosteBadge({ code, label }) {
  const { t } = useTranslation();
  const info = POSTES_STATIC.find(p => p.code === code);
  const color = info?.color || '#9ca3af';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '3px 9px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: color + '22', color,
      border: `1px solid ${color}44`,
    }}>
      <Key size={10} />
      {t(label || info?.label || code)}
    </span>
  );
}

// ── Notice inline ─────────────────────────────────────────────────────────────
function Notice({ msg, type = 'ok', onDismiss }) {
  if (!msg) return null;
  const ok = type === 'ok';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px', borderRadius: 8, marginBottom: 12,
      background: ok ? '#f0fdf4' : '#fef2f2',
      color: ok ? '#15803d' : '#dc2626',
      border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
      fontSize: 13,
    }}>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1 }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ── Onglet Droits ─────────────────────────────────────────────────────────────
function DroitsTab({ user, dbPostes, onNotify, onUserUpdate }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const posteCodes = useMemo(() => (user.postes || []).map(p => p.code), [user.postes]);
  const accessibleModules = useMemo(() => getUserModules(user.role, posteCodes), [user.role, posteCodes]);

  const toggleCollapse = (cat) => setCollapsed(s => ({ ...s, [cat]: !s[cat] }));

  const handleRoleChange = async (newRole) => {
    if (newRole === user.role) return;
    setSaving(true);
    try {
      await accessControlService.updateRole(user.id, newRole);
      onNotify(t('Rôle mis à jour'), 'ok');
      await onUserUpdate();
    } catch (e) {
      onNotify(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePosteToggle = async (code, assigned) => {
    setSaving(true);
    try {
      if (assigned) {
        await accessControlService.removePoste(code, user.id);
        onNotify(t('Poste retiré'));
      } else {
        await accessControlService.assignPoste(code, user.id);
        onNotify(t('Poste assigné'));
      }
      await onUserUpdate();
    } catch (e) {
      onNotify(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const posteList = dbPostes.length > 0 ? dbPostes : POSTES_STATIC;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Rôle */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Shield size={14} color="var(--brand)" />
          <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--fg-muted)' }}>{t('Rôle système')}</span>
        </div>
        <select
          value={user.role}
          disabled={saving}
          onChange={e => handleRoleChange(e.target.value)}
          style={{
            width: '100%', padding: '9px 12px',
            border: `1.5px solid var(--border)`, borderRadius: 8,
            background: 'var(--surface)', color: 'var(--fg)', fontSize: 14,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {ROLES.map(r => (
            <option key={r.id} value={r.id}>{t(r.label)}</option>
          ))}
        </select>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
          {t(getRoleInfo(user.role).description)}
        </p>
      </section>

      {/* Postes */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Key size={14} color="#3b82f6" />
          <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--fg-muted)' }}>{t('Postes fonctionnels')}</span>
          {posteCodes.length > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#3b82f6' }}>
              {t('{{count}} assigné(s)', { count: posteCodes.length })}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {posteList.map(p => {
            const code = p.code;
            const assigned = posteCodes.includes(code);
            const pInfo = POSTES_STATIC.find(s => s.code === code);
            const color = pInfo?.color || '#9ca3af';
            return (
              <label
                key={code}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: saving ? 'not-allowed' : 'pointer',
                  padding: '8px 12px', borderRadius: 8,
                  background: assigned ? color + '12' : 'transparent',
                  border: `1px solid ${assigned ? color + '55' : 'var(--border)'}`,
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={assigned}
                  disabled={saving}
                  onChange={() => handlePosteToggle(code, assigned)}
                  style={{ accentColor: color, width: 15, height: 15, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: assigned ? color : 'var(--fg)' }}>{t(p.label)}</div>
                  {pInfo?.description && (
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>{t(pInfo.description)}</div>
                  )}
                </div>
                {assigned && <Check size={13} color={color} strokeWidth={2.5} />}
              </label>
            );
          })}
        </div>
      </section>

      {/* Modules accessibles */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Grid3x3 size={14} color="var(--fg-muted)" />
          <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--fg-muted)' }}>
            {t('Accès ({{count}}/{{total}} modules)', { count: accessibleModules.length, total: MODULES.length })}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {CATEGORIES.map(cat => {
            const catMods = accessibleModules.filter(m => m.category === cat);
            const totalCat = MODULES.filter(m => m.category === cat).length;
            const open = !collapsed[cat];
            if (catMods.length === 0) return null;
            return (
              <div key={cat} style={{ borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <button
                  onClick={() => toggleCollapse(cat)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', background: 'var(--surface)',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 12 }}>{t(cat)}</span>
                  <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>
                    {catMods.length}/{totalCat}
                  </span>
                </button>
                {open && (
                  <div style={{ padding: '4px 12px 10px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {catMods.map(m => {
                      const byPoste = !m.roles.includes(user.role) && posteCodes.some(p => m.postes.includes(p));
                      return (
                        <span key={m.id} style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                          background: byPoste ? '#eff8ff' : '#f0fdf4',
                          color: byPoste ? '#1d4ed8' : '#15803d',
                          border: `1px solid ${byPoste ? '#bfdbfe' : '#bbf7d0'}`,
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          {byPoste && <Key size={9} />}
                          {t(m.label)}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {accessibleModules.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', padding: '8px 0' }}>
              {t('Aucun module accessible avec cette configuration.')}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ── Onglet Activité ───────────────────────────────────────────────────────────
function ActiviteTab({ userId }) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    accessControlService.getUserAuditLogs(userId)
      .then(data => { if (!cancelled) setLogs(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <Loader size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--brand)' }} />
    </div>
  );

  if (logs.length === 0) return (
    <div style={{ textAlign: 'center', padding: 32, color: 'var(--fg-muted)', fontSize: 13 }}>
      <Activity size={36} opacity={0.25} style={{ display: 'block', margin: '0 auto 10px' }} />
      {t('Aucune activité enregistrée pour cet utilisateur.')}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {logs.map((log, i) => (
        <div key={log.id || i} style={{
          padding: '10px 12px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--surface)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <span style={{
              padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: '#f1f5f9', color: '#475569',
            }}>
              {log.action}
            </span>
            <span style={{ fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
              {fmtDate(log.createdAt)}
            </span>
          </div>
          {log.resource && (
            <div style={{ marginTop: 5, fontSize: 12, color: 'var(--fg)' }}>
              <span style={{ color: 'var(--fg-muted)' }}>{t('Ressource :')} </span>
              {log.resource}{log.resourceId ? ` · ${String(log.resourceId).slice(0, 8)}…` : ''}
            </div>
          )}
          {log.ipAddress && (
            <div style={{ marginTop: 3, fontSize: 11, color: 'var(--fg-muted)' }}>
              {t('IP :')} {log.ipAddress}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Onglet Actions ────────────────────────────────────────────────────────────
function ActionsTab({ user, onNotify, onUserUpdate, onClose }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(null); // 'toggle'|'reset'|'delete'
  const [newPwd, setNewPwd] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleToggleActive = async () => {
    setSaving('toggle');
    try {
      await accessControlService.toggleActive(user.id, !user.isActive);
      onNotify(user.isActive ? t('Compte désactivé') : t('Compte activé'));
      await onUserUpdate();
    } catch (e) {
      onNotify(e.message, 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleResetPassword = async () => {
    setSaving('reset');
    setNewPwd(null);
    try {
      const res = await accessControlService.resetPassword(user.id);
      setNewPwd(res.newPassword);
      onNotify(t('Mot de passe réinitialisé'));
    } catch (e) {
      onNotify(e.message, 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async () => {
    setSaving('delete');
    try {
      await accessControlService.deleteUser(user.id);
      onNotify(t('Utilisateur supprimé'));
      onClose();
      await onUserUpdate();
    } catch (e) {
      onNotify(e.message, 'error');
      setConfirmDelete(false);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Reset mot de passe */}
      <div style={{ padding: '16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <RefreshCw size={15} color="#f59e0b" />
          <span style={{ fontWeight: 700, fontSize: 14 }}>{t('Réinitialiser le mot de passe')}</span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
          {t("Génère un nouveau mot de passe aléatoire et l'affiche une seule fois.")}
        </p>
        {newPwd && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 12,
            background: '#fffbeb', border: '1px solid #fde68a',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, letterSpacing: 1, flex: 1 }}>
              {newPwd}
            </span>
            <button
              onClick={() => navigator.clipboard?.writeText(newPwd)}
              title={t('Copier')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <Copy size={15} color="#92400e" />
            </button>
          </div>
        )}
        <button
          onClick={handleResetPassword}
          disabled={saving === 'reset'}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 8, border: '1.5px solid #fde68a',
            background: '#fffbeb', color: '#92400e',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {saving === 'reset'
            ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
            : <RefreshCw size={13} />}
          {newPwd ? t('Générer un nouveau mot de passe') : t('Réinitialiser')}
        </button>
      </div>

      {/* Activer / Désactiver */}
      <div style={{ padding: '16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Power size={15} color={user.isActive ? '#ef4444' : '#22c55e'} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            {user.isActive ? t('Désactiver le compte') : t('Activer le compte')}
          </span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
          {user.isActive
            ? t("L'utilisateur ne pourra plus se connecter. Ses données sont conservées.")
            : t("Restaurer l'accès à ce compte.")}
        </p>
        <button
          onClick={handleToggleActive}
          disabled={saving === 'toggle'}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 8,
            border: `1.5px solid ${user.isActive ? '#fecaca' : '#bbf7d0'}`,
            background: user.isActive ? '#fef2f2' : '#f0fdf4',
            color: user.isActive ? '#dc2626' : '#15803d',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {saving === 'toggle'
            ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
            : user.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
          {user.isActive ? t('Désactiver') : t('Activer')}
        </button>
      </div>

      {/* Supprimer */}
      <div style={{ padding: '16px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fff5f5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <AlertTriangle size={15} color="#ef4444" />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#dc2626' }}>{t('Zone dangereuse')}</span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#7f1d1d', lineHeight: 1.5 }}>
          {t('La suppression est')} <strong>{t('irréversible')}</strong>. {t('Les documents liés seront conservés mais orphelins.')}
        </p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 16px', borderRadius: 8,
              border: '1.5px solid #fecaca', background: '#fee2e2',
              color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Trash2 size={13} />
            {t('Supprimer ce compte')}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#dc2626' }}>
              {t('Confirmer la suppression de')} <strong>{user.firstName} {user.lastName}</strong> ?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleDelete}
                disabled={saving === 'delete'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8,
                  border: 'none', background: '#dc2626', color: '#fff',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {saving === 'delete'
                  ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Trash2 size={12} />}
                {t('Supprimer définitivement')}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: '8px 14px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--fg)', fontSize: 13, cursor: 'pointer',
                }}
              >
                {t('Annuler')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Composant principal UserDrawer
// ════════════════════════════════════════════════════════════════════════════
export default function UserDrawer({ user: initialUser, dbPostes, onClose, onUpdate }) {
  const { t } = useTranslation();
  const [user, setUser] = useState(initialUser);
  const [tab, setTab] = useState('droits');
  const [notice, setNotice] = useState(null); // { msg, type }
  const drawerRef = useRef(null);

  // Sync user quand le parent recharge
  useEffect(() => { setUser(initialUser); }, [initialUser]);

  // Fermer avec Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus trap
  useEffect(() => {
    drawerRef.current?.focus();
  }, []);

  const notify = useCallback((msg, type = 'ok') => {
    setNotice({ msg, type });
    if (type === 'ok') setTimeout(() => setNotice(null), 4000);
  }, []);

  const handleUpdate = useCallback(async () => {
    await onUpdate();
  }, [onUpdate]);

  const roleInfo = getRoleInfo(user.role);
  const posteCodes = (user.postes || []).map(p => p.code);

  const TABS = [
    { id: 'droits',   label: t('Droits'),    icon: Shield },
    { id: 'activite', label: t('Activité'),  icon: Activity },
    { id: 'actions',  label: t('Actions'),   icon: Settings2 },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          zIndex: 1000, animation: 'fadeIn 0.15s ease',
        }}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 480, maxWidth: '95vw',
          background: 'var(--bg, #fff)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
          zIndex: 1001,
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.22s cubic-bezier(0.25,0.46,0.45,0.94)',
          outline: 'none',
        }}
      >
        {/* En-tête utilisateur */}
        <div style={{
          padding: '20px 20px 0',
          background: roleInfo.color + '10',
          borderBottom: `1px solid ${roleInfo.color}22`,
          flexShrink: 0,
        }}>
          {/* Bouton fermer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, borderRadius: '50%',
                border: '1px solid var(--border)',
                background: 'var(--surface)', cursor: 'pointer',
                color: 'var(--fg-muted)',
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Avatar + infos */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
              background: roleInfo.color + '33', color: roleInfo.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 20,
              border: `3px solid ${roleInfo.color}55`,
            }}>
              {initials(user)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 17, lineHeight: 1.2 }}>
                {user.firstName} {user.lastName}
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 2 }}>
                {user.email}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 1 }}>
                @{user.username}
              </div>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                <RoleBadge roleId={user.role} />
                {(user.postes || []).map(p => (
                  <PosteBadge key={p.code} code={p.code} label={p.label} />
                ))}
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: user.isActive ? '#f0fdf4' : '#fef2f2',
                color: user.isActive ? '#15803d' : '#dc2626',
                border: `1px solid ${user.isActive ? '#bbf7d0' : '#fecaca'}`,
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: user.isActive ? '#22c55e' : '#ef4444',
                  display: 'inline-block',
                }} />
                {user.isActive ? t('Actif') : t('Inactif')}
              </span>
            </div>
          </div>

          {/* Stats rapides */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 12 }}>
            <div style={{ color: 'var(--fg-muted)' }}>
              <span style={{ fontWeight: 700, color: 'var(--fg)', fontSize: 16, marginRight: 4 }}>
                {getUserModules(user.role, posteCodes).length}
              </span>
              {t('modules accessibles')}
            </div>
            <div style={{ color: 'var(--fg-muted)' }}>
              <span style={{ fontWeight: 700, color: 'var(--fg)', fontSize: 16, marginRight: 4 }}>
                {posteCodes.length}
              </span>
              {t('poste(s) assigné(s)')}
            </div>
          </div>

          {/* Onglets */}
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '10px 8px',
                    border: 'none',
                    borderBottom: active ? `2px solid ${roleInfo.color}` : '2px solid transparent',
                    background: 'transparent',
                    color: active ? roleInfo.color : 'var(--fg-muted)',
                    fontWeight: active ? 700 : 500, fontSize: 13,
                    cursor: 'pointer', transition: 'color 0.15s',
                  }}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notice */}
        {notice && (
          <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
            <Notice msg={notice.msg} type={notice.type} onDismiss={() => setNotice(null)} />
          </div>
        )}

        {/* Contenu */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {tab === 'droits'   && <DroitsTab user={user} dbPostes={dbPostes} onNotify={notify} onUserUpdate={handleUpdate} />}
          {tab === 'activite' && <ActiviteTab userId={user.id} />}
          {tab === 'actions'  && <ActionsTab user={user} onNotify={notify} onUserUpdate={handleUpdate} onClose={onClose} />}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn       { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes spin         { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
