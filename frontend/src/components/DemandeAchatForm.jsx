// frontend/src/components/DemandeAchatForm.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { demandeAchatAPI, usersAPI, servicesAPI, documentsAPI } from '../services/api';
import { Loader, Send, Save, Trash2, X, FileText, User, ExternalLink, Eye, Upload, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DocumentViewer from './DocumentViewer';
import WorkflowSubmission from './WorkflowSubmission';

const initialFormData = {
  domain: '', domainDescription: '', deliveryDate: '',
  purchaseType: 'Non-Référencé', articleNature: '', requestDescription: '',
  beneficiaryName: '', beneficiaryEmail: '', beneficiaryPhone: '',
  isMagasinOutput: false, linkedDocNumber: '', isForWorks: false,
  nonRefArticles: [{ designation: '', quantity: 1, unitPrice: 0, total: 0 }],
  totalRefValue: 0, totalNonRefValue: 0, supplierId: null,
};

// ── Style constants ──
const inputStyle = {
  width: '100%', height: 34, padding: '0 10px', boxSizing: 'border-box',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
  background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none',
};
const textareaStyle = {
  width: '100%', padding: '8px 10px', boxSizing: 'border-box',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
  background: 'var(--surface)', color: 'var(--fg)', fontSize: 13,
  outline: 'none', resize: 'vertical',
};
const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)', display: 'block', marginBottom: 5 };
const sectionStyle = {
  marginBottom: 16, padding: '16px 18px', background: 'var(--surface-2)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-3)',
};
const sectionTitleStyle = {
  fontSize: 14, fontWeight: 700, color: 'var(--brand)',
  borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 14,
  display: 'flex', alignItems: 'center', gap: 8,
};
const thStyle = {
  padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  color: 'var(--fg-muted)', textTransform: 'uppercase', background: 'var(--surface-2)',
};
const tdStyle = { padding: '4px' };
const btnStyle = (bg, color = '#fff', disabled = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  height: 36, padding: '0 16px', borderRadius: 'var(--radius-2)',
  border: 'none', background: bg, color, fontSize: 13, fontWeight: 500,
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
});

const toggleBtn = (active) => ({
  padding: '4px 14px', borderRadius: 'var(--radius-2)', border: 'none',
  background: active ? 'var(--brand)' : 'var(--surface-3)',
  color: active ? '#fff' : 'var(--fg-muted)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
});

