// frontend/src/pages/DocumentList.jsx - VERSION 100% COMPLÈTE AVEC SUPPORT DARK MODE

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { documentsAPI, workflowAPI, usersAPI } from '../services/api';
import DocumentViewer from '../components/DocumentViewer';
import WorkflowProgress from '../components/WorkflowProgress';
import { FileText, Search, Eye, Calendar, User, Trash2, Send, LayoutGrid, LayoutList, X, Check, Loader, AlertCircle, FilePlus } from 'lucide-react';

const DocumentList = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [documentToSubmit, setDocumentToSubmit] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedValidators, setSelectedValidators] = useState([]);
  const [submitComment, setSubmitComment] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  // Nouvelle: État pour la recherche dans la modale des validateurs
  const [searchValidatorTerm, setSearchValidatorTerm] = useState(''); 

  const authorizedEmailsForCaisse = [
    'raoulwouapi2017@yahoo.com',
    'hsjm.achat@gmail.com',
    'hsjm.directeurdusoutien@gmail.com',
    'aureleyankeu@gmail.com'
  ];

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await documentsAPI.getAll();
      if (response.data && Array.isArray(response.data.data)) {
        setDocuments(response.data.data);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      setError('Erreur lors du chargement des documents');
      setDocuments([]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await usersAPI.getAll();
      const usersList = response.data?.users || [];
      // Filtrer l'utilisateur courant et les non-validateurs/directeurs/admins
      const currentUser = JSON.parse(localStorage.getItem('user'));
      const validators = usersList.filter(user => 
        ['validator', 'director', 'admin'].includes(user.role) && user.id !== currentUser?.id
      );
      setAvailableUsers(validators);
    } catch (err) {
      setError('Impossible de charger les utilisateurs pour la validation.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenSubmitModal = async (document) => {
    setDocumentToSubmit(document);
    setShowSubmitModal(true);
    setSelectedValidators([]);
    setSubmitComment('');
    setSearchValidatorTerm(''); // Nouvelle: Réinitialiser la recherche
    await loadAvailableUsers();
  };

  const handleCloseSubmitModal = () => {
    setShowSubmitModal(false);
    setDocumentToSubmit(null);
  };

  const addValidator = (userId) => {
    if (!selectedValidators.includes(userId)) {
      setSelectedValidators([...selectedValidators, userId]);
    }
  };

  const removeValidator = (userId) => {
    setSelectedValidators(selectedValidators.filter(id => id !== userId));
  };

  const moveValidator = (index, direction) => {
    const newValidators = [...selectedValidators];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newValidators.length) {
      [newValidators[index], newValidators[newIndex]] = [newValidators[newIndex], newValidators[index]];
      setSelectedValidators(newValidators);
    }
  };

  const handleSubmitWorkflow = async () => {
    if (selectedValidators.length === 0) {
      alert('Veuillez sélectionner au moins un validateur.');
      return;
    }
    try {
      setSubmitLoading(true);
      const workflowData = {
        documentId: documentToSubmit.id,
        validatorIds: selectedValidators,
        comment: submitComment
      };
      await workflowAPI.create(workflowData);
      alert('✅ Document soumis au workflow avec succès !');
      handleCloseSubmitModal();
      loadDocuments();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de la soumission';
      alert(`❌ ${errorMessage}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!docId) {
      alert('❌ Erreur : ID du document manquant.');
      return;
    }
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.')) return;

    try {
      await documentsAPI.delete(docId);
      alert('✅ Document supprimé avec succès.');
      loadDocuments();
    } catch (err) {
      console.error("Erreur suppression:", err);
      alert('❌ Erreur lors de la suppression du document.');
    }
  };

  const getUserNameById = (userId) => {
    const user = availableUsers.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Utilisateur inconnu';
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Nouvelle: Logique pour filtrer les utilisateurs dans la modale
  const filteredAvailableUsers = useMemo(() => {
    if (!searchValidatorTerm) {
      return availableUsers;
    }
    const lowerCaseSearch = searchValidatorTerm.toLowerCase();
    return availableUsers.filter(user =>
      (user.firstName + ' ' + user.lastName).toLowerCase().includes(lowerCaseSearch) ||
      user.role.toLowerCase().includes(lowerCaseSearch) ||
      user.email?.toLowerCase().includes(lowerCaseSearch)
    );
  }, [availableUsers, searchValidatorTerm]);

  const filteredDocuments = documents.filter(doc => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchSearch = doc.title?.toLowerCase().includes(searchTermLower) ||
                       doc.originalName?.toLowerCase().includes(searchTermLower);
    const matchStatus = filterStatus === 'all' || doc.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader className="w-16 h-16 animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
      
      <main className="lg:col-span-3">
        <div className="mb-8">
          {/* Support Dark Mode pour le titre et le sous-titre */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-2">Mes Documents</h1>
          <p className="text-gray-600 dark:text-dark-text-secondary">Gérez vos documents et leurs validations</p>
        </div>

        {/* Support Dark Mode pour le conteneur de filtres */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm dark:shadow-none p-4 mb-6 border border-gray-200 dark:border-dark-border">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Rechercher par titre ou nom de fichier..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  // Styles Dark Mode pour l'input
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-dark-text dark:border-dark-border" 
                />
              </div>
            </div>
            {/* Styles Dark Mode pour le select */}
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-dark-text dark:border-dark-border"
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="pending_validation">En validation</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Rejeté</option>
            </select>
            <div className="flex gap-2">
              {/* Styles Dark Mode pour les boutons d'affichage */}
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 dark:bg-dark-bg dark:text-dark-text-secondary'}`}><LayoutGrid size={20} /></button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 dark:bg-dark-bg dark:text-dark-text-secondary'}`}><LayoutList size={20} /></button>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</div>}

        {filteredDocuments.length === 0 ? (
          // Support Dark Mode pour le message vide
          <div className="text-center py-12 bg-white dark:bg-dark-surface rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-dark-border">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text">Aucun document trouvé</h3>
          </div>
        ) : (
          <>
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredDocuments.map((doc) => (
                  // Support Dark Mode pour la carte de la vue Grille
                  <div key={doc.id} className="bg-white dark:bg-dark-surface rounded-lg shadow-sm hover:shadow-md dark:shadow-none border border-gray-200 dark:border-dark-border flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-dark-border">
                      <div className="flex items-start justify-between mb-2">
                        <FileText size={24} className="text-blue-600" />
                        <span className={`px-2 py-1 rounded text-xs font-medium ${ doc.status === 'approved' ? 'bg-green-100 text-green-800' : doc.status === 'rejected' ? 'bg-red-100 text-red-800' : doc.status === 'pending_validation' ? 'bg-yellow-100 text-yellow-800' : doc.status === 'draft' ? 'bg-gray-100 text-gray-800' : 'bg-gray-100'}`}>
                          {doc.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-dark-text truncate">{doc.title}</h3>
                    </div>
                    <div className="p-4 space-y-2 flex-grow">
                      <div className="flex items-center text-sm text-gray-600 dark:text-dark-text-secondary gap-2"><User size={16} /><span>{doc.uploadedBy ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` : 'Inconnu'}</span></div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-dark-text-secondary gap-2"><Calendar size={16} /><span>{formatDate(doc.createdAt)}</span></div>
                    </div>
                    {['pending_validation', 'approved', 'rejected'].includes(doc.status) && (
                      <div className="p-4 border-t border-gray-200 dark:border-dark-border"><WorkflowProgress workflows={doc.workflows} documentStatus={doc.status} /></div>
                    )}
                    <div className="p-4 border-t border-gray-200 dark:border-dark-border flex gap-2">
                        {/* Boutons Dark Mode */}
                        <button onClick={() => setViewingDocument(doc)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"><Eye size={16} /><span>Voir</span></button>
                        <button onClick={() => handleOpenSubmitModal(doc)} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50" title={doc.status !== 'draft' ? "Ce document ne peut plus être soumis" : "Soumettre"} disabled={doc.status !== 'draft'}><Send size={16} /></button>
                        <button onClick={() => handleDelete(doc.id)} className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700" title="Supprimer"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {viewMode === 'list' && (
              // Support Dark Mode pour la vue Liste (Tableau)
              <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm dark:shadow-none overflow-hidden border border-gray-200 dark:border-dark-border">
                <table className="min-w-full">
                  <thead className="bg-gray-50 dark:bg-dark-bg">
                    <tr>
                      {/* Textes du thead en Dark Mode */}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">Document</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">Date</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                    {filteredDocuments.map((doc) => (
                      <React.Fragment key={doc.id}>
                        {/* Hover Dark Mode pour la ligne */}
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <FileText className="text-blue-600 mr-3" size={20} />
                              <div>
                                {/* Textes des cellules en Dark Mode */}
                                <div className="text-sm font-medium text-gray-900 dark:text-dark-text">{doc.title}</div>
                                <div className="text-sm text-gray-500 dark:text-dark-text-secondary">{formatSize(doc.fileSize)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${ doc.status === 'approved' ? 'bg-green-100 text-green-800' : doc.status === 'rejected' ? 'bg-red-100 text-red-800' : doc.status === 'pending_validation' ? 'bg-yellow-100 text-yellow-800' : doc.status === 'draft' ? 'bg-gray-100 text-gray-800' : 'bg-gray-100'}`}>
                              {doc.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-dark-text-secondary">{formatDate(doc.createdAt)}</td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              {/* Icônes/Boutons en Dark Mode */}
                              <button onClick={() => setViewingDocument(doc)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="Visualiser"><Eye size={18} /></button>
                              <button onClick={() => handleOpenSubmitModal(doc)} className="text-green-600 hover:text-green-900 disabled:opacity-50 dark:text-green-400 dark:hover:text-green-300" title={doc.status !== 'draft' ? "Ce document ne peut plus être soumis" : "Soumettre"} disabled={doc.status !== 'draft'}><Send size={18} /></button>
                              <button onClick={() => handleDelete(doc.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Supprimer"><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </tr>
                        {['pending_validation', 'approved', 'rejected'].includes(doc.status) && (
                          <tr className="bg-gray-50 dark:bg-dark-bg"><td colSpan="4" className="px-6 py-2"><WorkflowProgress workflows={doc.workflows} documentStatus={doc.status} /></td></tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
      
      <aside className="lg:col-span-1">
        {/* Support Dark Mode pour la colonne latérale (Créer un document) */}
        <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-dark-border sticky top-8">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-dark-text"><FilePlus size={20} />Créer un document</h3>
            <ul className="space-y-2">
                {/* Support Dark Mode pour les liens de la colonne latérale */}
                <li><Link to="/create-from-template" state={{ templateName: "Demande de permission" }} className="block p-3 bg-gray-50 hover:bg-blue-50 dark:bg-dark-bg dark:text-dark-text dark:hover:bg-blue-900/50 rounded-lg transition">📄 Demande de permission</Link></li>
                {user && authorizedEmailsForCaisse.includes(user.email) && (
                    <li><Link to="/create-from-template" state={{ templateName: "Pièce de caisse" }} className="block p-3 bg-gray-50 hover:bg-blue-50 dark:bg-dark-bg dark:text-dark-text dark:hover:bg-blue-900/50 rounded-lg transition">💰 Pièce de caisse</Link></li>
                )}
                <li>
                    <Link to="/create-work-request" className="block p-3 bg-gray-50 hover:bg-blue-50 dark:bg-dark-bg dark:text-blue-400 dark:hover:bg-blue-900/50 font-semibold text-blue-800 rounded-lg transition">
                        🔧 Demande de travaux
                    </Link>
                </li>
                <li>
                    <Link to="/create-from-template" state={{ templateName: "Ordre de mission" }} className="block p-3 bg-gray-50 hover:bg-blue-50 dark:bg-dark-bg dark:text-dark-text dark:hover:bg-blue-900/50 rounded-lg transition">
                        🚗 Ordre de mission
                    </Link>
                </li>
                <li>
                    <Link to="/create-from-template" state={{ templateName: "Demande de permutation" }} className="block p-3 bg-gray-50 hover:bg-blue-50 dark:bg-dark-bg dark:text-dark-text dark:hover:bg-blue-900/50 rounded-lg transition">
                        🔄 Demande de permutation
                    </Link>
                </li>
                <li>
                  <Link to="/create-from-template" state={{ templateName: "Bon de sortie" }} 
                    className="block p-3 bg-gray-50 hover:bg-blue-50 dark:bg-dark-bg dark:text-dark-text dark:hover:bg-blue-900/50 rounded-lg transition">
                    📦 Bon de sortie
                  </Link>
                </li>
            </ul>
        </div>
      </aside>
      
      {/* Modal Soumettre au workflow - Support Dark Mode */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl dark:shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-dark-border flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Soumettre au workflow</h2>
                <button onClick={handleCloseSubmitModal} className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
                <p className="text-sm text-gray-700 dark:text-dark-text">Document : <span className="font-medium">{documentToSubmit?.title}</span></p>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-3">Sélectionnez les validateurs (dans l'ordre)</label>
                    {loadingUsers ? <div className="flex justify-center py-8"><Loader className="animate-spin text-blue-600" /></div> : availableUsers.length === 0 && !searchValidatorTerm ? <div className="text-center py-8 bg-gray-50 dark:bg-dark-bg rounded-lg"><AlertCircle className="mx-auto text-gray-400 mb-2" size={32} /><p className='text-gray-700 dark:text-dark-text'>Aucun validateur disponible</p></div> : 
                    <>
                      {/* Nouvelle: Champ de recherche des validateurs */}
                      <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                          <input
                              type="text"
                              placeholder="Rechercher par nom, rôle ou email..."
                              value={searchValidatorTerm}
                              onChange={(e) => setSearchValidatorTerm(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                      </div>
                      
                      {/* Utilisation de filteredAvailableUsers pour l'affichage */}
                      <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-dark-border rounded-lg p-3">
                          {filteredAvailableUsers.length > 0 ? (
                              filteredAvailableUsers.map((user) => (
                                  <div 
                                      key={user.id} 
                                      onClick={() => addValidator(user.id)} 
                                      className={`p-3 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${selectedValidators.includes(user.id) ? 'bg-blue-100 border-2 border-blue-500 dark:bg-blue-900/30' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 dark:bg-dark-bg dark:hover:bg-gray-700 dark:border-dark-border'}`}
                                  >
                                      <div className="flex items-center text-gray-900 dark:text-dark-text">
                                          <User size={20} className="mr-3" />
                                          <div>
                                              <div className="font-medium">{user.firstName} {user.lastName}</div>
                                              <div className="text-xs text-gray-500 dark:text-dark-text-secondary">{user.role}</div>
                                          </div>
                                      </div>
                                      {selectedValidators.includes(user.id) && <Check size={20} className="text-blue-600" />}
                                  </div>
                              ))
                          ) : (
                              <div className="text-center py-4 text-gray-500 dark:text-dark-text-secondary">
                                  {searchValidatorTerm 
                                      ? "Aucun validateur trouvé pour cette recherche." 
                                      : "Aucun validateur disponible."}
                              </div>
                          )}
                      </div>
                    </>}
                </div>
                {selectedValidators.length > 0 && <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-3">Ordre de validation</label>
                    <div className="space-y-2">
                        <div className="text-sm text-gray-600 dark:text-dark-text-secondary mb-2">Le premier validateur est celui qui doit agir en premier.</div>
                        {selectedValidators.map((userId, index) => (
                        <div key={userId} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-700">
                            <div className="flex items-center text-gray-900 dark:text-dark-text"><span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold mr-3">{index + 1}</span><div><div className="font-medium">{getUserNameById(userId)}</div></div></div>
                            <div className="flex gap-2">
                            <button onClick={() => moveValidator(index, 'up')} disabled={index === 0} className="p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded disabled:opacity-30">↑</button>
                            <button onClick={() => moveValidator(index, 'down')} disabled={index === selectedValidators.length - 1} className="p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded disabled:opacity-30">↓</button>
                            <button onClick={() => removeValidator(userId)} className="p-1 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded"><X size={16} /></button>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">Commentaire (optionnel)</label>
                    <textarea value={submitComment} onChange={(e) => setSubmitComment(e.target.value)} rows="3" placeholder="Ajoutez un message..." className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-dark-text dark:border-dark-border" />
                </div>
            </div>
            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-dark-border flex justify-end gap-3">
              <button onClick={handleCloseSubmitModal} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600" disabled={submitLoading}>Annuler</button>
              <button onClick={handleSubmitWorkflow} disabled={selectedValidators.length === 0 || submitLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600">
                {submitLoading ? <><Loader className="animate-spin w-4 h-4 mr-2" />Soumission...</> : <><Send size={16} />Soumettre</>}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {viewingDocument && (
        <DocumentViewer
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
};

export default DocumentList;