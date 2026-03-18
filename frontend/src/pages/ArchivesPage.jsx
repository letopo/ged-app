// frontend/src/pages/ArchivesPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { documentsAPI, getFileBaseUrl } from '../services/api';
import DocumentViewer from '../components/DocumentViewer';
import { Archive, ChevronDown, ChevronRight, FileText, RotateCcw, Loader, FolderOpen } from 'lucide-react';

const ArchivesPage = () => {
  const { user } = useAuth();
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openCategories, setOpenCategories] = useState({});
  const [viewingDocument, setViewingDocument] = useState(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadArchives();
  }, []);

  const loadArchives = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await documentsAPI.getArchives();
      setGrouped(res.data.data || {});
      setTotal(res.data.total || 0);
      // Ouvrir toutes les catégories par défaut
      const initialOpen = {};
      Object.keys(res.data.data || {}).forEach(cat => { initialOpen[cat] = true; });
      setOpenCategories(initialOpen);
    } catch (err) {
      setError('Erreur lors du chargement des archives.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (cat) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleUnarchive = async (doc) => {
    if (!window.confirm(`Désarchiver "${doc.title}" ? Il sera remis dans vos documents.`)) return;
    try {
      await documentsAPI.unarchive(doc.id);
      loadArchives();
    } catch (err) {
      alert('❌ Erreur lors du désarchivage.');
    }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const categoryIcons = {
    'Ordre de mission': '🚗',
    'Pièce de caisse': '💰',
    'Bon de commande': '📦',
    'Bon de commande interne': '📋',
    'Bon de sortie': '📤',
    'Demande de travaux': '🔧',
    'Demande de permission': '📝',
    'Certificat d\'aptitude': '🏥',
    'Autres': '📁',
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );

  if (error) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg">{error}</div>
    </div>
  );

  const categories = Object.keys(grouped).sort();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
          <Archive className="w-7 h-7 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">Archives</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {total} document{total !== 1 ? 's' : ''} archivé{total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Aucun document archivé</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Les documents archivés apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map(cat => {
            const docs = grouped[cat];
            const isOpen = openCategories[cat];
            const icon = categoryIcons[cat] || '📁';

            return (
              <div key={cat} className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border shadow-sm overflow-hidden">
                {/* Header catégorie */}
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <div className="text-left">
                      <h2 className="font-bold text-gray-900 dark:text-dark-text text-lg">{cat}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {docs.length} document{docs.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {isOpen
                    ? <ChevronDown className="w-5 h-5 text-gray-400" />
                    : <ChevronRight className="w-5 h-5 text-gray-400" />
                  }
                </button>

                {/* Liste documents */}
                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-dark-border divide-y divide-gray-100 dark:divide-dark-border">
                    {docs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-dark-text truncate">{doc.title}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              <span>{formatDate(doc.createdAt)}</span>
                              {doc.uploadedBy && (
                                <span>· {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          <button
                            onClick={() => setViewingDocument(doc)}
                            className="px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg transition font-medium"
                          >
                            Voir
                          </button>
                          <button
                            onClick={() => handleUnarchive(doc)}
                            className="px-3 py-1.5 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 rounded-lg transition font-medium flex items-center gap-1"
                            title="Désarchiver"
                          >
                            <RotateCcw size={12} />
                            Restaurer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Viewer PDF */}
      {viewingDocument && (
        <DocumentViewer
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
};

export default ArchivesPage;
