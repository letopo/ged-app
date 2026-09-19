// frontend/src/pages/AuditLogPage.jsx
import { useState, useEffect, useRef } from 'react';
import { auditLogAPI } from '../services/api';
import {
  Shield, Search, ChevronLeft, ChevronRight, FileText,
  LogIn, Upload, Trash2, CheckCircle, XCircle, Loader, X
} from 'lucide-react';

const ACTION_CONFIG = {
  LOGIN:   { icon: LogIn,       iconColor: 'var(--brand)',   bg: 'var(--brand-soft)',   label: 'Connexion' },
  UPLOAD:  { icon: Upload,      iconColor: 'var(--success)', bg: 'var(--success-soft)', label: 'Upload' },
  DELETE:  { icon: Trash2,      iconColor: 'var(--danger)',  bg: 'var(--danger-soft)',  label: 'Suppression' },
  APPROVE: { icon: CheckCircle, iconColor: 'var(--success)', bg: 'var(--success-soft)', label: 'Approbation' },
  REJECT:  { icon: XCircle,     iconColor: 'var(--warning)', bg: 'var(--warning-soft)', label: 'Rejet' },
};
const DEFAULT_CONFIG = { icon: FileText, iconColor: 'var(--fg-muted)', bg: 'var(--surface-2)', label: '' };

const inputStyle = { padding: '8px 12px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface-2)', color: 'var(--fg)', outline: 'none' };
const thStyle = { padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px' };
const tdStyle = { padding: '10px 16px', fontSize: 13, verticalAlign: 'middle' };

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
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

  const formatDate = (d) => new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const clearFilters = () => { setSearch(''); setSearchTerm(''); setFilterAction(''); setDateFrom(''); setDateTo(''); };
  const hasFilters = searchTerm || filterAction || dateFrom || dateTo;

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ padding: 10, background: 'rgba(99,102,241,0.1)', borderRadius: 'var(--radius-3)' }}>
          <Shield size={22} style={{ color: '#6366f1' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>Journal d'audit</h1>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>{pagination.total} événements enregistrés</p>
        </div>
      </div>

      {/* Stats rapides */}
      {stats.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {stats.map(s => {
            const cfg = ACTION_CONFIG[s.action] || DEFAULT_CONFIG;
            const active = filterAction === s.action;
            return (
              <button key={s.action}
                onClick={() => setFilterAction(active ? '' : s.action)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-2)', fontSize: 12, fontWeight: 500, cursor: 'pointer', border: active ? '2px solid #6366f1' : '2px solid transparent', background: active ? 'rgba(99,102,241,0.12)' : cfg.bg, color: active ? '#4338ca' : cfg.iconColor }}
              >
                {cfg.label || s.action}
                <span style={{ padding: '1px 6px', background: 'rgba(0,0,0,0.08)', borderRadius: 999, fontSize: 10 }}>{s.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filtres */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
            <input type="text" value={search} onChange={e => handleSearchChange(e.target.value)}
              placeholder="Rechercher par nom, email, action..."
              style={{ ...inputStyle, width: '100%', paddingLeft: 32, boxSizing: 'border-box' }} />
          </div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
          <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>à</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
          {hasFilters && (
            <button onClick={clearFilters}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 12, color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <X size={13} /> Effacer
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <Loader size={24} style={{ color: '#6366f1' }} className="animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--fg-muted)' }}>
            <Shield size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ margin: 0 }}>Aucun événement trouvé</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                  {['Date', 'Utilisateur', 'Action', 'Ressource', 'Détails', 'IP'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const cfg = ACTION_CONFIG[log.action] || DEFAULT_CONFIG;
                  const Icon = cfg.icon;
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ ...tdStyle, color: 'var(--fg-muted)', whiteSpace: 'nowrap', fontSize: 12 }}>{formatDate(log.createdAt)}</td>
                      <td style={tdStyle}>
                        <p style={{ margin: '0 0 2px', color: 'var(--fg)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.userName || '-'}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-muted)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.userEmail}</p>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 'var(--radius-2)', fontSize: 12, fontWeight: 500, background: cfg.bg, color: cfg.iconColor }}>
                          <Icon size={13} />
                          {cfg.label || log.action}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--fg-muted)' }}>{log.resource}</td>
                      <td style={{ ...tdStyle, color: 'var(--fg-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {log.details?.title || log.details?.email || log.details?.documentTitle || '-'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{log.ipAddress || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
              Page {pagination.page} sur {pagination.totalPages} ({pagination.total} résultats)
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
    </div>
  );
}
