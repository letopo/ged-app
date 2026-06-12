import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Users, CheckSquare, X, Loader, ArrowRight } from 'lucide-react';
import { documentsAPI, employeesAPI, workflowAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const DEBOUNCE_MS = 300;

const STATUS_LABELS = {
  approved: 'Approuvé', pending_validation: 'En cours',
  rejected: 'Rejeté', draft: 'Brouillon',
};
const STATUS_BADGE = {
  approved:           { bg: 'var(--success-soft)', color: 'var(--success)' },
  pending_validation: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  rejected:           { bg: 'var(--danger-soft)',  color: 'var(--danger)'  },
  draft:              { bg: 'var(--surface-2)',     color: 'var(--fg-muted)' },
};

function SectionHeader({ label, route, onGo }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 14px 4px',
      fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)',
      textTransform: 'uppercase', letterSpacing: '0.5px',
    }}>
      <span>{label}</span>
      <button
        onClick={() => onGo(route)}
        style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: 11 }}
      >
        Voir tout <ArrowRight size={10} />
      </button>
    </div>
  );
}

function ResultRow({ icon: Icon, iconBg, iconColor, primary, secondary, badge, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
        background: hovered ? 'var(--surface-2)' : 'transparent',
        transition: 'background .1s',
      }}
    >
      <div style={{
        flexShrink: 0, width: 28, height: 28, borderRadius: 'var(--radius-2)',
        background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {primary}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {secondary}
        </div>
      </div>
      {badge && (
        <span style={{
          flexShrink: 0, fontSize: 10, padding: '2px 6px', borderRadius: 999,
          background: badge.bg, color: badge.color, fontWeight: 500,
        }}>{badge.label}</span>
      )}
    </button>
  );
}

