// frontend/src/components/ImportExportEmployees.jsx
import React, { useState } from 'react';
import { employeesAPI } from '../services/api';
import { Download, Upload, FileText, CheckCircle, XCircle, Loader } from 'lucide-react';

const ImportExportEmployees = ({ onImportComplete }) => {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // Export CSV
  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await employeesAPI.exportCSV();
      
      // Créer un blob et télécharger le fichier
      const blob = new Blob([response.data], { type: 'text/csv; charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `employes_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      alert('Export CSV réussi !');
    } catch (err) {
      console.error('Erreur export:', err);
      alert('Erreur lors de l\'export CSV');
    } finally {
      setLoading(false);
    }
  };

  // Import CSV
  const handleImport = async () => {
    if (!selectedFile) {
      alert('Veuillez sélectionner un fichier CSV');
      return;
    }

    const formData = new FormData();
    formData.append('csvFile', selectedFile);

    try {
      setLoading(true);
      const response = await employeesAPI.importCSV(formData);
      setImportResults(response.data);
      
      if (response.data.success) {
        alert(response.data.message);
        setImportModalOpen(false);
        setSelectedFile(null);
        if (onImportComplete) {
          onImportComplete();
        }
      }
    } catch (err) {
      console.error('Erreur import:', err);
      alert(err.response?.data?.error || 'Erreur lors de l\'import CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setImportResults(null);
      } else {
        alert('Veuillez sélectionner un fichier CSV valide');
        e.target.value = '';
      }
    }
  };

  return (
    <>
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleExport}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? <Loader className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />}
          Exporter CSV
        </button>
        
        <button
          onClick={() => setImportModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Upload className="w-4 h-4" />
          Importer CSV
        </button>
      </div>

      {/* Modal d'import */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-xl dark:shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                Importer des employés depuis CSV
              </h2>
              <button
                onClick={() => {
                  setImportModalOpen(false);
                  setSelectedFile(null);
                  setImportResults(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                  Format CSV requis :
                </h3>
                <ul className="text-sm text-blue-700 dark:text-blue-400 list-disc list-inside space-y-1">
                  <li>Encodage: UTF-8</li>
                  <li>Séparateur: Point-virgule (;)</li>
                  <li>Colonnes: Matricule, Nom, Prénom, Date de naissance, Lieu de naissance, Sexe, Nombre d'enfants, Statut matrimonial, Service</li>
                  <li>La première ligne doit contenir les en-têtes</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Fichier CSV
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-bg dark:text-dark-text"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-2">
                    Fichier sélectionné: {selectedFile.name}
                  </p>
                )}
              </div>

              {importResults && (
                <div className={`p-4 rounded-lg ${
                  importResults.success 
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {importResults.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                    <span className="font-semibold">{importResults.message}</span>
                  </div>
                  
                  {importResults.results && (
                    <div className="text-sm space-y-1">
                      <p>Total: {importResults.results.total} lignes</p>
                      <p className="text-green-600 dark:text-green-400">
                        Succès: {importResults.results.success}
                      </p>
                      <p className="text-yellow-600 dark:text-yellow-400">
                        Doublons: {importResults.results.duplicates}
                      </p>
                      <p className="text-red-600 dark:text-red-400">
                        Erreurs: {importResults.results.errors.length}
                      </p>
                      
                      {importResults.results.errors.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm">Voir les erreurs détaillées</summary>
                          <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                            {importResults.results.errors.map((error, index) => (
                              <li key={index} className="text-xs text-red-600 dark:text-red-400">
                                {error}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4">
                <button
                  onClick={() => {
                    setImportModalOpen(false);
                    setSelectedFile(null);
                    setImportResults(null);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={!selectedFile || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && <Loader className="animate-spin w-4 h-4" />}
                  Importer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImportExportEmployees;