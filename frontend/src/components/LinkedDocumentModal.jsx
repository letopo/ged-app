// frontend/src/components/LinkedDocumentModal.jsx
// « Créer un document lié » depuis la visionneuse d'un document validé :
//  - à partir d'un modèle (ex. Bon de commande) → formulaire pré-lié ;
//  - en joignant un fichier (ex. proforma scannée) → nouveau document en brouillon.
// Dans les deux cas le document d'origine est joint en tête du PDF (liasse) et le
// lien est enregistré (Document.linkedDocumentId).
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X, Loader, FileText, Paperclip, Upload as UploadIcon, ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { documentsAPI, templatePermissionsAPI } from '../services/api';
import useTenantSettings from '../hooks/useTenantSettings';
import DocumentScanner from './DocumentScanner';
import VisibilityChoice, { useDocumentVisibility } from './VisibilityChoice';
import { guessDocumentType } from '../utils/scanOcr';

const FILE_TYPE_SUGGESTIONS = ['Proforma', 'Devis', 'Bon de commande', 'Facture', 'Bon de livraison', 'Pièce justificative'];

export default function LinkedDocumentModal({ document: doc, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState('template');
  const [templates, setTemplates] = useState(null);
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('Proforma');
  const [visibility, setVisibility, visibilityContext] = useDocumentVisibility(category.trim());
  const [title, setTitle] = useState('');
  const [attachOriginal, setAttachOriginal] = useState(true);
  const [saving, setSaving] = useState(false);
  const { maxUploadMb } = useTenantSettings();
  // Scanner : { file: null } = caméra en direct, { file } = photo existante à convertir
  const [scan, setScan] = useState(null);
  const [extractedText, setExtractedText] = useState(''); // texte reconnu (OCR)
  const isImage = file && /^image\//.test(file.type);
  const originalIsPdf = doc.fileType === 'application/pdf';

  useEffect(() => {
    templatePermissionsAPI.getMyTemplates()
      .then(res => setTemplates((res.data.data || []).filter(tp => tp.hasAccess !== false).map(tp => tp.templateName)))
      .catch(() => setTemplates([]));
  }, []);

  // Titre proposé : « <type> – <titre d'origine> », tant que l'utilisateur ne l'a pas modifié
  const [titleTouched, setTitleTouched] = useState(false);
  useEffect(() => {
    if (!titleTouched) setTitle(`${category || t('Pièce jointe')} – ${doc.title}`);
  }, [category, doc.title, titleTouched, t]);

  const linkedRef = { id: doc.id, title: doc.title, category: doc.category };

  const openTemplate = (templateName) => {
    onClose();
    navigate('/create-from-template', { state: { templateName, linkedDocument: linkedRef } });
  };

  const uploadFile = async () => {
    if (!file) { toast.error(t('Choisissez un fichier.')); return; }
    if (!title.trim()) { toast.error(t('Le titre est obligatoire.')); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title.trim());
      fd.append('category', category.trim() || 'Pièce justificative');
      fd.append('linkedDocumentId', doc.id);
      fd.append('visibility', visibility);
      if (extractedText) fd.append('extractedText', extractedText);
      if (attachOriginal && originalIsPdf && file.type === 'application/pdf') fd.append('mergeLinked', 'true');
      await documentsAPI.upload(fd);
      toast.success(t('Document créé en brouillon. Cliquez sur « Soumettre » pour lancer sa validation.'), { duration: 6000 });
      onClose();
      navigate('/documents');
    } catch (err) {
      toast.error(err.response?.data?.message || t("Erreur lors de l'envoi du fichier"));
    } finally {
      setSaving(false);
    }
  };

  const canMerge = originalIsPdf && (!file || file.type === 'application/pdf');

  return ReactDOM.createPortal(
    <div className="rn-overlay" role="dialog" aria-modal="true" aria-labelledby="linked-title" style={{ zIndex: 9600 }}>
      <div className="rn-modal rn-editor">
        <div className="rn-editor-head">
          <h2 id="linked-title">{t('Créer un document lié')}</h2>
          <button type="button" onClick={onClose} className="rn-bubble-close" aria-label={t('Fermer')}><X size={16} /></button>
        </div>
        <div className="rn-modal-body">
          <p className="rn-hint" style={{ marginTop: 0 }}>
            {t('À partir de')} <strong style={{ color: 'var(--fg)' }}>{doc.title}</strong>
          </p>

          <div className="ld-tabs">
            <button type="button" className={tab === 'template' ? 'is-active' : ''} onClick={() => setTab('template')}><FileText size={14} /> {t("À partir d'un modèle")}</button>
            <button type="button" className={tab === 'file' ? 'is-active' : ''} onClick={() => setTab('file')}><Paperclip size={14} /> {t('Joindre un fichier')}</button>
          </div>

          {tab === 'template' ? (
            templates === null ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Loader size={18} className="animate-spin" color="var(--brand)" /></div>
            ) : templates.length === 0 ? (
              <p className="rn-hint">{t("Aucun modèle n'est disponible pour votre compte.")}</p>
            ) : (
              <>
                <p className="rn-hint">{t('Le formulaire s’ouvre déjà lié : le document d’origine sera joint en tête du PDF pour que les signataires l’aient sous les yeux.')}</p>
                <div className="ld-templates">
                  {templates.map(name => (
                    <button type="button" key={name} onClick={() => openTemplate(name)} className="ld-template">
                      <FileText size={15} /> {t(name)}
                    </button>
                  ))}
                </div>
              </>
            )
          ) : (
            <>
              <div className="rn-field">
                <span>{t('Fichier')} <em>{t('— PDF ou image')}</em></span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <label className="ld-drop" style={{ flex: 1, minWidth: 0 }}>
                    <input type="file" accept="application/pdf,image/*" style={{ display: 'none' }}
                      onChange={e => { setFile(e.target.files?.[0] || null); setExtractedText(''); }} />
                    <UploadIcon size={16} style={{ flexShrink: 0 }} />
                    <span>{file ? file.name : t('Choisir un fichier…')}</span>
                  </label>
                  <button type="button" className="ld-drop" onClick={() => setScan({ file: null })}
                    style={{ flexShrink: 0, color: 'var(--brand)', borderColor: 'var(--brand)', borderStyle: 'solid', fontWeight: 600 }}>
                    <ScanLine size={16} /> {t('Scanner')}
                  </button>
                </div>
                {isImage && (
                  <button type="button" onClick={() => setScan({ file })}
                    style={{ alignSelf: 'flex-start', marginTop: 6, background: 'none', border: 'none', padding: 0, color: 'var(--brand)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ScanLine size={13} /> {t("C'est une photo ? Recadrez-la et convertissez-la en PDF.")}
                  </button>
                )}
              </div>
              {scan && ReactDOM.createPortal(
                <DocumentScanner initialFile={scan.file} maxUploadMb={maxUploadMb}
                  onClose={() => setScan(null)}
                  onDone={(pdf, _pages, { text } = {}) => {
                    setScan(null);
                    setFile(pdf);
                    setExtractedText(text || '');
                    // Type deviné d'après le texte (Facture, Devis, Proforma…)
                    const guessed = guessDocumentType(text);
                    if (guessed) setCategory(guessed);
                  }} />,
                document.body,
              )}
              <div className="rn-field-row">
                <label className="rn-field">
                  <span>{t('Type de document')}</span>
                  <input list="ld-types" value={category} onChange={e => setCategory(e.target.value)} maxLength={80} />
                  <datalist id="ld-types">{FILE_TYPE_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
                </label>
              </div>
              <label className="rn-field">
                <span>{t('Titre')}</span>
                <input value={title} onChange={e => { setTitle(e.target.value); setTitleTouched(true); }} maxLength={200} />
              </label>
              <VisibilityChoice value={visibility} onChange={setVisibility} context={visibilityContext} />
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: canMerge ? 'var(--fg)' : 'var(--fg-muted)', cursor: canMerge ? 'pointer' : 'default' }}>
                <input type="checkbox" checked={attachOriginal && canMerge} disabled={!canMerge} onChange={e => setAttachOriginal(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--brand)' }} />
                <span>
                  {t('Joindre le document d’origine en tête (liasse)')}
                  {!canMerge && <span style={{ display: 'block', fontSize: 12 }}>{t('Possible seulement si les deux fichiers sont des PDF. Le lien sera tout de même enregistré.')}</span>}
                </span>
              </label>
            </>
          )}
        </div>
        {tab === 'file' && (
          <div className="rn-modal-foot">
            <button type="button" onClick={onClose} className="rn-btn-secondary">{t('Annuler')}</button>
            <button type="button" onClick={uploadFile} disabled={saving || !file} className="rn-btn">
              {saving ? <Loader size={13} className="animate-spin" /> : <UploadIcon size={13} />} {t('Créer le document')}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
