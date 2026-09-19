// frontend/src/components/ImportExportEmployees.jsx
import React, { useState } from 'react';
import { employeesAPI } from '../services/api';
import { Download, Upload, CheckCircle, XCircle, Loader, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ImportExportEmployees({ onImportComplete }) {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile]       = useState(null);
  const [importResults, setImportResults]     = useState(null);
  const [loading, setLoading]                 = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await employeesAPI.exportCSV();
      const blob = new Blob([response.data], { type: 'text/csv; charset=utf-8' });
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `employes_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast('Export CSV réussi !');
    } catch (err) {
      console.error('Erreur export:', err);
      toast('Erreur lors de l\'export CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) { toast('Veuillez sélectionner un fichier CSV'); return; }
    const formData = new FormData();
    formData.append('csvFile', selectedFile);
    try {
      setLoading(true);
      const response = await employeesAPI.importCSV(formData);
      setImportResults(response.data);
      if (response.data.success) {
        toast(response.data.message);
        setImportModalOpen(false);
        setSelectedFile(null);
        if (onImportComplete) onImportComplete();
      }
    } catch (err) {
      console.error('Erreur import:', err);
      toast(err.response?.data?.error || 'Erreur lors de l\'import CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      setSelectedFile(file);
      setImportResults(null);
    } else {
      toast('Veuillez sélectionner un fichier CSV valide');
      e.target.value = '';
    }
  };

  const closeModal = () => { setImportModalOpen(false); setSelectedFile(null); setImportResults(null); };

  const btnBase = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 34, padding: '0 14px', borderRadius: 'var(--radius-2)',
    border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={handleExport}
          disabled={loading}
          style={{ ...btnBase, background: 'var(--success)', color: '#fff', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? <Loader size={13} className="animate-spin" /> : <Download size={13} />}
          Exporter CSV
        </button>
        <button
          onClick={() => setImportModalOpen(true)}
          style={{ ...btnBase, background: 'var(--brand)', color: '#fff' }}
        >
          <Upload size={13} /> Importer CSV
        </button>
      </div>

      {importModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16,
        }}>
          <div className="animate-fadeIn" style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)',
            width: '100%', maxWidth: 560, overflow: 'hidden',
          }}>

            {/* Header */}
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>Importer des employés depuis CSV</div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex' }}>
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Format info */}
              <div style={{
                padding: '12px 14px', borderRadius: 'var(--radius-3)',
                background: 'var(--brand-soft)', border: '1px solid var(--brand)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand)', marginBottom: 6 }}>Format CSV requis :</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--brand)', lineHeight: 1.8 }}>
                  <li>Encodage : UTF-8</li>
                  <li>Séparateur : Point-virgule (;)</li>
                  <li>Colonnes : Matricule, Nom, Prénom, Date de naissance, Lieu de naissance, Sexe, Nombre d'enfants, Statut matrimonial, Service</li>
                  <li>La première ligne doit contenir les en-têtes</li>
                </ul>
              </div>

              {/* File input */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)', display: 'block', marginBottom: 6 }}>
                  Fichier CSV
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  style={{
                    width: '100%', padding: '6px 10px', boxSizing: 'border-box',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
                    background: 'var(--surface)', color: 'var(--fg)', fontSize: 12,
                  }}
                />
                {selectedFile && (
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
                    Fichier sélectionné : {selectedFile.name}
                  </div>
                )}
              </div>

              {/* Import results */}
              {importResults && (
                <div style={{
                  padding: '10px 12px', borderRadius: 'var(--radius-3)',
                  background: importResults.success ? 'var(--success-soft)' : 'var(--danger-soft)',
                  border: `1px solid ${importResults.success ? 'var(--success)' : 'var(--danger)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 13, fontWeight: 600, color: importResults.success ? 'var(--success)' : 'var(--danger)' }}>
                    {importResults.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {importResults.message}
                  </div>
                  {importResults.results && (
                    <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ color: 'var(--fg-muted)' }}>Total : {importResults.results.total} lignes</div>
                      <div style={{ color: 'var(--success)' }}>Succès : {importResults.results.success}</div>
                      <div style={{ color: 'var(--warning)' }}>Doublons : {importResults.results.duplicates}</div>
                      <div style={{ color: 'var(--danger)' }}>Erreurs : {importResults.results.errors.length}</div>
                      {importResults.results.errors.length > 0 && (
                        <details style={{ marginTop: 4 }}>
                          <summary style={{ cursor: 'pointer', fontSize: 11, color: 'var(--fg-muted)' }}>Voir les erreurs détaillées</summary>
                          <ul style={{ margin: '4px 0 0', paddingLeft: 16, maxHeight: 100, overflowY: 'auto' }}>
                            {importResults.results.errors.map((err, i) => (
                              <li key={i} style={{ fontSize: 11, color: 'var(--danger)' }}>{err}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={closeModal}
                  style={{
                    height: 34, padding: '0 14px', borderRadius: 'var(--radius-2)',
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--fg-muted)', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={!selectedFile || loading}
                  style={{
                    ...btnBase, background: 'var(--brand)', color: '#fff',
                    opacity: (!selectedFile || loading) ? 0.5 : 1,
                    cursor: (!selectedFile || loading) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading && <Loader size={13} className="animate-spin" />}
                  Importer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
