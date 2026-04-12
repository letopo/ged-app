/**
 * Composant état vide réutilisable
 * Props:
 *   icon       — composant Lucide (ex: FileText)
 *   title      — titre principal
 *   description — texte secondaire (optionnel)
 *   action     — { label, onClick, to } — bouton d'action (optionnel)
 *   compact    — version réduite sans illustration (default: false)
 */
import { Link } from 'react-router-dom';

export default function EmptyState({ icon: Icon, title, description, action, compact = false }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'} px-4`}>
      {Icon && (
        <div className={`${compact ? 'mb-3' : 'mb-4'} p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl`}>
          <Icon className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} text-gray-400 dark:text-gray-500`} />
        </div>
      )}
      <h3 className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-gray-700 dark:text-dark-text mb-1`}>
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-dark-text-secondary max-w-xs mb-4">
          {description}
        </p>
      )}
      {action && (
        action.to ? (
          <Link
            to={action.to}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
