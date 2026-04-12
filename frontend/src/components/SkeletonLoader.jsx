// Composant skeleton loader réutilisable

const Pulse = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

/** Carte document (grid view) */
export const DocumentCardSkeleton = () => (
  <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm border border-gray-200 dark:border-dark-border flex flex-col">
    <div className="p-4 border-b border-gray-200 dark:border-dark-border">
      <div className="flex items-start justify-between mb-3">
        <Pulse className="w-6 h-6 rounded" />
        <Pulse className="w-20 h-5 rounded-full" />
      </div>
      <Pulse className="w-3/4 h-4 mb-2" />
      <Pulse className="w-16 h-3 rounded-full" />
    </div>
    <div className="p-4 space-y-3 flex-grow">
      <Pulse className="w-full h-3" />
      <Pulse className="w-2/3 h-3" />
    </div>
    <div className="p-4 border-t border-gray-200 dark:border-dark-border flex gap-2">
      <Pulse className="flex-1 h-9 rounded-lg" />
      <Pulse className="w-9 h-9 rounded-lg" />
      <Pulse className="w-9 h-9 rounded-lg" />
    </div>
  </div>
);

/** Grille de n cartes document */
export const DocumentGridSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <DocumentCardSkeleton key={i} />
    ))}
  </div>
);

/** Ligne tableau (list view) */
export const DocumentRowSkeleton = () => (
  <tr>
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        <Pulse className="w-5 h-5 rounded" />
        <div className="flex-1 space-y-1.5">
          <Pulse className="w-2/3 h-3.5" />
          <Pulse className="w-1/3 h-3" />
        </div>
      </div>
    </td>
    <td className="px-6 py-4"><Pulse className="w-24 h-5 rounded-full" /></td>
    <td className="px-6 py-4"><Pulse className="w-20 h-3" /></td>
    <td className="px-6 py-4">
      <div className="flex justify-end gap-2">
        <Pulse className="w-7 h-7 rounded" />
        <Pulse className="w-7 h-7 rounded" />
        <Pulse className="w-7 h-7 rounded" />
      </div>
    </td>
  </tr>
);

/** Table complète skeleton */
export const DocumentTableSkeleton = ({ count = 8 }) => (
  <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden">
    <table className="min-w-full">
      <thead className="bg-gray-50 dark:bg-dark-bg">
        <tr>
          {['Document', 'Statut', 'Date', 'Actions'].map(h => (
            <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
        {Array.from({ length: count }).map((_, i) => (
          <DocumentRowSkeleton key={i} />
        ))}
      </tbody>
    </table>
  </div>
);

/** Page entière centrée — pour les pages de grande taille */
export const PageSkeleton = ({ rows = 5, title }) => (
  <div className="w-full px-4 py-8 space-y-6">
    {title && <Pulse className="w-56 h-8 mb-2" />}
    <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border p-4 space-y-4">
      <div className="flex gap-4">
        <Pulse className="flex-1 h-10 rounded-lg" />
        <Pulse className="w-40 h-10 rounded-lg" />
        <Pulse className="w-32 h-10 rounded-lg" />
      </div>
    </div>
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border p-4 flex items-center gap-4">
          <Pulse className="w-8 h-8 rounded" />
          <Pulse className="flex-1 h-4" />
          <Pulse className="w-24 h-4" />
          <Pulse className="w-20 h-4" />
        </div>
      ))}
    </div>
  </div>
);

export default DocumentGridSkeleton;
