import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Users, CheckSquare, X, Loader, Command } from 'lucide-react';
import { documentsAPI, employeesAPI, workflowAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const DEBOUNCE_MS = 300;

export default function GlobalSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ documents: [], employees: [], tasks: [] });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  // Raccourci clavier "/" ou Cmd+K pour ouvrir
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus input quand spotlight s'ouvre
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Recherche avec debounce
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
        const q = query.toLowerCase();
        const [docsRes, tasksRes] = await Promise.allSettled([
          documentsAPI.getAll(),
          workflowAPI.getMyTasks('all'),
        ]);

        const docs = docsRes.status === 'fulfilled'
          ? (docsRes.value.data.data || []).filter(d =>
              d.title?.toLowerCase().includes(q) || d.originalName?.toLowerCase().includes(q)
            ).slice(0, 5)
          : [];

        const tasks = tasksRes.status === 'fulfilled'
          ? (tasksRes.value.data.tasks || []).filter(t =>
              t.document?.title?.toLowerCase().includes(q)
            ).slice(0, 3)
          : [];

        let employees = [];
        const canSeeEmployees = user?.role === 'admin' || user?.email === 'hsjm.rh@gmail.com';
        if (canSeeEmployees) {
          try {
            const empRes = await employeesAPI.getAll({ search: query, limit: 5 });
            employees = empRes.data.employees || [];
          } catch {}
        }

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

  const go = (path) => {
    navigate(path);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* ---- Bouton déclencheur (icône seule) ---- */}
      <button
        onClick={() => setOpen(true)}
        title="Rechercher (/ ou ⌘K)"
        className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
      >
        <Search style={{ width: 18, height: 18 }} />
      </button>

      {/* ---- Spotlight overlay ---- */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setOpen(false); setQuery(''); }} />

          {/* Panel */}
          <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden animate-fadeIn">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher documents, tâches, employés…"
                className="flex-1 bg-transparent text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
              />
              {query ? (
                <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-600 rounded-md font-mono">
                  ESC
                </kbd>
              )}
            </div>

            {/* Résultats */}
            {hasQuery && (
              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                    <Loader className="w-4 h-4 animate-spin" /> Recherche…
                  </div>
                ) : total === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">
                    Aucun résultat pour « {query} »
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {results.documents.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Documents</div>
                        {results.documents.map(doc => (
                          <button key={doc.id} onClick={() => go('/documents')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-gray-700 transition text-left">
                            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg"><FileText className="w-4 h-4 text-blue-500" /></div>
                            <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{doc.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {results.tasks.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Tâches</div>
                        {results.tasks.map(task => (
                          <button key={task.id} onClick={() => go('/my-tasks')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-gray-700 transition text-left">
                            <div className="p-1.5 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg"><CheckSquare className="w-4 h-4 text-yellow-500" /></div>
                            <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{task.document?.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {results.employees.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Employés</div>
                        {results.employees.map(emp => (
                          <button key={emp.id} onClick={() => go('/employees')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-gray-700 transition text-left">
                            <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg"><Users className="w-4 h-4 text-green-500" /></div>
                            <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{emp.firstName} {emp.lastName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Footer hints */}
            {!hasQuery && (
              <div className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-4">
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">/</kbd> pour ouvrir</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">ESC</kbd> pour fermer</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
