// frontend/src/components/PdfPreviewModal.jsx
// Aperçu d'un PDF généré à la volée (blob) dans la visionneuse de la GED, en
// fenêtre par-dessus la page : on ne quitte pas la page et aucun nouvel onglet
// ne s'ouvre (demande du 10/11/2026). Même moteur que la visionneuse des
// documents (pdf.js, fonctionne aussi dans l'application Android).
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Download, Loader } from 'lucide-react';
import PdfCanvasViewer from './PdfCanvasViewer';

/**
 * @param {() => Promise<Blob>} load   fonction qui récupère le PDF (ex. appel API en blob)
 * @param {string} title
 * @param {string} fileName            nom proposé au téléchargement
 */
export default function PdfPreviewModal({ load, title, fileName = 'apercu.pdf', onClose }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    let objectUrl = null;
    load()
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob], { type: 'application/pdf' }));
        if (alive) setUrl(objectUrl);
      })
      .catch(async (e) => {
        // Erreur renvoyée en blob (responseType: 'blob') : on lit le message JSON
        let msg = e.response?.data?.message;
        if (!msg && e.response?.data instanceof Blob) { try { msg = JSON.parse(await e.response.data.text()).message; } catch { /* ignore */ } }
        if (alive) setError(msg || t('Aperçu impossible.'));
      });
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const download = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
  };
  const iconBtn = { width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,.25)', background: 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };

  return ReactDOM.createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} style={{ position: 'fixed', inset: 0, zIndex: 9600, background: '#2b2e31', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', paddingTop: 'max(10px, env(safe-area-inset-top))', background: '#1f2224', color: '#fff', flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {url && <button type="button" onClick={download} style={iconBtn} aria-label={t('Télécharger')} title={t('Télécharger')}><Download size={17} /></button>}
        <button type="button" onClick={onClose} style={iconBtn} aria-label={t('Fermer')} title={t('Fermer')}><X size={18} /></button>
      </div>
      {error ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eee', fontSize: 14, padding: 20, textAlign: 'center' }}>{error}</div>
      ) : url ? (
        <PdfCanvasViewer url={url} onDownload={download} />
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#ddd', fontSize: 13 }}>
          <Loader size={24} className="animate-spin" /> {t('Préparation de l’aperçu…')}
        </div>
      )}
    </div>,
    document.body,
  );
}
