// frontend/src/components/QuickPreviewModal.jsx
import React from 'react';
import { X, Eye, Calendar, User, FileText } from 'lucide-react';

const QuickPreviewModal = ({ task, onClose }) => {
  if (!task) return null;

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText size={28} />
            <div>
              <h2 className="text-2xl font-bold">Aperçu rapide</h2>
              <p className="text-blue-100 text-sm">{task.document.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {task.document.title}
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-2 text-gray-600">
              <User size={18} />
              <div>
                <p className="text-xs text-gray-500">Demandeur</p>
                <p className="font-semibold">
                  {task.document.uploadedBy?.firstName} {task.document.uploadedBy?.lastName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <Calendar size={18} />
              <div>
                <p className="text-xs text-gray-500">Date de soumission</p>
                <p className="font-semibold">{formatDate(task.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Métadonnées spécifiques */}
          {task.document.metadata && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-gray-700 mb-3">Détails du document</h4>
              <div className="space-y-2 text-sm">
                {task.document.metadata.service && (
                  <p>
                    <span className="text-gray-600">Service : </span>
                    <span className="font-semibold">{task.document.metadata.service}</span>
                  </p>
                )}
                {task.document.metadata.date_debut && task.document.metadata.date_fin && (
                  <p>
                    <span className="text-gray-600">Période : </span>
                    <span className="font-semibold">
                      {formatDate(task.document.metadata.date_debut)} → {formatDate(task.document.metadata.date_fin)}
                    </span>
                  </p>
                )}
                {task.document.metadata.motif && (
                  <p>
                    <span className="text-gray-600">Motif : </span>
                    <span className="font-semibold">{task.document.metadata.motif}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Commentaire */}
          {task.comment && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Commentaire</h4>
              <p className="text-sm text-gray-700">{task.comment}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Fermer
          </button>
          
          {/* La balise <a> était incomplète ici */}
          <a
            href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'}/${task.document.filePath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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