export default function GlobalSearch({ hideTrigger = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ documents: [], employees: [], tasks: [] });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(true); }
      if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); setOpen(true); }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    };
    // Permet à d'autres éléments (ex: la barre "Rechercher…" de la sidebar)
    // d'ouvrir la palette via window.dispatchEvent(new Event('global-search:open')).
    const onOpenEvent = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('global-search:open', onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('global-search:open', onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ documents: [], employees: [], tasks: [] });
      setLoading(false);
      return;
    }
    clearTimeout(timerRef.current);
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const canSeeEmployees = user?.role === 'admin' || user?.email === 'hsjm.rh@gmail.com';
        const promises = [
          documentsAPI.getAll({ search: query, page: 1, limit: 5 }),
          workflowAPI.getMyTasks('all'),
        ];
        if (canSeeEmployees) promises.push(employeesAPI.getAll({ search: query, limit: 5 }));

        const settled = await Promise.allSettled(promises);
        const docs = settled[0].status === 'fulfilled' ? (settled[0].value.data.data || []).slice(0, 5) : [];
        const q = query.toLowerCase();
        const tasks = settled[1].status === 'fulfilled'
          ? (settled[1].value.data.tasks || []).filter(t => t.document?.title?.toLowerCase().includes(q)).slice(0, 3)
          : [];
        const employees = (canSeeEmployees && settled[2]?.status === 'fulfilled')
          ? settled[2].value.data.employees || []
          : [];
        setResults({ documents: docs, employees, tasks });
      } catch {
        setResults({ documents: [], employees: [], tasks: [] });
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, [query, user]);

  const total = results.documents.length + results.employees.length + results.tasks.length;
  const hasQuery = query.trim().length >= 2;

  const go = (path) => { navigate(path); setOpen(false); setQuery(''); };
  const close = () => { setOpen(false); setQuery(''); };

  const kbdStyle = {
    display: 'inline-flex', alignItems: 'center',
    padding: '1px 5px', borderRadius: 4,
    border: '1px solid var(--border)',
    background: 'var(--surface-2)',
    fontSize: 10, fontWeight: 600, color: 'var(--fg-muted)',
    fontFamily: 'var(--font-mono)',
  };

  return (
    <>
      {/* Trigger button (masqué quand un déclencheur externe est utilisé, ex: sidebar) */}
      {!hideTrigger && (
      <button
        onClick={() => setOpen(true)}
        title="Rechercher (/ ou ⌘K)"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 30, height: 30, borderRadius: 'var(--radius-2)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.7)', transition: 'color .15s, background .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'none'; }}
      >
        <Search size={17} />
      </button>
      )}

      {/* Spotlight overlay */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh' }}>
          {/* Backdrop */}
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={close}
          />

          {/* Panel */}
          <div
            className="animate-fadeIn"
            style={{
              position: 'relative', width: '100%', maxWidth: 520, margin: '0 16px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)',
              overflow: 'hidden',
            }}
          >
            {/* Input row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
            }}>
              <Search size={16} color="var(--fg-subtle)" style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher documents, tâches, employés…"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 14, color: 'var(--fg)',
                }}
              />
              {query ? (
                <button
                  onClick={() => setQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', padding: 0, display: 'flex' }}
                >
                  <X size={14} />
                </button>
              ) : (
                <span style={kbdStyle}>ESC</span>
              )}
            </div>

            {/* Results */}
            {hasQuery && (
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '32px 0', color: 'var(--fg-subtle)', fontSize: 13 }}>
                    <Loader size={14} className="animate-spin" /> Recherche…
                  </div>
                ) : total === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>
                    Aucun résultat pour « {query} »
                  </div>
                ) : (
                  <>
                    {results.documents.length > 0 && (
                      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                        <SectionHeader label="Documents" route="/documents" onGo={go} />
                        {results.documents.map(doc => {
                          const s = STATUS_BADGE[doc.status] || STATUS_BADGE.draft;
                          return (
                            <ResultRow
                              key={doc.id}
                              icon={FileText} iconBg="var(--brand-soft)" iconColor="var(--brand)"
                              primary={doc.title}
                              secondary={`${doc.category || ''} — ${new Date(doc.createdAt).toLocaleDateString('fr-FR')}`}
                              badge={{ label: STATUS_LABELS[doc.status] || doc.status, ...s }}
                              onClick={() => go('/documents')}
                            />
                          );
                        })}
                      </div>
                    )}
                    {results.tasks.length > 0 && (
                      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                        <SectionHeader label="Tâches en attente" route="/my-tasks" onGo={go} />
                        {results.tasks.map(task => (
                          <ResultRow
                            key={task.id}
                            icon={CheckSquare} iconBg="var(--warning-soft)" iconColor="var(--warning)"
                            primary={task.document?.title || ''}
                            secondary={`Étape ${task.step} — ${task.status}`}
                            onClick={() => go('/my-tasks')}
                          />
                        ))}
                      </div>
                    )}
                    {results.employees.length > 0 && (
                      <div style={{ paddingBottom: 4 }}>
                        <SectionHeader label="Employés" route="/employees" onGo={go} />
                        {results.employees.map(emp => (
                          <ResultRow
                            key={emp.id}
                            icon={Users} iconBg="var(--success-soft)" iconColor="var(--success)"
                            primary={`${emp.firstName} ${emp.lastName}`}
                            secondary={emp.poste || emp.service || ''}
                            onClick={() => go('/employees')}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Quick shortcuts when empty */}
            {!hasQuery && (
              <div>
                <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Accès rapide
                </div>
                {[
                  { route: '/documents', icon: FileText, iconBg: 'var(--brand-soft)', iconColor: 'var(--brand)', label: 'Mes documents', sub: 'Voir tous les documents' },
                  { route: '/my-tasks',  icon: CheckSquare, iconBg: 'var(--warning-soft)', iconColor: 'var(--warning)', label: 'Mes tâches', sub: 'Tâches en attente de validation' },
                  { route: '/upload',    icon: ArrowRight,  iconBg: 'var(--surface-2)', iconColor: 'var(--fg-muted)', label: 'Uploader un document', sub: 'Ajouter un nouveau fichier' },
                ].map(item => (
                  <ResultRow
                    key={item.route}
                    icon={item.icon} iconBg={item.iconBg} iconColor={item.iconColor}
                    primary={item.label} secondary={item.sub}
                    onClick={() => go(item.route)}
                  />
                ))}
                <div style={{
                  display: 'flex', gap: 16, padding: '8px 14px',
                  borderTop: '1px solid var(--border)',
                  fontSize: 11, color: 'var(--fg-subtle)',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={kbdStyle}>/</span> ouvrir
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={kbdStyle}>ESC</span> fermer
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
