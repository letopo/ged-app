import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS = [
  { section: 'Navigation', items: [
    { keys: ['g', 'd'], label: 'Aller au Tableau de bord' },
    { keys: ['g', 'f'], label: 'Aller aux Documents' },
    { keys: ['g', 'u'], label: 'Aller à Upload' },
    { keys: ['g', 't'], label: 'Aller aux Tâches' },
  ]},
  { section: 'Actions', items: [
    { keys: ['/', '⌘K'], label: 'Recherche globale' },
    { keys: ['n'], label: 'Nouveau document (upload)' },
    { keys: ['?'], label: 'Afficher les raccourcis' },
    { keys: ['Esc'], label: 'Fermer les modales' },
  ]},
];

export default function KeyboardShortcuts() {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [gPressed, setGPressed] = useState(false);
  const [gTimer, setGTimer] = useState(null);

  const isInputFocused = useCallback(() => {
    const tag = document.activeElement?.tagName;
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || document.activeElement?.isContentEditable;
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (isInputFocused()) return;

      // "?" → aide
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowHelp(prev => !prev);
        return;
      }

      // "n" → nouveau document
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        navigate('/upload');
        return;
      }

      // Séquence "g + lettre" pour navigation
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !gPressed) {
        e.preventDefault();
        setGPressed(true);
        const timer = setTimeout(() => setGPressed(false), 1000);
        setGTimer(timer);
        return;
      }

      if (gPressed) {
        clearTimeout(gTimer);
        setGPressed(false);
        switch (e.key) {
          case 'd': e.preventDefault(); navigate('/dashboard'); break;
          case 'f': e.preventDefault(); navigate('/documents'); break;
          case 'u': e.preventDefault(); navigate('/upload'); break;
          case 't': e.preventDefault(); navigate('/my-tasks'); break;
          default: break;
        }
        return;
      }

      // Esc → fermer aide
      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(gTimer);
    };
  }, [gPressed, gTimer, showHelp, navigate, isInputFocused]);

  return (
    <>
      {showHelp && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowHelp(false)} />
          <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2.5">
                <Keyboard className="w-5 h-5 text-blue-500" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Raccourcis clavier</h2>
              </div>
              <button onClick={() => setShowHelp(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {SHORTCUTS.map(section => (
                <div key={section.section}>
                  <h3 className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">{section.section}</h3>
                  <div className="space-y-1.5">
                    {section.items.map(item => (
                      <div key={item.label} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((key, i) => (
                            <span key={i}>
                              {i > 0 && <span className="text-[10px] text-gray-300 dark:text-gray-600 mx-0.5">ou</span>}
                              <kbd className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm">
                                {key}
                              </kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 text-center">
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Appuyez sur <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono border border-gray-200 dark:border-gray-600">?</kbd> pour fermer
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
