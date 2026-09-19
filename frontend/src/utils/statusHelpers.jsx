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

export const STATUS_STYLES = {
  draft:              { background: 'var(--surface-2)',    color: 'var(--fg-muted)'  },
  pending_validation: { background: 'var(--warning-soft)', color: 'var(--warning)'   },
  in_progress:        { background: 'var(--brand-soft)',   color: 'var(--brand)'     },
  approved:           { background: 'var(--success-soft)', color: 'var(--success)'   },
  rejected:           { background: 'var(--danger-soft)',  color: 'var(--danger)'    },
  archived:           { background: 'rgba(139,92,246,0.12)', color: '#7c3aed'        },
  pending:            { background: 'var(--warning-soft)', color: 'var(--warning)'   },
  completed:          { background: 'var(--success-soft)', color: 'var(--success)'   },
  cancelled:          { background: 'var(--surface-2)',    color: 'var(--fg-subtle)' },
};

/** Retourne le label français d'un statut */
export const getStatusLabel = (status) =>
  STATUS_LABELS[status] ?? status?.replace(/_/g, ' ') ?? '—';

/** Retourne l'objet style CSS vars pour un statut */
export const getStatusStyle = (status) =>
  STATUS_STYLES[status] ?? { background: 'var(--surface-2)', color: 'var(--fg-muted)' };

/** Badge complet : label + couleur */
export const StatusBadge = ({ status, style: extraStyle = {} }) => (
  <span style={{
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 'var(--radius-2)',
    fontSize: 12,
    fontWeight: 500,
    ...getStatusStyle(status),
    ...extraStyle,
  }}>
    {getStatusLabel(status)}
  </span>
);
