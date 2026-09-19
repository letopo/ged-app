// Modal de confirmation réutilisable — remplace window.confirm()
// Usage:
//   const { confirm, ConfirmModalRenderer } = useConfirm();
//   const ok = await confirm({ title: 'Supprimer ?', message: '...' });
//   if (ok) { ... }
//   return <>{ConfirmModalRenderer}</>

import { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, Trash2, X } from 'lucide-react';

const VARIANT_CFG = {
  danger:  { Icon: Trash2,        bg: 'var(--danger-soft)',  color: 'var(--danger)',  btnBg: 'var(--danger)' },
  warning: { Icon: AlertTriangle, bg: 'var(--warning-soft)', color: 'var(--warning)', btnBg: 'var(--warning)' },
  info:    { Icon: AlertTriangle, bg: 'var(--brand-soft)',   color: 'var(--brand)',   btnBg: 'var(--brand)' },
};

export const ConfirmModal = ({
  isOpen,
  title = 'Confirmation',
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const cfg = VARIANT_CFG[variant] || VARIANT_CFG.danger;
  const { Icon } = cfg;

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className="animate-fadeIn"
        style={{
          position: 'relative', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-4)',
          boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 420,
        }}
      >
        <div style={{ padding: '20px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Icon badge */}
            <div style={{
              flexShrink: 0, width: 36, height: 36, borderRadius: '50%',
              background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={17} style={{ color: cfg.color }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>{title}</div>
              {message && <div style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.5 }}>{message}</div>}
            </div>

            <button
              onClick={onCancel}
              style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', padding: 2 }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{
          padding: '12px 20px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8,
          borderTop: '1px solid var(--border)',
        }}>
          <button
            onClick={onCancel}
            style={{
              height: 32, padding: '0 14px', borderRadius: 'var(--radius-2)',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--fg-muted)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              height: 32, padding: '0 14px', borderRadius: 'var(--radius-2)',
              border: 'none', background: cfg.btnBg,
              color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const useConfirm = () => {
  const [state, setState] = useState({ isOpen: false, resolve: null, options: {} });

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setState({ isOpen: true, resolve, options });
    });
  }, []);

  const handleConfirm = () => {
    state.resolve?.(true);
    setState(s => ({ ...s, isOpen: false }));
  };

  const handleCancel = () => {
    state.resolve?.(false);
    setState(s => ({ ...s, isOpen: false }));
  };

  const ConfirmModalRenderer = (
    <ConfirmModal
      isOpen={state.isOpen}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      {...state.options}
    />
  );

  return { confirm, ConfirmModalRenderer };
};

export default ConfirmModal;
