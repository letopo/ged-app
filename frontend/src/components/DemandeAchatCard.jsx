// frontend/src/components/DemandeAchatCard.jsx
import React from 'react';
import { Calendar, User, FileText } from 'lucide-react';

const DemandeAchatCard = ({ demande, onClick, selected, getStatusConfig }) => {
  const statusConfig = getStatusConfig(demande.status);
  const StatusIcon = statusConfig.icon;
  
  // S'assurer que totalNonRefValue est un nombre
  const totalValue = typeof demande.totalNonRefValue === 'number' 
    ? demande.totalNonRefValue 
    : parseFloat(demande.totalNonRefValue) || 0;

  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md
        ${selected 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' 
          : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      {/* Numéro DA + Statut */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 dark:text-dark-text text-sm">
            {demande.daNumber}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {demande.domain}
          </p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.textColor}`}>
          <StatusIcon size={12} />
          <span>{statusConfig.label}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
        {demande.requestDescription}
      </p>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <User size={12} />
          <span>{demande.requester?.firstName} {demande.requester?.lastName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar size={12} />
          <span>{new Date(demande.daDate).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Montant */}
      {totalValue > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            {totalValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XAF
          </span>
        </div>
      )}
    </div>
  );
};

export default DemandeAchatCard;