// frontend/src/components/Upload.jsx - VERSION 100% COMPLÈTE
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsAPI } from '../services/api';
import { Upload as UploadIcon, FileText, CheckCircle, XCircle, Loader } from 'lucide-react';

// Le composant est défini comme une constante
const Upload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
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
      <div className="mb-8"><h1 className="text-3xl font-bold">Upload de document</h1><p className="text-gray-600">Ajoutez un nouveau document à la GED</p></div>

      {error && <div className="mb-6 p-4 bg-red-50 border rounded-lg flex items-start"><XCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" /><span className="text-red-700">{error}</span></div>}
      {success && <div className="mb-6 p-4 bg-green-50 border rounded-lg flex items-start"><CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" /><span className="text-green-700">{success}</span></div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Fichier *</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
            <input type="file" onChange={handleFileChange} className="hidden" id="file-upload" disabled={uploading} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png" />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              {file ? (
                <><FileText className="w-16 h-16 text-green-600 mb-4" /><p className="text-lg font-medium text-gray-900 mb-2">{file.name}</p><p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>{!uploading && <p className="text-sm text-blue-600 mt-2">Cliquer pour changer de fichier</p>}</>
              ) : (
                <><UploadIcon className="w-16 h-16 text-gray-400 mb-4" /><p className="text-lg font-medium text-gray-900 mb-2">Cliquez pour sélectionner un fichier</p><p className="text-sm text-gray-600">ou glissez-déposez le fichier ici</p><p className="text-xs text-gray-500 mt-2">PDF, Word, Excel, Images (Max 10MB)</p></>
              )}
            </label>
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Titre du document *</label>
          <input type="text" name="title" value={title} onChange={handleInputChange} placeholder="Ex: Contrat de partenariat 2025" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" disabled={uploading} />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie (optionnel)</label>
          <select name="category" value={category} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" disabled={uploading}>
            <option value="">Sélectionner une catégorie</option>
            <option value="Contrats">Contrats</option><option value="Factures">Factures</option><option value="RH">Ressources Humaines</option><option value="Juridique">Juridique</option><option value="Technique">Technique</option><option value="Marketing">Marketing</option><option value="Autre">Autre</option>
          </select>
        </div>
        {uploading && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-gray-700">Upload en cours...</span><span className="text-sm font-medium text-blue-600">{uploadProgress}%</span></div>
            <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${uploadProgress}%` }} /></div>
          </div>
        )}
        <div className="flex gap-4">
          <button type="button" onClick={() => navigate('/documents')} className="flex-1 px-6 py-3 border rounded-lg text-gray-700 font-medium hover:bg-gray-50" disabled={uploading}>Annuler</button>
          <button type="submit" disabled={uploading || !file} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center">
            {uploading ? <><Loader className="w-5 h-5 animate-spin mr-2" />En cours...</> : <><UploadIcon className="w-5 h-5 mr-2" />Uploader le document</>}
          </button>
        </div>
      </form>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Informations</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Les documents PDF seront analysés après l'upload pour détecter les zones de signature.</li>
          <li>• Le document sera en statut "Brouillon" après l'upload.</li>
        </ul>
      </div>
    </div>
  );
};

// --- CORRECTION : AJOUT DE L'EXPORT PAR DÉFAUT ---
export default Upload;