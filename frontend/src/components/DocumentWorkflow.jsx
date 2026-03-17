// frontend/src/components/DocumentWorkflow.jsx - VERSION 100% COMPLÈTE AVEC SUPPORT DARK MODE
import { useState, useEffect } from 'react';
import { workflowAPI } from '../services/api';
import { 
  Clock, CheckCircle, XCircle, User, Calendar,
  Loader, AlertCircle, ChevronRight
} from 'lucide-react';

export default function DocumentWorkflow({ documentId, onClose }) {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (documentId) {
      loadWorkflow();
    }
  }, [documentId]);

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await workflowAPI.getDocumentWorkflow(documentId);
      setWorkflows(response.data.workflows || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du chargement du workflow');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      // Icônes gardent les couleurs, mais les classes dark: peuvent être appliquées si les couleurs s'affadissent trop.
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />;
      case 'approved':
        return <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />;
      case 'rejected':
        return <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />;
      default:
        return <AlertCircle className="w-6 h-6 text-gray-400 dark:text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    // Badges de statut - Support Dark Mode
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-700',
      approved: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700',
      rejected: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700'
    };

    const labels = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOverallStatus = () => {
    if (workflows.length === 0) return null;
    
    const hasRejected = workflows.some(w => w.status === 'rejected');
    if (hasRejected) return 'rejected';
    
    const allApproved = workflows.every(w => w.status === 'approved');
    if (allApproved) return 'validated';
    
    return 'pending_validation';
  };

  const getOverallStatusDisplay = () => {
    const status = getOverallStatus();
    
    // Conteneur de statut général - Support Dark Mode
    const styles = {
      pending_validation: { 
        bg: 'bg-yellow-50 dark:bg-yellow-900/10', 
        border: 'border-yellow-200 dark:border-yellow-700', 
        text: 'text-yellow-800 dark:text-yellow-300', 
        label: 'Validation en cours' 
      },
      validated: { 
        bg: 'bg-green-50 dark:bg-green-900/10', 
        border: 'border-green-200 dark:border-green-700', 
        text: 'text-green-800 dark:text-green-300', 
        label: 'Document validé' 
      },
      rejected: { 
        bg: 'bg-red-50 dark:bg-red-900/10', 
        border: 'border-red-200 dark:border-red-700', 
        text: 'text-red-800 dark:text-red-300', 
        label: 'Document rejeté' 
      }
    };

    if (!status || !styles[status]) return null;

    const style = styles[status];
    return (
      <div className={`${style.bg} border-2 ${style.border} rounded-lg p-4 mb-6`}>
        <div className={`font-semibold ${style.text}`}>{style.label}</div>
      </div>
    );
  };

  if (loading) {
    // Texte de chargement - Support Dark Mode
    return (
      <div className="flex items-center justify-center p-8 text-gray-700 dark:text-dark-text">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">Chargement du workflow...</span>
      </div>
    );
  }

  if (error) {
    // Message d'erreur - Support Dark Mode
    return (
      <div className="p-4">
        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700 rounded-lg flex items-start">
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            // Bouton Fermer - Support Dark Mode
            className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Fermer
          </button>
        )}
      </div>
    );
  }

  if (workflows.length === 0) {
    // Message "Aucun workflow" - Support Dark Mode
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-dark-text-secondary mb-4">Aucun workflow trouvé pour ce document</p>
        {onClose && (
          <button
            onClick={onClose}
            // Bouton Fermer - Support Dark Mode
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Fermer
          </button>
        )}
      </div>
    );
  }

  return (
    // Conteneur principal - Support Dark Mode
    <div className="bg-white dark:bg-dark-surface rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        {/* Titre - Support Dark Mode */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Circuit de validation</h2>
        {onClose && (
          <button
            onClick={onClose}
            // Bouton Fermer (X) - Support Dark Mode
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
          >
            <XCircle className="w-6 h-6" />
          </button>
        )}
      </div>

      {getOverallStatusDisplay()}

      {/* Timeline du workflow */}
      <div className="space-y-6">
        {workflows.map((workflow, index) => (
          <div key={workflow.id} className="relative">
            {/* Ligne de connexion - Support Dark Mode */}
            {index < workflows.length - 1 && (
              <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
            )}

            <div className="flex items-start gap-4">
              {/* Icône de statut (le cercle) - Support Dark Mode */}
              <div className="relative z-10 flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-white dark:bg-dark-surface border-4 border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-md">
                  {getStatusIcon(workflow.status)}
                </div>
                {/* Badge Étape - Support Dark Mode */}
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-700 dark:bg-dark-bg text-white dark:text-dark-text-secondary text-xs px-2 py-0.5 rounded-full">
                  Étape {workflow.step}
                </div>
              </div>

              {/* Contenu de l'étape - Support Dark Mode */}
              <div className="flex-1 bg-gray-50 dark:bg-dark-bg rounded-lg p-5 border border-gray-200 dark:border-dark-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {/* Nom du validateur - Support Dark Mode */}
                      <h3 className="font-semibold text-gray-900 dark:text-dark-text text-lg">
                        {workflow.validator.fullName || workflow.validator.username}
                      </h3>
                      {getStatusBadge(workflow.status)}
                    </div>
                    {/* Email du validateur - Support Dark Mode */}
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{workflow.validator.email}</p>
                  </div>
                </div>

                {/* Dates - Support Dark Mode */}
                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                  <div className="flex items-center text-gray-600 dark:text-dark-text-secondary">
                    <Calendar className="w-4 h-4 mr-2" />
                    Soumis le {formatDate(workflow.createdAt)}
                  </div>
                  {workflow.validatedAt && (
                    <div className="flex items-center text-gray-600 dark:text-dark-text-secondary">
                      <Calendar className="w-4 h-4 mr-2" />
                      Traité le {formatDate(workflow.validatedAt)}
                    </div>
                  )}
                </div>

                {/* Commentaire - Support Dark Mode */}
                {workflow.comment && (
                  <div className="mt-4 bg-white dark:bg-dark-surface rounded-lg p-3 border border-gray-200 dark:border-dark-border">
                    <p className="text-sm font-medium text-gray-700 dark:text-dark-text mb-1">Commentaire:</p>
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{workflow.comment}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Résumé - Support Dark Mode */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-dark-border">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-dark-text">{workflows.length}</div>
            <div className="text-sm text-gray-600 dark:text-dark-text-secondary">Validateurs</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {workflows.filter(w => w.status === 'approved').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-dark-text-secondary">Approuvés</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {workflows.filter(w => w.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-dark-text-secondary">En attente</div>
          </div>
        </div>
      </div>

      {onClose && (
        <div className="mt-6 flex justify-end">
          {/* Bouton Fermer - Support Dark Mode */}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}