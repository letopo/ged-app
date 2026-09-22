// frontend/src/components/KeyboardShortcuts.jsx
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
    { keys: ['n'],        label: 'Nouveau document (upload)' },
    { keys: ['?'],        label: 'Afficher les raccourcis' },
    { keys: ['Esc'],      label: 'Fermer les modales' },
  ]},
];

const kbdStyle = {
  display: 'inline-flex', alignItems: 'center',
  padding: '1px 6px', borderRadius: 'var(--radius-2)',
  background: 'var(--surface-2)', border: '1px solid var(--border)',
  fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)',
  boxShadow: '0 1px 0 var(--border)',
};

export default function KeyboardShortcuts() {
  const { t } = useTranslation();
  const navigate    = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [gPressed, setGPressed] = useState(false);
  const [gTimer, setGTimer]     = useState(null);

  const isInputFocused = useCallback(() => {
    const tag = document.activeElement?.tagName;
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || document.activeElement?.isContentEditable;
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (isInputFocused()) return;

      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault(); setShowHelp(prev => !prev); return;
      }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); navigate('/upload'); return;
      }
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !gPressed) {
        e.preventDefault(); setGPressed(true);
        const timer = setTimeout(() => setGPressed(false), 1000);
        setGTimer(timer); return;
      }
      if (gPressed) {
        clearTimeout(gTimer); setGPressed(false);
        switch (e.key) {
          case 'd': e.preventDefault(); navigate('/dashboard'); break;
          case 'f': e.preventDefault(); navigate('/documents'); break;
          case 'u': e.preventDefault(); navigate('/upload');    break;
          case 't': e.preventDefault(); navigate('/my-tasks');  break;
          default: break;
        }
        return;
      }
      if (e.key === 'Escape' && showHelp) setShowHelp(false);
    };

    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(gTimer); };
  }, [gPressed, gTimer, showHelp, navigate, isInputFocused]);

  return (
    <>
      {showHelp && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowHelp(false)}
          />
          <div className="animate-fadeIn" style={{
            position: 'relative', width: '100%', maxWidth: 400, margin: '0 16px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Keyboard size={16} color="var(--brand)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{t('Raccourcis clavier')}</span>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex', padding: 4, borderRadius: 'var(--radius-2)' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '14px 16px', maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {SHORTCUTS.map(section => (
                <div key={section.section}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                    {t(section.section)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {section.items.map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                        <span style={{ fontSize: 13, color: 'var(--fg)' }}>{t(item.label)}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {item.keys.map((key, i) => (
                            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {i > 0 && <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{t('ou')}</span>}
                              <kbd style={kbdStyle}>{key}</kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{
              padding: '8px 16px', borderTop: '1px solid var(--border)',
              background: 'var(--surface-2)', textAlign: 'center',
              fontSize: 11, color: 'var(--fg-subtle)',
            }}>
              {t('Appuyez sur')} <kbd style={kbdStyle}>?</kbd> {t('pour fermer')}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