export default function DemandeAchatForm({ demande, onCancel, onSuccess }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [formData, setFormData]         = useState(initialFormData);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [services, setServices]         = useState([]);
  const [demandesTravaux, setDemandesTravaux] = useState([]);
  const [attachedFiles, setAttachedFiles]     = useState([]);
  const [existingFiles, setExistingFiles]     = useState([]);
  const [showDTModal, setShowDTModal]         = useState(false);
  const [isViewingDocument, setIsViewingDocument] = useState(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [savedDemande, setSavedDemande]       = useState(null);

  useEffect(() => {
    loadInitialData();
    if (demande) loadDemandeData();
  }, [demande]);

  const loadInitialData = async () => {
    try {
      const servicesRes = await servicesAPI.getAll();
      setServices(servicesRes.data.data || servicesRes.data || []);
      if (!demande && user) {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        setFormData(prev => ({ ...prev, beneficiaryName: fullName, beneficiaryEmail: user.email || '', beneficiaryPhone: user.phone || '' }));
      }
      try {
        const allDocsRes = await documentsAPI.getAll();
        const allDocs    = allDocsRes.data.data || allDocsRes.data || [];
        setDemandesTravaux(allDocs.filter(doc => {
          const docType = (doc.type || doc.documentType || '').toLowerCase();
          const title   = (doc.title || doc.name || '').toLowerCase();
          return docType.includes('travaux') || title.includes('dt') || title.includes('travaux') || (doc.metadata && doc.metadata.type === 'demande_travaux');
        }));
      } catch { /* ignore */ }
    } catch (err) {
      console.error('Erreur chargement données initiales', err);
      setError(t('Erreur de chargement des données. Vérifiez votre connexion.'));
    }
  };

  const loadDemandeData = () => {
    setFormData({
      domain:             demande.domain || '',
      domainDescription:  demande.domainDescription || '',
      deliveryDate:       demande.deliveryDate || '',
      purchaseType:       demande.purchaseType || 'Non-Référencé',
      articleNature:      demande.articleNature || '',
      requestDescription: demande.requestDescription || '',
      beneficiaryName:    demande.beneficiaryName || '',
      beneficiaryEmail:   demande.beneficiaryEmail || '',
      beneficiaryPhone:   demande.beneficiaryPhone || '',
      isMagasinOutput:    demande.isMagasinOutput || false,
      linkedDocNumber:    demande.linkedDocNumber || '',
      isForWorks:         demande.isForWorks || false,
      nonRefArticles:     demande.nonRefArticles || [{ designation: '', quantity: 1, unitPrice: 0, total: 0 }],
      totalRefValue:      demande.totalRefValue || 0,
      totalNonRefValue:   demande.totalNonRefValue || 0,
      supplierId:         demande.supplierId || null,
    });
    setExistingFiles(demande.attachedDocuments || []);
  };

  const totalNonRefValue = useMemo(() =>
    formData.nonRefArticles.reduce((acc, art) => acc + (art.total || 0), 0),
    [formData.nonRefArticles]
  );

  useEffect(() => { setFormData(prev => ({ ...prev, totalNonRefValue })); }, [totalNonRefValue]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (name === 'isForWorks' && checked === true) setShowDTModal(true);
    else if (name === 'isForWorks' && checked === false) setFormData(prev => ({ ...prev, linkedDocNumber: '' }));
  };

  const handleArticleChange = (index, field, value) => {
    const newArticles = [...formData.nonRefArticles];
    const article     = newArticles[index];
    if (field === 'quantity' || field === 'unitPrice') {
      article[field] = parseFloat(value) || 0;
      article.total  = article.quantity * article.unitPrice;
    } else { article[field] = value; }
    setFormData(prev => ({ ...prev, nonRefArticles: newArticles }));
  };

  const addArticle    = () => setFormData(prev => ({ ...prev, nonRefArticles: [...prev.nonRefArticles, { designation: '', quantity: 1, unitPrice: 0, total: 0 }] }));
  const removeArticle = (i) => setFormData(prev => ({ ...prev, nonRefArticles: prev.nonRefArticles.filter((_, idx) => idx !== i) }));
  const handleFileSelect    = (e) => setAttachedFiles(prev => [...prev, ...Array.from(e.target.files)]);
  const removeFile          = (i) => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i));
  const removeExistingFile  = (i) => setExistingFiles(prev => prev.filter((_, idx) => idx !== i));

  const handleSelectDT = (dt) => {
    setFormData(prev => ({ ...prev, linkedDocNumber: dt.title, domain: dt.metadata?.service || '' }));
    setShowDTModal(false);
  };

  const handleSubmit = async (isDraft = false) => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const fd = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'nonRefArticles') fd.append(key, JSON.stringify(formData[key]));
        else if (typeof formData[key] === 'boolean') fd.append(key, formData[key]);
        else if (formData[key] !== null && formData[key] !== undefined) fd.append(key, formData[key]);
      });
      attachedFiles.forEach(file => fd.append('attachments', file));
      const response = demande ? await demandeAchatAPI.update(demande.id, fd) : await demandeAchatAPI.create(fd);
      const savedData = response.data.data;
      if (isDraft) {
        setSuccess(demande ? t('Demande mise à jour (Brouillon)') : t('Demande créée (Brouillon)'));
        setTimeout(() => onSuccess(), 1500);
      } else {
        setSavedDemande(savedData);
        setShowWorkflowModal(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || t("Erreur lors de l'enregistrement."));
      console.error(err);
    } finally { setLoading(false); }
  };

  const handleWorkflowSuccess = () => { setShowWorkflowModal(false); onSuccess(); };

  const canEdit = !demande || demande.status === 'draft' || user?.role === 'admin' || user?.role === 'achat';

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--surface)', position: 'relative' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 24px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>
            <FileText size={20} color="var(--brand)" />
            {demande ? t("Modifier la Demande d'Achat") : t("Nouvelle Demande d'Achat")}
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex', padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        {error && <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 'var(--radius-2)', fontSize: 13 }}>{error}</div>}
        {success && <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--success-soft)', border: '1px solid var(--success)', color: 'var(--success)', borderRadius: 'var(--radius-2)', fontSize: 13 }}>{success}</div>}

        {/* Informations générales */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>{t('Informations générales')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
            <div>
              <label style={labelStyle}>{t('Domaine ou Direction')} *</label>
              <select name="domain" value={formData.domain} onChange={handleChange} style={inputStyle} required disabled={!canEdit}>
                <option value="">{t('— Sélectionner un service —')}</option>
                {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('Description du domaine')}</label>
              <input type="text" name="domainDescription" value={formData.domainDescription} onChange={handleChange} style={inputStyle} disabled={!canEdit} />
            </div>
            <div>
              <label style={labelStyle}>{t('Date de livraison souhaitée')}</label>
              <input type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleChange} style={inputStyle} disabled={!canEdit} />
            </div>
            <div>
              <label style={labelStyle}>{t("Type d'achat")} *</label>
              <select name="purchaseType" value={formData.purchaseType} onChange={handleChange} style={inputStyle} required disabled={!canEdit}>
                <option value="Non-Référencé">{t('Non-Référencé')}</option>
                <option value="Référencé">{t('Référencé')}</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('Nature article')} *</label>
              <input type="text" name="articleNature" value={formData.articleNature} onChange={handleChange} style={inputStyle} required disabled={!canEdit} />
            </div>
            <div>
              <label style={labelStyle}>{t('Description de la demande')} *</label>
              <textarea name="requestDescription" value={formData.requestDescription} onChange={handleChange} style={{ ...textareaStyle, minHeight: 60 }} rows={2} required disabled={!canEdit} />
            </div>
          </div>
        </div>

        {/* Bénéficiaire */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}><User size={15} /> {t('Informations bénéficiaire')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 20px', marginBottom: 16 }}>
            <div><label style={labelStyle}>{t('Nom')}</label><input type="text" name="beneficiaryName" value={formData.beneficiaryName} onChange={handleChange} style={inputStyle} disabled={!canEdit} /></div>
            <div><label style={labelStyle}>{t('Email')} *</label><input type="email" name="beneficiaryEmail" value={formData.beneficiaryEmail} onChange={handleChange} style={inputStyle} required disabled={!canEdit} /></div>
            <div><label style={labelStyle}>{t('Téléphone')} *</label><input type="tel" name="beneficiaryPhone" value={formData.beneficiaryPhone} onChange={handleChange} style={inputStyle} required disabled={!canEdit} /></div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={labelStyle}>{t('Sortie Magasin')}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" onClick={() => canEdit && setFormData(p => ({ ...p, isMagasinOutput: true }))} style={toggleBtn(formData.isMagasinOutput)} disabled={!canEdit}>{t('Oui')}</button>
                <button type="button" onClick={() => canEdit && setFormData(p => ({ ...p, isMagasinOutput: false }))} style={toggleBtn(!formData.isMagasinOutput)} disabled={!canEdit}>{t('Non')}</button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={labelStyle}>{t('DA pour travaux ?')}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" onClick={() => canEdit && handleChange({ target: { name: 'isForWorks', type: 'checkbox', checked: true } })} style={toggleBtn(formData.isForWorks)} disabled={!canEdit}>{t('Oui')}</button>
                <button type="button" onClick={() => canEdit && handleChange({ target: { name: 'isForWorks', type: 'checkbox', checked: false } })} style={toggleBtn(!formData.isForWorks)} disabled={!canEdit}>{t('Non')}</button>
              </div>
            </div>
            {formData.isForWorks && (
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={labelStyle}>{t('Référence DT')}</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="text" name="linkedDocNumber" value={formData.linkedDocNumber} onChange={handleChange} placeholder={t('Sélectionner une DT')} style={{ ...inputStyle, flex: 1 }} disabled={!canEdit} />
                  {canEdit && (
                    <button type="button" onClick={() => setShowDTModal(true)} style={{ height: 34, width: 34, borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--brand)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ExternalLink size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Articles */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>{t('Articles non référencés')}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>{t('Désignation')}</th>
                  <th style={{ ...thStyle, width: 70 }}>{t('Qté')}</th>
                  <th style={{ ...thStyle, width: 120 }}>{t('P.U. (XAF)')}</th>
                  <th style={{ ...thStyle, width: 120 }}>{t('Total (XAF)')}</th>
                  {canEdit && <th style={{ ...thStyle, width: 36 }}></th>}
                </tr>
              </thead>
              <tbody>
                {formData.nonRefArticles.map((art, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={tdStyle}><input type="text" value={art.designation} onChange={e => canEdit && handleArticleChange(i, 'designation', e.target.value)} style={{ ...inputStyle, height: 30 }} disabled={!canEdit} /></td>
                    <td style={tdStyle}><input type="number" min="1" value={art.quantity} onChange={e => canEdit && handleArticleChange(i, 'quantity', e.target.value)} style={{ ...inputStyle, height: 30 }} disabled={!canEdit} /></td>
                    <td style={tdStyle}><input type="number" min="0" step="0.01" value={art.unitPrice} onChange={e => canEdit && handleArticleChange(i, 'unitPrice', e.target.value)} style={{ ...inputStyle, height: 30 }} disabled={!canEdit} /></td>
                    <td style={tdStyle}><input type="text" value={art.total.toFixed(2)} disabled style={{ ...inputStyle, height: 30, background: 'var(--surface-2)', color: 'var(--fg-muted)' }} /></td>
                    {canEdit && (
                      <td style={tdStyle}>
                        <button type="button" onClick={() => removeArticle(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', padding: 4 }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canEdit && (
            <button type="button" onClick={addArticle} style={{ marginTop: 8, height: 28, padding: '0 10px', borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--success)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
              + {t('Ajouter un article')}
            </button>
          )}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 2 }}>{t('Total Non Référencé')}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--brand)' }}>{totalNonRefValue.toFixed(2)} XAF</div>
            </div>
          </div>
        </div>

        {/* Pièces jointes */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>{t('Pièces jointes')}</div>
          {canEdit && (
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-3)',
              cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 13, marginBottom: 12,
            }}>
              <Upload size={16} /> {t('Ajouter des fichiers (PDF, Images, Excel)')}
              <input type="file" onChange={handleFileSelect} accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls" multiple style={{ display: 'none' }} />
            </label>
          )}
          {existingFiles.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 6 }}>{t('Fichiers existants')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {existingFiles.map((file, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={14} color="var(--brand)" />
                      <span style={{ fontSize: 12, color: 'var(--fg)' }}>{file.originalName}</span>
                      <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${file.path}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)', display: 'flex', padding: 3 }}><Download size={14} /></a>
                      {canEdit && <button type="button" onClick={() => removeExistingFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', padding: 3 }}><Trash2 size={14} /></button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {attachedFiles.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 6 }}>{t('Nouveaux fichiers')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {attachedFiles.map((file, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--brand-soft)', border: '1px solid var(--brand)', borderRadius: 'var(--radius-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={14} color="var(--brand)" />
                      <span style={{ fontSize: 12, color: 'var(--fg)' }}>{file.name}</span>
                      <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', padding: 3 }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {canEdit && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <button onClick={onCancel} style={{ height: 36, padding: '0 16px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {t('Annuler')}
            </button>
            <button onClick={() => handleSubmit(true)} disabled={loading} style={btnStyle('var(--fg-muted)', '#fff', loading)}>
              {loading && <Loader size={13} className="animate-spin" />}
              <Save size={13} /> {t('Enregistrer en brouillon')}
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={loading || !formData.domain || !formData.requestDescription}
              style={btnStyle('var(--brand)', '#fff', loading || !formData.domain || !formData.requestDescription)}
            >
              {loading ? <><Loader size={13} className="animate-spin" /> {t('Soumission…')}</> : <><Send size={13} /> {t('Soumettre')}</>}
            </button>
          </div>
        )}

        {/* DT selection modal */}
        {showDTModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16 }}>
            <div className="animate-fadeIn" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 680, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{t('Sélectionner une DT')}</div>
                <button onClick={() => setShowDTModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex' }}><X size={16} /></button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
                {demandesTravaux.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--fg-muted)', fontSize: 13 }}>{t('Aucune Demande de Travaux disponible.')}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {demandesTravaux.map(dt => (
                      <div key={dt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', background: 'var(--surface-2)' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{dt.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{t('Service : {{service}}', { service: dt.metadata?.service || 'N/A' })} · {new Date(dt.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button type="button" onClick={() => setIsViewingDocument(dt)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex', padding: 4 }}><Eye size={15} /></button>
                          <button type="button" onClick={() => handleSelectDT(dt)} style={{ height: 30, padding: '0 12px', borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--success)', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{t('Sélectionner')}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isViewingDocument && <DocumentViewer document={isViewingDocument} onClose={() => setIsViewingDocument(null)} showActions={false} />}

        {showWorkflowModal && savedDemande && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
            <WorkflowSubmission
              document={{ ...savedDemande, title: savedDemande.daNumber ? `DA ${savedDemande.daNumber}` : t("Nouvelle Demande d'Achat"), filename: t("Demande d'Achat") }}
              onSuccess={handleWorkflowSuccess}
              onCancel={() => setShowWorkflowModal(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
