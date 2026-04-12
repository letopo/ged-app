// frontend/src/components/Upload.jsx - VERSION 100% COMPLÈTE AVEC SUPPORT DARK MODE
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsAPI } from '../services/api';
import { Upload as UploadIcon, FileText, CheckCircle, XCircle, Loader } from 'lucide-react';

// Le composant est défini comme une constante
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
];

const Upload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const acceptFile = (f) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setError('Le fichier dépasse 10 MB.');
      return;
    }
    setFile(f);
    setError('');
    if (!title) {
      setTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleFileChange = (e) => {
    acceptFile(e.target.files[0]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (uploading) return;
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) acceptFile(droppedFile);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'title') setTitle(value);
    if (name === 'category') setCategory(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!file) { setError('Veuillez sélectionner un fichier'); return; }
    if (!title) { setError('Veuillez saisir un titre'); return; }

    try {
      setUploading(true);
      setUploadProgress(0);

      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('title', title);
      if (category) {
        uploadData.append('category', category);
      }

      await documentsAPI.upload(uploadData, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(progress);
      });

      setSuccess('Document uploadé et analysé avec succès ! Redirection...');
      setFile(null); setTitle(''); setCategory(''); setUploadProgress(0);
      setTimeout(() => navigate('/documents'), 2000);

    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'upload');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        {/* Support Dark Mode pour le titre */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">Upload de document</h1>
        <p className="text-gray-600 dark:text-dark-text-secondary">Ajoutez un nouveau document à la GED</p>
      </div>

      {/* Support Dark Mode pour les messages d'erreur/succès */}
      {error && <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700 rounded-lg flex items-start"><XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 mt-0.5" /><span className="text-red-700 dark:text-red-300">{error}</span></div>}
      {success && <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-700 rounded-lg flex items-start"><CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 mt-0.5" /><span className="text-green-700 dark:text-green-300">{success}</span></div>}

      {/* Formulaire - Support Dark Mode pour le fond */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-surface rounded-lg shadow-md dark:shadow-none border border-gray-200 dark:border-dark-border p-8">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">Fichier *</label>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
              dragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
                : file
                  ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
                  : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
            }`}
          >
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={uploading}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              {dragActive ? (
                <>
                  <UploadIcon className="w-16 h-16 text-blue-500 mb-4 animate-bounce" />
                  <p className="text-lg font-medium text-blue-600 dark:text-blue-400">Déposez le fichier ici</p>
                </>
              ) : file ? (
                <>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-2xl mb-4">
                    <FileText className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-lg font-medium text-gray-900 dark:text-dark-text mb-1">{file.name}</p>
                  <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{formatFileSize(file.size)}</p>
                  {!uploading && <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">Cliquer ou glisser pour changer de fichier</p>}
                </>
              ) : (
                <>
                  <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl mb-4">
                    <UploadIcon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-lg font-medium text-gray-900 dark:text-dark-text mb-1">Glissez-déposez votre fichier ici</p>
                  <p className="text-sm text-gray-500 dark:text-dark-text-secondary">ou <span className="text-blue-600 dark:text-blue-400 font-medium">cliquez pour parcourir</span></p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">PDF, Word, Excel, Images — Max 10 MB</p>
                </>
              )}
            </label>
          </div>
        </div>
        
        {/* Input Titre - Support Dark Mode */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">Titre du document *</label>
          <input 
            type="text" 
            name="title" 
            value={title} 
            onChange={handleInputChange} 
            placeholder="Ex: Contrat de partenariat 2025" 
            // Styles Dark Mode pour l'input
            className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text rounded-lg focus:ring-2 focus:ring-blue-500" 
            disabled={uploading} 
          />
        </div>
        
        {/* Select Catégorie - Support Dark Mode */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">Catégorie (optionnel)</label>
          <select 
            name="category" 
            value={category} 
            onChange={handleInputChange} 
            // Styles Dark Mode pour le select
            className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text rounded-lg focus:ring-2 focus:ring-blue-500" 
            disabled={uploading}
          >
            <option value="">Sélectionner une catégorie</option>
            {/* Les options héritent des styles dark: du select */}
            <option value="Contrats">Contrats</option>
            <option value="Factures">Factures</option>
            <option value="RH">Ressources Humaines</option>
            <option value="Juridique">Juridique</option>
            <option value="Technique">Technique</option>
            <option value="Marketing">Marketing</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
        
        {/* Barre de progression - Support Dark Mode pour le texte et la barre */}
        {uploading && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text">Upload en cours...</span>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-dark-bg rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}
        
        <div className="flex gap-4">
          {/* Bouton Annuler - Support Dark Mode */}
          <button 
            type="button" 
            onClick={() => navigate('/documents')} 
            className="flex-1 px-6 py-3 border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-dark-text font-medium hover:bg-gray-50 dark:hover:bg-gray-700" 
            disabled={uploading}
          >
            Annuler
          </button>
          {/* Bouton Uploader - Support Dark Mode */}
          <button 
            type="submit" 
            disabled={uploading || !file} 
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            {uploading ? <><Loader className="w-5 h-5 animate-spin mr-2" />En cours...</> : <><UploadIcon className="w-5 h-5 mr-2" />Uploader le document</>}
          </button>
        </div>
      </form>

      {/* Bloc Informations - Support Dark Mode pour le fond et le texte */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">ℹ️ Informations</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
          <li>• Les documents PDF seront analysés après l'upload pour détecter les zones de signature.</li>
          <li>• Le document sera en statut "Brouillon" après l'upload.</li>
        </ul>
      </div>
    </div>
  );
};

export default Upload;