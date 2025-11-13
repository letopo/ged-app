// frontend/src/components/DocumentCard.jsx

import React from 'react';
import { Download, Eye, Trash2 } from 'lucide-react';

// Composant de Carte de Document, adapté pour le mode sombre (dark:)
// et utilisant les classes utilitaires Tailwind CSS.
const DocumentCard = ({ document, onDelete, onView }) => {
  // Fonction pour obtenir l'icône du fichier
  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('excel') || mimeType?.includes('sheet')) return '📊';
    if (mimeType?.includes('image')) return '🖼️';
    return '📁';
  };

  // Fonction pour formater la taille du fichier
  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 MB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Fonction pour formater la date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Fonction pour obtenir la classe de couleur de catégorie (avec des couleurs Tailwind)
  const getCategoryColorClass = (category) => {
    switch (category.toLowerCase()) {
      case 'facture': return 'bg-green-600';
      case 'contrat': return 'bg-blue-600';
      case 'courrier': return 'bg-teal-600';
      case 'rapport': return 'bg-yellow-600';
      case 'formulaire': return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
  };

  // Fonction pour obtenir la classe de couleur de statut (avec des couleurs Tailwind)
  const getStatusColorClass = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'validated':
        return 'bg-green-500';
      case 'pending_validation':
      case 'in_progress':
        return 'bg-yellow-500';
      case 'draft':
        return 'bg-gray-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // LOGIQUE DE WORKFLOW:
  const workflows = document.Workflows || [];
  const currentWorkflow = workflows[0] || null;
  const totalSteps = currentWorkflow?.steps?.length || 0;
  const approvedSteps = currentWorkflow?.steps?.filter(s => s.status === 'approved').length || 0;
  const progressPercent = totalSteps > 0 ? (approvedSteps / totalSteps) * 100 : 0;
  
  // Déterminer la classe pour le badge de statut principal (top right)
  const mainStatusClass = getStatusColorClass(document.status);

  return (
    <div 
      // Style principal de la carte avec support Dark Mode
      className="bg-white dark:bg-dark-surface p-5 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 border border-gray-200 dark:border-dark-border relative flex flex-col h-full"
    >
      
      {/* Badge de Statut en haut à droite */}
      <span 
        className={`absolute top-0 right-0 m-3 px-3 py-1 text-xs font-semibold rounded-full text-white ${mainStatusClass} capitalize`}
      >
        {document.status}
      </span>
      
      {/* Informations de Base */}
      <div className="flex items-center gap-2 mb-4">
        <div className="text-3xl">
          {getFileIcon(document.type)}
        </div>
        <div className="flex-1">
          {/* Titre et Auteur avec support Dark Mode */}
          <h3 className="text-lg font-bold text-gray-800 dark:text-dark-text m-0 pr-10">
            {document.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary m-0">
            {/* Affichage de l'utilisateur qui a créé le document */}
            Par {document.User?.username || 'Utilisateur inconnu'}
          </p>
          <p className="text-xs text-gray-500 dark:text-dark-text-secondary m-0">
            {formatDate(document.createdAt)}
          </p>
        </div>
      </div>
      
      {/* Progression du Workflow (si document est en cours de validation) */}
      {currentWorkflow && totalSteps > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">
            Progression ({approvedSteps}/{totalSteps})
          </h4>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          
          {/* Liste des étapes (Simplifiée, pour l'exemple) */}
          <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
            {currentWorkflow.steps.map((step, index) => (
              <p key={index} className={`text-xs ${step.status === 'approved' ? 'text-green-500 dark:text-green-400' : 
                                                    step.status === 'rejected' ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {step.User?.username} ({step.status})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Métadonnées au bas de la carte */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-dark-text-secondary border-t border-gray-200 dark:border-dark-border pt-3 mt-auto">
        <span>Taille: {formatFileSize(document.size)}</span>
        <span 
            className={`px-2 py-1 rounded text-xs font-medium text-white ${getCategoryColorClass(document.category)}`}
        >
          {document.category}
        </span>
      </div>
      
      {/* Boutons d'Action */}
      <div className="flex gap-2 mt-3">
        {/* Bouton Voir */}
        <button
            onClick={() => onView(document)} // Passer l'objet document entier
            className="flex-1 px-3 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center justify-center"
        >
            <Eye className="w-4 h-4 mr-2" />
            Voir
        </button>
        
        {/* Bouton Télécharger */}
        <a
          href={`http://localhost:3000/${document.path}`} // Lien de téléchargement
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-3 py-2 text-sm font-medium rounded-lg text-blue-600 border border-blue-600 hover:bg-blue-50 dark:text-white dark:border-blue-700 dark:hover:bg-blue-800 transition-colors flex items-center justify-center"
        >
           <Download className="w-4 h-4 mr-2" />
           Télécharger
        </a>

        {/* Bouton Supprimer */}
        <button
          onClick={() => onDelete(document.id)}
          className="p-2 rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center"
          aria-label="Supprimer le document"
        >
           <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default DocumentCard;