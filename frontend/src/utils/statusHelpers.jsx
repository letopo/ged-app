// Utilitaires centralisés pour les statuts de documents

export const STATUS_LABELS = {
  draft:              'Brouillon',
  pending_validation: 'En validation',
  in_progress:        'En cours',
  approved:           'Approuvé',
  rejected:           'Rejeté',
  archived:           'Archivé',
  pending:            'En attente',
  completed:          'Terminé',
  cancelled:          'Annulé',
};

export const STATUS_COLORS = {
  draft:              'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300',
  pending_validation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  in_progress:        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  approved:           'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected:           'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  archived:           'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  pending:            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  completed:          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled:          'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400',
};

/** Retourne le label français d'un statut */
export const getStatusLabel = (status) =>
  STATUS_LABELS[status] ?? status?.replace(/_/g, ' ') ?? '—';

/** Retourne les classes Tailwind de couleur pour un statut */
export const getStatusColor = (status) =>
  STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700';

/** Badge complet : label + couleur */
export const StatusBadge = ({ status, className = '' }) => (
  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)} ${className}`}>
    {getStatusLabel(status)}
  </span>
);
