// frontend/src/pages/AuditLogPage.jsx
// Journal d'audit : tableau sur ordinateur, cartes sur téléphone ; un clic sur
// un événement ouvre son détail (tous les champs enregistrés).
import { Fragment, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { auditLogAPI } from '../services/api';
import {
  Shield, Search, ChevronLeft, ChevronRight, FileText,
  LogIn, Upload, Trash2, CheckCircle, XCircle, Loader, X,
  UserX, UserCheck, Briefcase, Mail, Settings, Lock, Plug, RefreshCw, Repeat, UserCog, Stamp,
} from 'lucide-react';

const NEUTRAL = { iconColor: 'var(--fg-muted)', bg: 'var(--surface-2)' };
// Libellés en français : traduits à l'affichage (t)
const ACTION_CONFIG = {
  LOGIN:   { icon: LogIn,       iconColor: 'var(--brand)',   bg: 'var(--brand-soft)',   label: 'Connexion' },
  UPLOAD:  { icon: Upload,      iconColor: 'var(--success)', bg: 'var(--success-soft)', label: 'Upload' },
  DELETE:  { icon: Trash2,      iconColor: 'var(--danger)',  bg: 'var(--danger-soft)',  label: 'Suppression' },
  APPROVE: { icon: CheckCircle, iconColor: 'var(--success)', bg: 'var(--success-soft)', label: 'Approbation' },
  REJECT:  { icon: XCircle,     iconColor: 'var(--warning)', bg: 'var(--warning-soft)', label: 'Rejet' },
  RELAUNCH: { icon: RefreshCw, ...NEUTRAL, label: 'Relance du circuit' },
  REASSIGN: { icon: Repeat,    ...NEUTRAL, label: 'Réassignation' },
  ABSENCE_ON:  { icon: UserX,     iconColor: 'var(--warning)', bg: 'var(--warning-soft)', label: 'Absence déclarée' },
  ABSENCE_OFF: { icon: UserCheck, iconColor: 'var(--success)', bg: 'var(--success-soft)', label: 'Retour de présence' },
  POSTE_ASSIGNED: { icon: Briefcase, ...NEUTRAL, label: 'Poste attribué' },
  POSTE_REMOVED:  { icon: Briefcase, ...NEUTRAL, label: 'Poste retiré' },
  POSTE_CREATED:  { icon: Briefcase, ...NEUTRAL, label: 'Poste créé' },
  ROLE_CHANGED:   { icon: UserCog,   ...NEUTRAL, label: 'Rôle modifié' },
  MAIL_SETTINGS_UPDATED: { icon: Mail, ...NEUTRAL, label: 'Messagerie modifiée' },
  MAIL_SETTINGS_TESTED:  { icon: Mail, ...NEUTRAL, label: 'Test de messagerie' },
  TENANT_SETTINGS_UPDATED: { icon: Settings, ...NEUTRAL, label: 'Réglages modifiés' },
  CATEGORY_ACCESS_UPDATED: { icon: Lock,     ...NEUTRAL, label: 'Confidentialité modifiée' },
  INTEGRATION_UPDATED: { icon: Plug, ...NEUTRAL, label: 'Intégration modifiée' },
  INTEGRATION_TESTED:  { icon: Plug, ...NEUTRAL, label: "Test d'intégration" },
  STAMP_UPDATED: { icon: Stamp, ...NEUTRAL, label: 'Cachet modifié' },
};
const DEFAULT_CONFIG = { icon: FileText, ...NEUTRAL, label: '' };

// Noms des champs de détail les plus courants (les autres restent tels quels)
const DETAIL_LABELS = {
  comment: 'Commentaire', documentTitle: 'Document', documentId: 'Identifiant du document',
  title: 'Titre', email: 'E-mail', to: 'Destinataire', kind: 'Type', ok: 'Réussi',
  error: 'Erreur', changed: 'Champs modifiés', category: 'Catégorie',
};

// Code inconnu (ex. FOO_BAR) → « Foo bar »
const humanize = (code) => {
  const s = String(code || '').replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const inputStyle = { padding: '8px 12px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface-2)', color: 'var(--fg)', outline: 'none' };
const thStyle = { padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px' };
const tdStyle = { padding: '10px 16px', fontSize: 13, verticalAlign: 'middle' };

export default function AuditLogPage() {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [selected, setSelected] = useState(null);   // événement affiché en détail
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [stats, setStats] = useState([]);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const searchTimer = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (searchTerm) params.search = searchTerm;
      if (filterAction) params.action = filterAction;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await auditLogAPI.getAll(params);
      setLogs(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
      setStats(res.data.stats?.actions || []);
    } catch (e) {
      console.error('Erreur chargement audit:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [searchTerm, filterAction, dateFrom, dateTo]);

  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearchTerm(val), 400);
  };

  const actionCfg = (action) => ACTION_CONFIG[action] || DEFAULT_CONFIG;
  const actionLabel = (action) => (ACTION_CONFIG[action]?.label ? t(ACTION_CONFIG[action].label) : humanize(action));
  // Connexion : l'utilisateur n'est pas encore authentifié au moment du log → e-mail des détails
  const userLabel = (log) => log.userName || log.details?.email || log.userEmail || '-';
  const userSub = (log) => (log.userName ? log.userEmail : null);
  const summary = (log) => {
    const d = log.details || {};
    return d.title || d.documentTitle || d.email || d.to || d.kind || '-';
  };

  const formatDate = (d) => new Date(d).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : i18n.language, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const clearFilters = () => { setSearch(''); setSearchTerm(''); setFilterAction(''); setDateFrom(''); setDateTo(''); };
  const hasFilters = searchTerm || filterAction || dateFrom || dateTo;

  const ActionBadge = ({ action }) => {
    const cfg = actionCfg(action);
    const Icon = cfg.icon;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 'var(--radius-2)', fontSize: 12, fontWeight: 500, background: cfg.bg, color: cfg.iconColor, whiteSpace: 'nowrap' }}>
        <Icon size={13} />
        {actionLabel(action)}
      </span>
    );
  };

  return (
    <div className="audit-page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ padding: 10, background: 'rgba(99,102,241,0.1)', borderRadius: 'var(--radius-3)' }}>
          <Shield size={22} style={{ color: '#6366f1' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>{t("Journal d'audit")}</h1>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>{t('{{count}} événements enregistrés', { count: pagination.total })}</p>
        </div>
      </div>

      {/* Stats rapides (filtre par action) */}
      {stats.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {stats.map(s => {
            const cfg = actionCfg(s.action);
            const active = filterAction === s.action;
            return (
              <button key={s.action}
                onClick={() => setFilterAction(active ? '' : s.action)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-2)', fontSize: 12, fontWeight: 500, cursor: 'pointer', border: active ? '2px solid #6366f1' : '2px solid transparent', background: active ? 'rgba(99,102,241,0.12)' : cfg.bg, color: active ? '#4338ca' : cfg.iconColor }}
              >
                {actionLabel(s.action)}
                <span style={{ padding: '1px 6px', background: 'rgba(0,0,0,0.08)', borderRadius: 999, fontSize: 10 }}>{s.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filtres */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', padding: 16, marginBottom: 24 }}>
        <div className="audit-filters">
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
            <input type="text" value={search} onChange={e => handleSearchChange(e.target.value)}
              placeholder={t('Rechercher par nom, email, action...')}
              style={{ ...inputStyle, width: '100%', paddingLeft: 32, boxSizing: 'border-box' }} />
          </div>
          <div className="audit-dates">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} aria-label={t('Du')} />
            <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>{t('à')}</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} aria-label={t('Au')} />
          </div>
          {hasFilters && (
            <button onClick={clearFilters}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 12, color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <X size={13} /> {t('Effacer')}
            </button>
          )}
        </div>
      </div>

      {/* Liste */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <Loader size={24} style={{ color: '#6366f1' }} className="animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--fg-muted)' }}>
            <Shield size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ margin: 0 }}>{t('Aucun événement trouvé')}</p>
          </div>
        ) : (
          <>
            {/* Ordinateur : tableau */}
            <div className="audit-table">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    {['Date', 'Utilisateur', 'Action', 'Ressource', 'Détails', 'IP'].map(h => (
                      <th key={h} style={thStyle}>{t(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} onClick={() => setSelected(log)} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ ...tdStyle, color: 'var(--fg-muted)', whiteSpace: 'nowrap', fontSize: 12 }}>{formatDate(log.createdAt)}</td>
                      <td style={tdStyle}>
                        <p style={{ margin: '0 0 2px', color: 'var(--fg)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userLabel(log)}</p>
                        {userSub(log) && <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userSub(log)}</p>}
                      </td>
                      <td style={tdStyle}><ActionBadge action={log.action} /></td>
                      <td style={{ ...tdStyle, color: 'var(--fg-muted)' }}>{log.resource}</td>
                      <td style={{ ...tdStyle, color: 'var(--fg-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{summary(log)}</td>
                      <td style={{ ...tdStyle, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{log.ipAddress || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Téléphone : cartes */}
            <div className="audit-cards">
              {logs.map(log => (
                <button key={log.id} type="button" onClick={() => setSelected(log)} className="audit-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <ActionBadge action={log.action} />
                    <span style={{ fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userLabel(log)}</div>
                  {summary(log) !== '-' && summary(log) !== userLabel(log) && (
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{summary(log)}</div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
              {t('Page {{page}} sur {{pages}} ({{total}} résultats)', { page: pagination.page, pages: pagination.totalPages, total: pagination.total })}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => loadLogs(pagination.page - 1)} disabled={pagination.page <= 1}
                style={{ padding: 6, background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer', opacity: pagination.page <= 1 ? 0.3 : 1, display: 'flex' }}
              >
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => loadLogs(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                style={{ padding: 6, background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer', opacity: pagination.page >= pagination.totalPages ? 0.3 : 1, display: 'flex' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Détail d'un événement */}
      {selected && (
        <div className="audit-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="audit-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <ActionBadge action={selected.action} />
              <button onClick={() => setSelected(null)} aria-label={t('Fermer')}
                style={{ display: 'flex', padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}>
                <X size={18} />
              </button>
            </div>
            <dl className="audit-dl">
              <dt>{t('Date')}</dt><dd>{formatDate(selected.createdAt)}</dd>
              <dt>{t('Utilisateur')}</dt><dd>{userLabel(selected)}{userSub(selected) ? ` — ${userSub(selected)}` : ''}</dd>
              <dt>{t('Ressource')}</dt><dd>{selected.resource || '-'}{selected.resourceId ? <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-subtle)' }}>{selected.resourceId}</span> : null}</dd>
              <dt>{t('IP')}</dt><dd style={{ fontFamily: 'var(--font-mono)' }}>{selected.ipAddress || '-'}</dd>
              {selected.userAgent && (<><dt>{t('Navigateur')}</dt><dd style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{selected.userAgent}</dd></>)}
              {selected.details && Object.keys(selected.details).length > 0 && (
                <>
                  <div className="audit-dl-section">{t('Détails')}</div>
                  {Object.entries(selected.details).map(([k, v]) => (
                    <Fragment key={k}>
                      <dt>{DETAIL_LABELS[k] ? t(DETAIL_LABELS[k]) : k}</dt>
                      <dd>{v === null || v === undefined ? '-' : typeof v === 'boolean' ? (v ? t('Oui') : t('Non')) : typeof v === 'object' ? (Array.isArray(v) ? v.join(', ') : JSON.stringify(v)) : String(v)}</dd>
                    </Fragment>
                  ))}
                </>
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
