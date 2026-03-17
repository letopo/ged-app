// frontend/src/components/DemandeAchatDetail.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { demandeAchatAPI, documentsAPI } from '../services/api'; // Importez documentsAPI
import { 
  X, Edit, Trash2, CheckCircle, XCircle, Clock, FileText, User, Calendar, 
  Package, Phone, Mail, MapPin, Download, AlertCircle, Loader, Eye, ExternalLink,
  File, FolderOpen, AlertTriangle
} from 'lucide-react';

// Fonction utilitaire pour gérer les nombres
const safeNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  const num = typeof value === 'number' ? value : parseFloat(value);
  
  if (isNaN(num)) {
    console.warn(`Valeur non numérique: ${value}, retourne ${defaultValue}`);
    return defaultValue;
  }
  
  return num;
};

const DemandeAchatDetail = ({ demande, onClose, onEdit, onUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDTModal, setShowDTModal] = useState(false);
  const [dtDetails, setDtDetails] = useState(null);
  const [loadingDT, setLoadingDT] = useState(false);

  const isOwner = user?.id === demande.requesterId;
  const isAdminOrAchat = user?.role === 'admin' || user?.role === 'achat';
  const canEdit = (isOwner && demande.status === 'draft') || isAdminOrAchat;
  const canDelete = (isOwner && demande.status === 'draft') || user?.role === 'admin';

  // Fonction pour charger les détails de la DT (VERSION SIMPLIFIÉE)
  const loadDTDetails = async () => {
    if (!demande.linkedDocNumber) return;
    
    try {
      setLoadingDT(true);
      setError('');
      console.log('Recherche de DT:', demande.linkedDocNumber);
      
      // ESSAYONS D'ABORD UNE APPROCHE SIMPLE
      // Récupérer tous les documents et filtrer
      const response = await documentsAPI.getAll();
      console.log('Tous les documents:', response.data);
      
      // Trouver les documents dans la réponse
      let documents = [];
      if (response.data && response.data.data) {
        documents = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        documents = response.data;
      }
      
      console.log('Documents à filtrer:', documents.length);
      
      // Filtrer pour trouver la DT
      const dtDocument = documents.find(doc => {
        // Vérifier plusieurs champs possibles
        const title = (doc.title || '').toLowerCase();
        const docNumber = (doc.documentNumber || doc.number || '').toLowerCase();
        const searchTerm = demande.linkedDocNumber.toLowerCase();
        
        return title.includes(searchTerm) || 
               docNumber.includes(searchTerm) ||
               title.includes('dt') ||
               (doc.metadata && doc.metadata.type === 'demande_travaux');
      });
      
      console.log('DT trouvée:', dtDocument);
      
      if (dtDocument) {
        setDtDetails(dtDocument);
        setShowDTModal(true);
      } else {
        // Afficher un message d'erreur spécifique
        setError(`DT "${demande.linkedDocNumber}" non trouvée. Vérifiez que la référence est correcte.`);
        // Ouvrir quand même le modal pour montrer l'info basique
        setShowDTModal(true);
      }
    } catch (err) {
      console.error('Erreur chargement DT:', err);
      setError(`Erreur technique: ${err.message}`);
      // Ouvrir le modal même en cas d'erreur
      setShowDTModal(true);
    } finally {
      setLoadingDT(false);
    }
  };

  // Fonction pour fermer le modal DT
  const closeDTModal = () => {
    setShowDTModal(false);
    setDtDetails(null);
    setError('');
  };

  const getStatusConfig = (status) => {
    const configs = {
      draft: { label: 'Brouillon', icon: FileText, color: 'gray', bgColor: 'bg-gray-100 dark:bg-gray-800', textColor: 'text-gray-700 dark:text-gray-300', borderColor: 'border-gray-300' },
      pending_approval: { label: 'En attente d\'approbation', icon: Clock, color: 'yellow', bgColor: 'bg-yellow-100 dark:bg-yellow-900/20', textColor: 'text-yellow-700 dark:text-yellow-400', borderColor: 'border-yellow-300' },
      approved: { label: 'Approuvée', icon: CheckCircle, color: 'green', bgColor: 'bg-green-100 dark:bg-green-900/20', textColor: 'text-green-700 dark:text-green-400', borderColor: 'border-green-300' },
      rejected: { label: 'Rejetée', icon: XCircle, color: 'red', bgColor: 'bg-red-100 dark:bg-red-900/20', textColor: 'text-red-700 dark:text-red-400', borderColor: 'border-red-300' },
      in_progress: { label: 'En cours de traitement', icon: AlertCircle, color: 'blue', bgColor: 'bg-blue-100 dark:bg-blue-900/20', textColor: 'text-blue-700 dark:text-blue-400', borderColor: 'border-blue-300' },
      completed: { label: 'Terminée', icon: CheckCircle, color: 'green', bgColor: 'bg-green-100 dark:bg-green-900/20', textColor: 'text-green-700 dark:text-green-400', borderColor: 'border-green-300' },
    };
    return configs[status] || configs.draft;
  };

  const statusConfig = getStatusConfig(demande.status);
  const StatusIcon = statusConfig.icon;

  const handleStatusChange = async (newStatus) => {
    try {
      setLoading(true);
      setError('');
      await demandeAchatAPI.updateStatus(demande.id, newStatus);
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du changement de statut');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await demandeAchatAPI.delete(demande.id);
      onClose();
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const InfoRow = ({ icon: Icon, label, value, className = '' }) => (
    <div className={`flex items-start gap-3 ${className}`}>
      <Icon size={18} className="text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-dark-text break-words">{value || 'Non renseigné'}</p>
      </div>
    </div>
  );

  // Composant pour afficher les informations DT dans le modal
  const DTModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FolderOpen className="text-blue-600" size={24} />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                Demande de Travaux
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Référence: {demande.linkedDocNumber}
              </p>
            </div>
          </div>
          <button 
            onClick={closeDTModal}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 p-6">
          {loadingDT ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="animate-spin text-blue-600" size={32} />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement de la DT...</span>
            </div>
          ) : dtDetails ? (
            <div className="space-y-6">
              {/* En-tête */}
              <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-dark-text">
                      {dtDetails.title || dtDetails.name || 'Demande de Travaux'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {dtDetails.documentNumber || dtDetails.number || demande.linkedDocNumber}
                    </p>
                  </div>
                  {dtDetails.status && (
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      dtDetails.status === 'approved' ? 'bg-green-100 text-green-800' :
                      dtDetails.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {dtDetails.status === 'approved' ? 'Approuvée' :
                       dtDetails.status === 'rejected' ? 'Rejetée' : 
                       dtDetails.status || 'Non spécifié'}
                    </div>
                  )}
                </div>
              </div>

              {/* Informations de base */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Service</p>
                  <p className="font-medium">
                    {dtDetails.metadata?.service || dtDetails.service || demande.domain || 'Non spécifié'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Date de création</p>
                  <p className="font-medium">
                    {dtDetails.createdAt ? new Date(dtDetails.createdAt).toLocaleDateString() : 'Non spécifiée'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Demandeur</p>
                  <p className="font-medium">
                    {dtDetails.requester?.name || dtDetails.createdBy || dtDetails.user?.name || 'Non spécifié'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Type</p>
                  <p className="font-medium">
                    {dtDetails.type || dtDetails.documentType || 'Demande de Travaux'}
                  </p>
                </div>
              </div>

              {/* Description */}
              {(dtDetails.description || dtDetails.content) && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2">Description</p>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {dtDetails.description || dtDetails.content}
                    </p>
                  </div>
                </div>
              )}

              {/* Lien vers le document complet */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <a 
                  href={`/documents/${dtDetails.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <ExternalLink size={16} />
                  Ouvrir la DT complète
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle size={48} className="text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-2">
                DT non trouvée
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                La Demande de Travaux <strong>"{demande.linkedDocNumber}"</strong> n'a pas été trouvée dans la base de données.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button
                  onClick={closeDTModal}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Fermer
                </button>
                <a
                  href={`/documents?search=${encodeURIComponent(demande.linkedDocNumber)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <FolderOpen size={16} />
                  Rechercher dans les documents
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-dark-surface">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                {demande.daNumber}
              </h1>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>
                <StatusIcon size={16} />
                <span className="text-sm font-semibold">{statusConfig.label}</span>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400">{demande.domain}</p>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => onEdit(demande)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Edit size={18} />
                Modifier
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                <Trash2 size={18} />
                Supprimer
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {/* Actions de statut pour admin/achat */}
        {isAdminOrAchat && demande.status !== 'draft' && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Actions rapides</p>
            <div className="flex gap-3">
              {demande.status === 'pending_approval' && (
                <>
                  <button
                    onClick={() => handleStatusChange('approved')}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {loading ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                    Approuver
                  </button>
                  <button
                    onClick={() => handleStatusChange('rejected')}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {loading ? <Loader className="animate-spin" size={18} /> : <XCircle size={18} />}
                    Rejeter
                  </button>
                </>
              )}
              {demande.status === 'approved' && (
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? <Loader className="animate-spin" size={18} /> : <AlertCircle size={18} />}
                  Marquer en cours
                </button>
              )}
              {demande.status === 'in_progress' && (
                <button
                  onClick={() => handleStatusChange('completed')}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                  Marquer terminée
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action de soumission pour le créateur */}
        {isOwner && demande.status === 'draft' && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Cette demande est en brouillon</p>
            <button
              onClick={() => handleStatusChange('pending_approval')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />}
              Soumettre pour approbation
            </button>
          </div>
        )}

        {/* Informations générales */}
        <div className="mb-6 p-6 bg-gray-50 dark:bg-dark-bg rounded-lg space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text border-b border-gray-200 dark:border-gray-700 pb-2">
            Informations générales
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoRow icon={Calendar} label="Date de la DA" value={new Date(demande.daDate).toLocaleDateString()} />
            <InfoRow icon={Calendar} label="Date de livraison souhaitée" value={demande.deliveryDate ? new Date(demande.deliveryDate).toLocaleDateString() : 'Non définie'} />
            <InfoRow icon={Package} label="Type d'achat" value={demande.purchaseType} />
            <InfoRow icon={FileText} label="Nature article" value={demande.articleNature} />
            <InfoRow icon={User} label="Demandeur" value={`${demande.requester?.firstName} ${demande.requester?.lastName}`} />
            <InfoRow icon={MapPin} label="Description du domaine" value={demande.domainDescription} />
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <InfoRow icon={FileText} label="Description de la demande" value={demande.requestDescription} />
          </div>
        </div>

        {/* Informations bénéficiaire - MODIFIÉE */}
        <div className="mb-6 p-6 bg-gray-50 dark:bg-dark-bg rounded-lg space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text border-b border-gray-200 dark:border-gray-700 pb-2">
            Informations bénéficiaire
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoRow icon={User} label="Nom" value={demande.beneficiaryName} />
            <InfoRow icon={Mail} label="Email" value={demande.beneficiaryEmail} />
            <InfoRow icon={Phone} label="Téléphone" value={demande.beneficiaryPhone} />
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <Package size={18} className="text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Sortie Magasin</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                    {demande.isMagasinOutput ? 'Oui' : 'Non'}
                  </p>
                </div>
              </div>
              
              {/* Section DA pour travaux avec icône œil */}
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-gray-500 dark:text-gray-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">DA pour travaux</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                          {demande.isForWorks ? 'Oui' : 'Non'}
                        </p>
                        
                        {/* Icône œil pour visualiser la DT */}
                        {demande.isForWorks && demande.linkedDocNumber && (
                          <button
                            onClick={loadDTDetails}
                            disabled={loadingDT}
                            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition flex items-center justify-center"
                            title="Visualiser la Demande de Travaux"
                          >
                            {loadingDT ? (
                              <Loader className="animate-spin w-4 h-4" />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Affichage du numéro de DT */}
                  {demande.isForWorks && demande.linkedDocNumber && (
                    <div className="mt-1 flex items-center gap-2">
                      <ExternalLink size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        DT : {demande.linkedDocNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Articles */}
        {demande.nonRefArticles && demande.nonRefArticles.length > 0 && (
          <div className="mb-6 p-6 bg-gray-50 dark:bg-dark-bg rounded-lg">
            <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
              Articles non référencés
            </h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Désignation</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantité</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prix Unitaire</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-gray-700">
                  {demande.nonRefArticles.map((article, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-dark-text">{article.designation}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-dark-text">{article.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-dark-text">
                        {safeNumber(article.unitPrice).toFixed(2)} XAF
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-dark-text">
                        {safeNumber(article.total).toFixed(2)} XAF
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <td colSpan="3" className="px-4 py-3 text-right text-sm font-bold text-gray-900 dark:text-dark-text">Total Non Référencé</td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-blue-600 dark:text-blue-400">
                      {safeNumber(demande.totalNonRefValue).toFixed(2)} XAF
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Articles */}
        {demande.nonRefArticles && demande.nonRefArticles.length > 0 && (
          <div className="mb-6 p-6 bg-gray-50 dark:bg-dark-bg rounded-lg">
            <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
              Articles non référencés
            </h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Désignation</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantité</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prix Unitaire</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-gray-700">
                  {demande.nonRefArticles.map((article, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-dark-text">{article.designation}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-dark-text">{article.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-dark-text">
                        {safeNumber(article.unitPrice).toFixed(2)} XAF
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-dark-text">
                        {safeNumber(article.total).toFixed(2)} XAF
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <td colSpan="3" className="px-4 py-3 text-right text-sm font-bold text-gray-900 dark:text-dark-text">Total Non Référencé</td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-blue-600 dark:text-blue-400">
                      {safeNumber(demande.totalNonRefValue).toFixed(2)} XAF
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Pièces jointes */}
        {demande.attachedDocuments && demande.attachedDocuments.length > 0 && (
          <div className="mb-6 p-6 bg-gray-50 dark:bg-dark-bg rounded-lg">
            <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
              Pièces jointes ({demande.attachedDocuments.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {demande.attachedDocuments.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText size={20} className="text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-dark-text truncate">{file.originalName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <a 
                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${file.path}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition flex-shrink-0"
                    title="Télécharger"
                  >
                    <Download size={18} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historique */}
        <div className="mb-6 p-6 bg-gray-50 dark:bg-dark-bg rounded-lg">
          <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
            Historique
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-green-500 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-dark-text">Demande créée</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(demande.createdAt).toLocaleString()} par {demande.requester?.firstName} {demande.requester?.lastName}
                </p>
              </div>
            </div>
            
            {demande.updatedAt !== demande.createdAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-dark-text">Dernière modification</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(demande.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de confirmation de suppression */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-3">
                Confirmer la suppression
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Êtes-vous sûr de vouloir supprimer cette demande d'achat ? Cette action est irréversible.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && <Loader className="animate-spin" size={18} />}
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Afficher le modal DT */}
        {showDTModal && <DTModal />}
      </div>
    </div>
  );
};

export default DemandeAchatDetail;