// frontend/src/components/DocumentViewer.jsx
import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';

const DocumentViewer = ({ document, onClose, onValidate, onReject, showActions = false }) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);

  // Construire l'URL du document
  const getDocumentUrl = () => {
    if (!document?.filePath) {
      console.error('❌ Pas de filePath dans le document:', document);
      return null;
    }
    
    // Nettoyer le filePath
    // 1. Enlever "uploads\" ou "uploads/" au début si présent
    // 2. Remplacer les backslashes par des slashes
    // 3. Enlever les slashes multiples
    let cleanPath = document.filePath
      .replace(/^uploads[\\\/]/, '')  // Enlever "uploads\" ou "uploads/" au début
      .replace(/\\/g, '/')             // Remplacer \ par /
      .replace(/^\/+/, '')             // Enlever les / au début
      .replace(/\/+/g, '/');           // Enlever les / multiples
    
    // Pour les fichiers, on utilise directement le backend sans /api
    // Si votre backend est sur 3000, utilisez 3000
    // Si votre backend est sur 3001, utilisez 3001
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const fullUrl = `${backendUrl}/uploads/${cleanPath}`;
    
    console.log('📄 Construction URL document:');
    console.log('  - Backend URL:', backendUrl);
    console.log('  - FilePath brut:', document.filePath);
    console.log('  - FilePath nettoyé:', cleanPath);
    console.log('  - URL Finale:', fullUrl);
    
    return fullUrl;
  };

  // Déterminer le type de fichier
  const getFileType = () => {
    if (!document?.fileName) return 'unknown';
    const ext = document.fileName.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'office';
    return 'unknown';
  };

  const fileType = getFileType();
  const documentUrl = getDocumentUrl();

  // Télécharger le document
  const handleDownload = () => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    }
  };

  // Actions de validation
  const handleValidate = () => {
    if (onValidate) {
      onValidate({ comment });
    }
  };

  const handleReject = () => {
    if (onReject) {
      onReject({ comment });
    }
  };

  // Contrôles de zoom
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{document?.fileName}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Uploadé le {document?.createdAt ? new Date(document.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
              {document?.uploadedBy && ` par ${document.uploadedBy.username}`}
            </p>
          </div>

          {/* Outils de visualisation */}
          <div className="flex items-center gap-2 mx-4">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-200 rounded transition"
              title="Zoom arrière"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium min-w-[60px] text-center">{zoom}%</span>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-200 rounded transition"
              title="Zoom avant"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={handleRotate}
              className="p-2 hover:bg-gray-200 rounded transition ml-2"
              title="Rotation"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-200 rounded transition ml-2"
              title="Télécharger"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded transition"
            title="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Zone de visualisation */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className="flex items-center justify-center min-h-full">
            {fileType === 'pdf' && (
              <div className="relative">
                {documentUrl ? (
                  <div 
                    className="bg-white shadow-lg"
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s'
                    }}
                  >
                    <iframe
                      src={`${documentUrl}#toolbar=0`}
                      className="w-[210mm] h-[297mm]"
                      title="Prévisualisation PDF"
                      onLoad={() => setLoading(false)}
                      onError={() => {
                        setLoading(false);
                        console.error('❌ Erreur chargement iframe PDF');
                      }}
                    />
                  </div>
                ) : (
                  <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
                    <p className="text-red-600 font-semibold mb-4">
                      Erreur : Chemin du fichier introuvable
                    </p>
                    <p className="text-gray-600 mb-4 text-sm">
                      Le document ne peut pas être chargé car le chemin du fichier est manquant.
                    </p>
                    <button
                      onClick={() => console.log('Document complet:', document)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
                    >
                      Afficher les détails (Console)
                    </button>
                  </div>
                )}
              </div>
            )}

            {fileType === 'image' && (
              <img
                src={documentUrl}
                alt={document?.fileName}
                className="max-w-full max-h-full object-contain shadow-lg"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s'
                }}
                onLoad={() => setLoading(false)}
              />
            )}

            {fileType === 'office' && (
              <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
                <p className="text-gray-600 mb-4">
                  Prévisualisation non disponible pour ce type de fichier.
                </p>
                <button
                  onClick={handleDownload}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Télécharger le document
                </button>
              </div>
            )}

            {fileType === 'unknown' && (
              <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
                <p className="text-gray-600 mb-4">
                  Type de fichier non reconnu.
                </p>
                <button
                  onClick={handleDownload}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Télécharger quand même
                </button>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Chargement du document...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Zone de validation (si activée) */}
        {showActions && (
          <div className="border-t bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commentaire (optionnel)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Ajoutez un commentaire sur ce document..."
              />

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleReject}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Rejeter
                </button>
                <button
                  onClick={handleValidate}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Approuver
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;