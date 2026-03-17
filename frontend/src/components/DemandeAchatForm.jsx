// frontend/src/components/DemandeAchatForm.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { demandeAchatAPI, usersAPI, servicesAPI, documentsAPI } from '../services/api';
import { Loader, Send, Save, Trash2, X, FileText, User, ExternalLink, Eye, Upload, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DocumentViewer from './DocumentViewer';
// 1. IMPORT DU COMPOSANT DE SOUMISSION
import WorkflowSubmission from './WorkflowSubmission';

const initialFormData = {
  domain: '',
  domainDescription: '',
  deliveryDate: '',
  purchaseType: 'Non-Référencé',
  articleNature: '',
  requestDescription: '',
  beneficiaryName: '',
  beneficiaryEmail: '',
  beneficiaryPhone: '',
  isMagasinOutput: false,
  linkedDocNumber: '',
  isForWorks: false,
  nonRefArticles: [{ designation: '', quantity: 1, unitPrice: 0, total: 0 }],
  totalRefValue: 0,
  totalNonRefValue: 0,
  supplierId: null,
};

const DemandeAchatForm = ({ demande, onCancel, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // États pour les données
  const [services, setServices] = useState([]);
  const [demandesTravaux, setDemandesTravaux] = useState([]);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  
  // États UI
  const [showDTModal, setShowDTModal] = useState(false);
  const [isViewingDocument, setIsViewingDocument] = useState(null);

  // 2. NOUVEAUX ÉTATS POUR LE WORKFLOW
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [savedDemande, setSavedDemande] = useState(null);

  useEffect(() => {
    loadInitialData();
    if (demande) {
      loadDemandeData();
    }
  }, [demande]);

  const loadInitialData = async () => {
    try {
      const servicesRes = await servicesAPI.getAll();
      const servicesList = servicesRes.data.data || servicesRes.data || [];
      setServices(servicesList);
  
      if (!demande && user) {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        setFormData(prev => ({
          ...prev,
          beneficiaryName: fullName || '',
          beneficiaryEmail: user.email || '',
          beneficiaryPhone: user.phone || ''
        }));
      }
  
      try {
        const allDocsRes = await documentsAPI.getAll();
        const allDocs = allDocsRes.data.data || allDocsRes.data || [];
        const dtDocuments = allDocs.filter(doc => {
          const docType = (doc.type || doc.documentType || '').toLowerCase();
          const title = (doc.title || doc.name || '').toLowerCase();
          return docType.includes('travaux') || 
                 title.includes('dt') || 
                 title.includes('travaux') ||
                 (doc.metadata && doc.metadata.type === 'demande_travaux');
        });
        setDemandesTravaux(dtDocuments);
      } catch (err) {
        console.log('Erreur chargement DT:', err.message);
      }
  
    } catch (err) {
      console.error("Erreur chargement données initiales", err);
      setError("Erreur de chargement des données. Vérifiez votre connexion.");
    }
  };

  const loadDemandeData = () => {
    setFormData({
      domain: demande.domain || '',
      domainDescription: demande.domainDescription || '',
      deliveryDate: demande.deliveryDate || '',
      purchaseType: demande.purchaseType || 'Non-Référencé',
      articleNature: demande.articleNature || '',
      requestDescription: demande.requestDescription || '',
      beneficiaryName: demande.beneficiaryName || '',
      beneficiaryEmail: demande.beneficiaryEmail || '',
      beneficiaryPhone: demande.beneficiaryPhone || '',
      isMagasinOutput: demande.isMagasinOutput || false,
      linkedDocNumber: demande.linkedDocNumber || '',
      isForWorks: demande.isForWorks || false,
      nonRefArticles: demande.nonRefArticles || [{ designation: '', quantity: 1, unitPrice: 0, total: 0 }],
      totalRefValue: demande.totalRefValue || 0,
      totalNonRefValue: demande.totalNonRefValue || 0,
      supplierId: demande.supplierId || null,
    });
    setExistingFiles(demande.attachedDocuments || []);
  };

  const totalNonRefValue = useMemo(() => {
    return formData.nonRefArticles.reduce((acc, article) => acc + (article.total || 0), 0);
  }, [formData.nonRefArticles]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, totalNonRefValue }));
  }, [totalNonRefValue]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    
    if (name === 'isForWorks' && checked === true) {
      setShowDTModal(true);
    } else if (name === 'isForWorks' && checked === false) {
      setFormData(prev => ({ ...prev, linkedDocNumber: '' }));
    }
  };

  const handleArticleChange = (index, field, value) => {
    const newArticles = [...formData.nonRefArticles];
    const article = newArticles[index];

    if (field === 'quantity' || field === 'unitPrice') {
      const numValue = parseFloat(value) || 0;
      article[field] = numValue;
      article.total = article.quantity * article.unitPrice;
    } else {
      article[field] = value;
    }

    setFormData(prev => ({ ...prev, nonRefArticles: newArticles }));
  };

  const addArticle = () => {
    setFormData(prev => ({
      ...prev,
      nonRefArticles: [...prev.nonRefArticles, { designation: '', quantity: 1, unitPrice: 0, total: 0 }]
    }));
  };

  const removeArticle = (index) => {
    setFormData(prev => ({
      ...prev,
      nonRefArticles: prev.nonRefArticles.filter((_, i) => i !== index)
    }));
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingFile = (index) => {
    setExistingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectDT = (dt) => {
    setFormData(prev => ({ 
      ...prev, 
      linkedDocNumber: dt.title,
      domain: dt.metadata.service || '',
    }));
    setShowDTModal(false);
  };

  // 3. LOGIQUE DE SOUMISSION MODIFIÉE
  const handleSubmit = async (isDraft = false) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      
      // Ajouter les champs du formulaire
      Object.keys(formData).forEach(key => {
        if (key === 'nonRefArticles') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else if (typeof formData[key] === 'boolean') {
          formDataToSend.append(key, formData[key]);
        } else if (formData[key] !== null && formData[key] !== undefined) {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Ajouter les fichiers
      attachedFiles.forEach(file => {
        formDataToSend.append('attachments', file);
      });

      let response;
      if (demande) {
        response = await demandeAchatAPI.update(demande.id, formDataToSend);
      } else {
        response = await demandeAchatAPI.create(formDataToSend);
      }

      const savedData = response.data.data;

      // Si c'est un brouillon, on termine ici
      if (isDraft) {
        setSuccess(demande ? 'Demande mise à jour avec succès (Brouillon)' : `Demande créée avec succès (Brouillon).`);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        // Si c'est une soumission, on ouvre la modale de workflow
        setSavedDemande(savedData);
        setShowWorkflowModal(true);
      }

    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement de la Demande d\'Achat.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Callback quand le workflow est soumis avec succès
  const handleWorkflowSuccess = () => {
    setShowWorkflowModal(false);
    onSuccess(); // Retour à la liste
  };

  const inputStyle = "w-full p-2 border border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text rounded-md focus:ring-blue-500 focus:border-blue-500";
  const labelStyle = "block text-sm font-medium text-gray-700 dark:text-dark-text mb-1";
  const sectionTitleStyle = "text-lg font-bold text-blue-800 dark:text-blue-400 border-b pb-2 mb-4 border-blue-200 dark:border-blue-700/50 flex items-center gap-2";

  const canEdit = !demande || demande.status === 'draft' || user?.role === 'admin' || user?.role === 'achat';

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-dark-surface relative">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text flex items-center gap-3">
            <FileText className="w-7 h-7 text-blue-600"/> 
            {demande ? 'Modifier la Demande d\'Achat' : 'Nouvelle Demande d\'Achat'}
          </h1>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}
        
        {success && (
          <div className="p-3 mb-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 rounded-lg">
            {success}
          </div>
        )}

        {/* ... (TOUT LE CODE DU FORMULAIRE RESTE IDENTIQUE JUSQU'AUX BOUTONS D'ACTION) ... */}

        {/* Informations générales */}
        <div className="space-y-6 mb-8 p-6 bg-gray-50 dark:bg-dark-bg rounded-lg">
          <h2 className={sectionTitleStyle}>Informations générales</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}>Domaine ou Direction*</label>
              <select 
                name="domain" 
                value={formData.domain} 
                onChange={handleChange} 
                className={inputStyle} 
                required
                disabled={!canEdit}
              >
                <option value="">-- Sélectionner un Service --</option>
                {services.length > 0 ? (
                  services.map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Chargement des services...</option>
                )}
              </select>
            </div>

            <div>
              <label className={labelStyle}>Description du Domaine</label>
              <input 
                type="text" 
                name="domainDescription" 
                value={formData.domainDescription} 
                onChange={handleChange} 
                className={inputStyle}
                disabled={!canEdit}
              />
            </div>

            <div>
              <label className={labelStyle}>Date de livraison souhaitée</label>
              <input 
                type="date" 
                name="deliveryDate" 
                value={formData.deliveryDate} 
                onChange={handleChange} 
                className={inputStyle}
                disabled={!canEdit}
              />
            </div>

            <div>
              <label className={labelStyle}>Type d'achat*</label>
              <select 
                name="purchaseType" 
                value={formData.purchaseType} 
                onChange={handleChange} 
                className={inputStyle} 
                required
                disabled={!canEdit}
              >
                <option value="Non-Référencé">Non-Référencé</option>
                <option value="Référencé">Référencé</option>
              </select>
            </div>

            <div>
              <label className={labelStyle}>Nature article*</label>
              <input 
                type="text" 
                name="articleNature" 
                value={formData.articleNature} 
                onChange={handleChange} 
                className={inputStyle} 
                required
                disabled={!canEdit}
              />
            </div>

            <div>
              <label className={labelStyle}>Description de la demande*</label>
              <textarea 
                name="requestDescription" 
                value={formData.requestDescription} 
                onChange={handleChange} 
                className={inputStyle} 
                rows="2" 
                required
                disabled={!canEdit}
              ></textarea>
            </div>
          </div>
        </div>

        {/* Informations bénéficiaire */}
        <div className="space-y-6 mb-8 p-6 bg-gray-50 dark:bg-dark-bg rounded-lg">
          <h2 className={sectionTitleStyle}><User /> Informations bénéficiaire</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={labelStyle}>Nom</label>
              <input 
                type="text" 
                name="beneficiaryName" 
                value={formData.beneficiaryName} 
                onChange={handleChange} 
                className={inputStyle}
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className={labelStyle}>Email*</label>
              <input 
                type="email" 
                name="beneficiaryEmail" 
                value={formData.beneficiaryEmail} 
                onChange={handleChange} 
                className={inputStyle} 
                required
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className={labelStyle}>Téléphone*</label>
              <input 
                type="tel" 
                name="beneficiaryPhone" 
                value={formData.beneficiaryPhone} 
                onChange={handleChange} 
                className={inputStyle} 
                required
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-8">
            <div className="flex items-center gap-4">
              <span className={labelStyle}>Sortie Magasin</span>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => canEdit && setFormData(prev => ({ ...prev, isMagasinOutput: true }))} 
                  className={`px-4 py-1 rounded-md text-sm font-semibold transition ${formData.isMagasinOutput ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'} ${!canEdit && 'opacity-50 cursor-not-allowed'}`}
                  disabled={!canEdit}
                >Oui</button>
                <button 
                  type="button" 
                  onClick={() => canEdit && setFormData(prev => ({ ...prev, isMagasinOutput: false }))} 
                  className={`px-4 py-1 rounded-md text-sm font-semibold transition ${!formData.isMagasinOutput ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'} ${!canEdit && 'opacity-50 cursor-not-allowed'}`}
                  disabled={!canEdit}
                >Non</button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className={labelStyle}>DA pour travaux?</span>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => canEdit && handleChange({ target: { name: 'isForWorks', type: 'checkbox', checked: true } })}
                  className={`px-4 py-1 rounded-md text-sm font-semibold transition ${formData.isForWorks ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'} ${!canEdit && 'opacity-50 cursor-not-allowed'}`}
                  disabled={!canEdit}
                >Oui</button>
                <button 
                  type="button" 
                  onClick={() => canEdit && handleChange({ target: { name: 'isForWorks', type: 'checkbox', checked: false } })}
                  className={`px-4 py-1 rounded-md text-sm font-semibold transition ${!formData.isForWorks ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'} ${!canEdit && 'opacity-50 cursor-not-allowed'}`}
                  disabled={!canEdit}
                >Non</button>
              </div>
            </div>

            {formData.isForWorks && (
              <div className="flex-1">
                <label className={labelStyle}>Référence DT</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    name="linkedDocNumber" 
                    value={formData.linkedDocNumber} 
                    onChange={handleChange} 
                    placeholder="Sélectionner une DT"
                    className={inputStyle}
                    disabled={!canEdit}
                  />
                  {canEdit && (
                    <button 
                      type="button" 
                      onClick={() => setShowDTModal(true)} 
                      className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <ExternalLink size={20} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Articles */}
        <div className="space-y-4 mb-8 p-6 bg-gray-50 dark:bg-dark-bg rounded-lg">
          <h2 className={sectionTitleStyle}>Articles non référencés</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Désignation</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-20">Qté</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-32">P.U. (XAF)</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-32">Total (XAF)</th>
                  {canEdit && <th className="px-3 py-2 w-10"></th>}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-gray-700">
                {formData.nonRefArticles.map((article, index) => (
                  <tr key={index}>
                    <td className="p-1">
                      <input 
                        type="text" 
                        value={article.designation} 
                        onChange={(e) => canEdit && handleArticleChange(index, 'designation', e.target.value)} 
                        className={inputStyle}
                        disabled={!canEdit}
                      />
                    </td>
                    <td className="p-1">
                      <input 
                        type="number" 
                        min="1" 
                        value={article.quantity} 
                        onChange={(e) => canEdit && handleArticleChange(index, 'quantity', e.target.value)} 
                        className={inputStyle}
                        disabled={!canEdit}
                      />
                    </td>
                    <td className="p-1">
                      <input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={article.unitPrice} 
                        onChange={(e) => canEdit && handleArticleChange(index, 'unitPrice', e.target.value)} 
                        className={inputStyle}
                        disabled={!canEdit}
                      />
                    </td>
                    <td className="p-1">
                      <input 
                        type="text" 
                        value={article.total.toFixed(2)} 
                        disabled 
                        className={`${inputStyle} bg-gray-100 dark:bg-gray-700/50`}
                      />
                    </td>
                    {canEdit && (
                      <td className="p-1 text-center">
                        <button 
                          type="button" 
                          onClick={() => removeArticle(index)} 
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canEdit && (
            <button 
              type="button" 
              onClick={addArticle} 
              className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600"
            >
              + Ajouter un article
            </button>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Non Référencé</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {totalNonRefValue.toFixed(2)} XAF
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pièces jointes */}
        <div className="space-y-4 mb-8 p-6 bg-gray-50 dark:bg-dark-bg rounded-lg">
          <h2 className={sectionTitleStyle}>Pièces jointes</h2>

          {canEdit && (
            <div>
              <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition">
                <Upload size={20} />
                <span>Ajouter des fichiers (PDF, Images, Excel)</span>
                <input 
                  type="file" 
                  onChange={handleFileSelect} 
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                  multiple
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Fichiers existants */}
          {existingFiles.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fichiers existants</p>
              <div className="space-y-2">
                {existingFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-dark-surface rounded border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-blue-600" />
                      <span className="text-sm">{file.originalName}</span>
                      <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <div className="flex gap-2">
                      <a 
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${file.path}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1 text-blue-600 hover:text-blue-800"
                      >
                        <Download size={18} />
                      </a>
                      {canEdit && (
                        <button 
                          type="button" 
                          onClick={() => removeExistingFile(index)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nouveaux fichiers */}
          {attachedFiles.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nouveaux fichiers</p>
              <div className="space-y-2">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-blue-600" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeFile(index)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-dark-border">
            <button 
              onClick={onCancel}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-semibold"
            >
              Annuler
            </button>
            <button 
              onClick={() => handleSubmit(true)} 
              disabled={loading} 
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader className="animate-spin w-5 h-5" />} 
              <Save size={18} /> Enregistrer en Brouillon
            </button>
            <button 
              onClick={() => handleSubmit(false)} 
              disabled={loading || !formData.domain || !formData.requestDescription} 
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin w-5 h-5" /> Soumission...
                </>
              ) : (
                <>
                  <Send size={18} /> Soumettre
                </>
              )}
            </button>
          </div>
        )}

        {/* Modal DT */}
        {showDTModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Sélectionner une DT</h2>
                <button onClick={() => setShowDTModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <div className="overflow-y-auto flex-1 p-6">
                {demandesTravaux.length === 0 ? (
                  <p className="text-center text-gray-500">Aucune Demande de Travaux disponible.</p>
                ) : (
                  <div className="space-y-4">
                    {demandesTravaux.map(dt => (
                      <div key={dt.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/10">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-dark-text">{dt.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Service: {dt.metadata?.service || 'N/A'} - {new Date(dt.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button" 
                            onClick={() => setIsViewingDocument(dt)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                          >
                            <Eye size={20} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleSelectDT(dt)} 
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                          >
                            Sélectionner
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Viewer DT */}
        {isViewingDocument && (
          <DocumentViewer 
            document={isViewingDocument} 
            onClose={() => setIsViewingDocument(null)} 
            showActions={false}
          />
        )}
        
        {/* 4. MODALE DE SOUMISSION WORKFLOW */}
        {showWorkflowModal && savedDemande && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
            <WorkflowSubmission
              document={{
                ...savedDemande,
                title: savedDemande.daNumber ? `DA ${savedDemande.daNumber}` : 'Nouvelle Demande d\'Achat',
                filename: 'Demande d\'Achat'
              }}
              onSuccess={handleWorkflowSuccess}
              onCancel={() => setShowWorkflowModal(false)}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default DemandeAchatForm;