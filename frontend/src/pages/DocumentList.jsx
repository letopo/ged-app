// frontend/src/pages/DocumentList.jsx - Version Complète
import React, { useState, useEffect } from 'react';
import { documentsAPI, workflowAPI, usersAPI } from '../services/api';
import DocumentViewer from '../components/DocumentViewer';
import { 
  FileText, 
  Search, 
  Download, 
  Eye,
  Calendar,
  User,
  Filter,
  ChevronDown,
  AlertCircle,
  Trash2,
  Send,
  LayoutGrid,
  LayoutList,
  MoreVertical
} from 'lucide-react';

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' ou 'table'
  const [showSubmitModal, setShowSubmitModal] = useState(null);
  const [validators, setValidators] = useState([]);
  const [selectedValidators, setSelectedValidators] = useState([]);

  useEffect(() => {
    loadDocuments();
    loadValidators();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await documentsAPI.getAll();
      let docs = [];
      
      if (response.data) {
        if (response.data.documents) {
          docs = response.data.documents;
        } else if (response.data.data) {
          docs = response.data.data;
        } else if (Array.isArray(response.data)) {
          docs = response.data;
        }
      }
      
      setDocuments(docs);
    } catch (error) {
      console.error('❌ Erreur chargement documents:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadValidators = async () => {
    try {
      const response = await usersAPI.getAll();
      const users = response.data.users || response.data.data || response.data || [];
      // Filtrer pour ne garder que les directeurs/validateurs
      const validatorsList = users.filter(u => u.role === 'director' || u.role === 'validator' || u.role === 'admin');
      setValidators(validatorsList);
    } catch (error) {
      console.warn('⚠️ Erreur chargement validateurs:', error);
    }
  };

  const handleViewDocument = (doc) => {
    const normalizedDoc = {
      id: doc.id,
      fileName: doc.filename || doc.fileName || doc.originalName,
      filePath: doc.path || doc.filePath,
      fileSize: doc.size || doc.fileSize,
      documentType: doc.type || doc.documentType,
      status: doc.status,
      createdAt: doc.createdAt || doc.created_at,
      uploadedBy: doc.user || doc.uploadedBy
    };
    
    setSelectedDocument(normalizedDoc);
  };

  const handleDownload = (doc) => {
    const filePath = doc.path || doc.filePath;
    if (!filePath) {
      alert('Chemin du fichier non disponible');
      return;
    }
    
    let cleanPath = filePath
      .replace(/^uploads[\\\/]/, '')
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+/g, '/');
    
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const url = `${backendUrl}/uploads/${cleanPath}`;
    
    window.open(url, '_blank');
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${doc.filename || doc.fileName}" ?`)) {
      return;
    }

    try {
      await documentsAPI.delete(doc.id);
      alert('Document supprimé avec succès !');
      loadDocuments();
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      alert('Erreur lors de la suppression du document');
    }
  };

  const handleSubmitWorkflow = (doc) => {
    setShowSubmitModal(doc);
    setSelectedValidators([]);
  };

  const submitToWorkflow = async () => {
    if (selectedValidators.length === 0) {
      alert('Veuillez sélectionner au moins un validateur');
      return;
    }

    try {
      // Créer les tâches de workflow pour chaque validateur
      for (let i = 0; i < selectedValidators.length; i++) {
        await workflowAPI.createTask({
          documentId: showSubmitModal.id,
          validatorId: selectedValidators[i],
          step: i + 1
        });
      }

      alert('Document soumis pour validation avec succès !');
      setShowSubmitModal(null);
      setSelectedValidators([]);
      loadDocuments();
    } catch (error) {
      console.error('❌ Erreur soumission workflow:', error);
      alert('Erreur lors de la soumission du document');
    }
  };

  const toggleValidator = (validatorId) => {
    if (selectedValidators.includes(validatorId)) {
      setSelectedValidators(selectedValidators.filter(id => id !== validatorId));
    } else {
      setSelectedValidators([...selectedValidators, validatorId]);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.originalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.type?.toLowerCase().includes(searchTerm.toLowerCase());

    const docType = doc.type || doc.documentType;
    const matchesType = filterType === 'all' || docType === filterType;
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const documentTypes = ['all', ...new Set(documents.map(d => d.type || d.documentType).filter(Boolean))];
  const statuses = ['all', ...new Set(documents.map(d => d.status).filter(Boolean))];

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'validated': 'bg-green-100 text-green-800 border-green-300',
      'approved': 'bg-green-100 text-green-800 border-green-300',
      'rejected': 'bg-red-100 text-red-800 border-red-300',
      'draft': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-900 mb-2">Erreur de Chargement</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadDocuments}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Tous les documents
        </h1>
        <p className="text-gray-600">
          {filteredDocuments.length} document(s) trouvé(s)
        </p>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Recherche */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un document..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtre par type */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                {documentTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'Tous les types' : type}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            </div>

            {/* Filtre par statut */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'Tous les statuts' : status}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            </div>
          </div>

          {/* Boutons de vue */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'cards' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Vue en cartes"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'table' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Vue en tableau"
            >
              <LayoutList className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Liste des documents */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Aucun document trouvé
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm 
              ? 'Essayez de modifier vos critères de recherche'
              : 'Aucun document n\'a encore été uploadé'
            }
          </p>
          {documents.length === 0 && (
            <button
              onClick={() => window.location.href = '/upload'}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Uploader un document
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        // Vue en cartes
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition overflow-hidden"
            >
              {/* En-tête de la carte */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(doc.status)}`}>
                    {doc.status || 'N/A'}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {doc.filename || doc.fileName || doc.originalName || 'Sans nom'}
                </h3>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>{doc.type || doc.documentType || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{doc.user?.username || doc.uploadedBy?.username || 'Inconnu'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {doc.createdAt || doc.created_at 
                        ? new Date(doc.createdAt || doc.created_at).toLocaleDateString('fr-FR')
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleViewDocument(doc)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium inline-flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Visualiser
                  </button>
                  
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition"
                    title="Télécharger"
                  >
                    <Download className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => handleSubmitWorkflow(doc)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                    title="Soumettre pour validation"
                  >
                    <Send className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => handleDelete(doc)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Supprimer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Vue en tableau
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploadé par
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-blue-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {doc.filename || doc.fileName || doc.originalName || 'Sans nom'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {doc.size ? `${(doc.size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {doc.type || doc.documentType || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(doc.status)}`}>
                        {doc.status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        {doc.user?.username || doc.uploadedBy?.username || 'Inconnu'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-2" />
                        {doc.createdAt || doc.created_at 
                          ? new Date(doc.createdAt || doc.created_at).toLocaleDateString('fr-FR')
                          : 'N/A'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Visualiser"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                          title="Télécharger"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleSubmitWorkflow(doc)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Soumettre"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de visualisation */}
      {selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          showActions={false}
        />
      )}

      {/* Modal de soumission au workflow */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                Soumettre pour Validation
              </h2>
              <p className="text-gray-600 mt-2">
                Document : {showSubmitModal.filename || showSubmitModal.fileName}
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <p className="text-sm font-medium text-gray-700 mb-4">
                Sélectionnez les validateurs (dans l'ordre de validation) :
              </p>

              {validators.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  Aucun validateur disponible
                </p>
              ) : (
                <div className="space-y-2">
                  {validators.map((validator) => (
                    <label
                      key={validator.id}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedValidators.includes(validator.id)}
                        onChange={() => toggleValidator(validator.id)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{validator.username}</p>
                        <p className="text-sm text-gray-600">{validator.email}</p>
                        <p className="text-xs text-gray-500 capitalize">{validator.role}</p>
                      </div>
                      {selectedValidators.includes(validator.id) && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          Étape {selectedValidators.indexOf(validator.id) + 1}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSubmitModal(null);
                  setSelectedValidators([]);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={submitToWorkflow}
                disabled={selectedValidators.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Soumettre ({selectedValidators.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentList;