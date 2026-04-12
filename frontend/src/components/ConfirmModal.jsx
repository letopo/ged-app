// Modal de confirmation réutilisable — remplace window.confirm()
// Usage:
//   const { confirm, ConfirmModalRenderer } = useConfirm();
//   ...
//   const ok = await confirm({ title: 'Supprimer ?', message: '...' });
//   if (ok) { ... }
//   ...
//   return <>{ConfirmModalRenderer}</>

import { useState, useCallback } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export const ConfirmModal = ({
  isOpen,
  title = 'Confirmation',
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',   // 'danger' | 'warning' | 'info'
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger:  { icon: Trash2,        iconBg: 'bg-red-100 dark:bg-red-900/30',    iconColor: 'text-red-600 dark:text-red-400',    btn: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600' },
    warning: { icon: AlertTriangle, iconBg: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400', btn: 'bg-orange-500 hover:bg-orange-600' },
    info:    { icon: AlertTriangle, iconBg: 'bg-blue-100 dark:bg-blue-900/30',   iconColor: 'text-blue-600 dark:text-blue-400',   btn: 'bg-blue-600 hover:bg-blue-700' },
  };
  const s = variantStyles[variant] || variantStyles.danger;
  const Icon = s.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${s.iconBg}`}>
              <Icon className={`w-5 h-5 ${s.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-dark-text mb-1">{title}</h3>
              {message && <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{message}</p>}
            </div>
            <button onClick={onCancel} className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-dark-text text-gray-700 rounded-lg transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition ${s.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook pour utiliser ConfirmModal de façon programmatique (comme window.confirm)
 * Retourne { confirm, ConfirmModalRenderer }
 */
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
