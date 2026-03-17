// frontend/src/components/QuickPreviewModal.jsx - VERSION 100% COMPLÈTE AVEC SUPPORT DARK MODE
import React from 'react';
import { X, Eye, Calendar, User, FileText } from 'lucide-react';

const QuickPreviewModal = ({ task, onClose }) => {
  if (!task) return null;

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');
  
  // Utilisation d'une fallback URL pour VITE_API_URL
  const apiBaseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      {/* Conteneur principal du modal - Support Dark Mode */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        
        {/* En-tête (Gradients) - Le texte reste blanc sur les gradients sombres */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText size={28} />
            <div>
              <h2 className="text-2xl font-bold">Aperçu rapide</h2>
              <p className="text-blue-100 dark:text-blue-300 text-sm">{task.document.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Contenu - Support Dark Mode pour le fond de la scrollbar */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Titre - Support Dark Mode */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-4">
            {task.document.title}
          </h3>

          {/* Métadonnées de base - Support Dark Mode */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Demandeur */}
            <div className="flex items-center gap-2 text-gray-600 dark:text-dark-text-secondary">
              <User size={18} />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-500">Demandeur</p>
                <p className="font-semibold text-gray-800 dark:text-dark-text">
                  {task.document.uploadedBy?.firstName} {task.document.uploadedBy?.lastName}
                </p>
              </div>
            </div>

            {/* Date de soumission */}
            <div className="flex items-center gap-2 text-gray-600 dark:text-dark-text-secondary">
              <Calendar size={18} />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-500">Date de soumission</p>
                <p className="font-semibold text-gray-800 dark:text-dark-text">{formatDate(task.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Métadonnées spécifiques - Support Dark Mode */}
          {task.document.metadata && (
            <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4 mb-4 border border-gray-200 dark:border-dark-border">
              <h4 className="font-semibold text-gray-700 dark:text-dark-text mb-3">Détails du document</h4>
              <div className="space-y-2 text-sm text-gray-800 dark:text-dark-text">
                {task.document.metadata.service && (
                  <p>
                    <span className="text-gray-600 dark:text-dark-text-secondary">Service : </span>
                    <span className="font-semibold">{task.document.metadata.service}</span>
                  </p>
                )}
                {task.document.metadata.date_debut && task.document.metadata.date_fin && (
                  <p>
                    <span className="text-gray-600 dark:text-dark-text-secondary">Période : </span>
                    <span className="font-semibold">
                      {formatDate(task.document.metadata.date_debut)} → {formatDate(task.document.metadata.date_fin)}
                    </span>
                  </p>
                )}
                {task.document.metadata.motif && (
                  <p>
                    <span className="text-gray-600 dark:text-dark-text-secondary">Motif : </span>
                    <span className="font-semibold">{task.document.metadata.motif}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Commentaire - Support Dark Mode */}
          {task.comment && (
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Commentaire</h4>
              <p className="text-sm text-gray-700 dark:text-blue-400">{task.comment}</p>
            </div>
          )}
        </div>

        {/* Footer - Support Dark Mode */}
        <div className="p-6 border-t border-gray-200 dark:border-dark-border flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Fermer
          </button>
          
          <a
            href={`${apiBaseUrl}/${task.document.filePath}`} // Utilisation de la variable résolue
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <Eye size={18} />
            Voir le document complet
          </a>
        </div>
      </div>
    </div>
  );
};

export default QuickPreviewModal;