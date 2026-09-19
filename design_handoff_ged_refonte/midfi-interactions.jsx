/* global React */
// =========================================================
// Interactions layer — sober toasts + global dispatcher
// =========================================================
const { useState: useToastState, useEffect: useToastEffect } = React;

// Global dispatcher — pages call window.gedToast('Document approuvé.', { tone: 'success' })
window.gedToast = function (message, opts = {}) {
  window.dispatchEvent(new CustomEvent('ged-toast', { detail: { message, ...opts } }));
};

window.ToastHost = function ToastHost() {
  const [toasts, setToasts] = useToastState([]);

  useToastEffect(() => {
    let counter = 0;
    const onToast = (e) => {
      const id = ++counter + '-' + Date.now();
      const t = { id, message: e.detail.message, tone: e.detail.tone || 'default', undo: e.detail.undo };
      setToasts(list => [...list, t]);
      const ttl = e.detail.duration || 3200;
      setTimeout(() => setToasts(list => list.filter(x => x.id !== id)), ttl);
    };
    window.addEventListener('ged-toast', onToast);
    return () => window.removeEventListener('ged-toast', onToast);
  }, []);

  const dismiss = (id) => setToasts(list => list.filter(x => x.id !== id));

  return (
    <div className="toast-host">
      {toasts.map(t => (
        <div key={t.id} className={"toast " + t.tone}>
          <span className="toast-ico">
            {t.tone === 'success' && <window.Icon name="check" size={16} />}
            {t.tone === 'danger' && <window.Icon name="x" size={16} />}
            {t.tone === 'default' && <window.Icon name="info" size={16} />}
          </span>
          <span>{t.message}</span>
          {t.undo && <button className="toast-undo" onClick={() => { t.undo(); dismiss(t.id); }}>Annuler</button>}
        </div>
      ))}
    </div>
  );
};
