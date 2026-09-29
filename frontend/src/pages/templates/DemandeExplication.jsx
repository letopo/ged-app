// frontend/src/pages/templates/DemandeExplication.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { servicesAPI } from '../../services/api';
import logo from '../../assets/logo-ordre-malte.png';
import SignatureFrame from '../../components/SignatureFrame';

const inputStyle = {
  width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-2)',
  border: '1.5px solid var(--border)', background: 'var(--surface)',
  color: 'var(--fg)', fontSize: 13, outline: 'none',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 4 };

// Rend le corps libre en React (jamais de HTML brut) : les lignes vides séparent
// les paragraphes, une ligne commençant par "- " devient un item de liste à
// puces, et **texte** devient du gras. Pas de dépendance à un éditeur riche.
function renderBoldSegments(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part ? <React.Fragment key={i}>{part}</React.Fragment> : null;
  });
}

function renderFormattedBody(text) {
  if (!text) return null;
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs.map((para, pi) => {
    const lines = para.split('\n').filter(l => l.trim() !== '');
    const isList = lines.length > 0 && lines.every(l => l.trim().startsWith('- '));
    if (isList) {
      return (
        <ul key={pi} style={{ margin: '0 0 14px', paddingLeft: 22 }}>
          {lines.map((l, li) => (
            <li key={li} style={{ marginBottom: 4 }}>{renderBoldSegments(l.trim().slice(2))}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={pi} style={{ marginBottom: 14 }}>
        {para.split('\n').map((l, li, arr) => (
          <React.Fragment key={li}>
            {renderBoldSegments(l)}
            {li < arr.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

const DemandeExplication = ({ formData, setFormData, pdfContainerRef }) => {
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const corpsRef = useRef(null);

  useEffect(() => {
    servicesAPI.getAll()
      .then(res => setServices(res.data?.data || res.data?.services || []))
      .catch(() => setServices([]));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Applique gras/liste sur la sélection courante de la zone de texte libre.
  const applyFormatting = (mode) => {
    const el = corpsRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end);

    let next, cursorStart, cursorEnd;
    if (mode === 'bold') {
      const inner = selected || t('texte');
      const before = value.slice(0, start);
      const after = value.slice(end);
      next = `${before}**${inner}**${after}`;
      cursorStart = start + 2;
      cursorEnd = cursorStart + inner.length;
    } else {
      // Liste à puces : préfixe chaque ligne sélectionnée (ou la ligne courante) par "- ".
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = end === start ? (value.indexOf('\n', start) === -1 ? value.length : value.indexOf('\n', start)) : end;
      const block = value.slice(lineStart, lineEnd);
      const formatted = block.split('\n').map(l => (l.startsWith('- ') ? l : `- ${l}`)).join('\n');
      next = value.slice(0, lineStart) + formatted + value.slice(lineEnd);
      cursorStart = lineStart;
      cursorEnd = lineStart + formatted.length;
    }

    setFormData(prev => ({ ...prev, corps: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const toolbarBtnStyle = {
    padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
    background: 'var(--surface)', color: 'var(--fg)',
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Formulaire de saisie */}
      <div className="not-printable" style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-3)', padding: 24, marginBottom: 24,
        boxShadow: 'var(--shadow-1)',
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 16, marginTop: 0 }}>{t('Remplir les informations')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>👤 {t('Nom et Prénom(s)')} *</label>
            <input type="text" name="noms_prenoms" value={formData.noms_prenoms || ''} onChange={handleChange} placeholder={t('Ex: SENGUE Hervu Chimelle')} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>🏢 {t('Service')} *</label>
            <select name="service" value={formData.service || ''} onChange={handleChange} style={inputStyle} required>
              <option value="">{t('Sélectionner...')}</option>
              {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>📅 {t('Lieu et date')}</label>
            <input type="text" name="date_lieu" value={formData.date_lieu || ''} onChange={handleChange} style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>📝 {t('Corps de la demande')} *</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <button type="button" onClick={() => applyFormatting('bold')} style={toolbarBtnStyle} title={t('Gras')}>
              <strong>B</strong>
            </button>
            <button type="button" onClick={() => applyFormatting('list')} style={toolbarBtnStyle} title={t('Liste à puces')}>
              • {t('Liste')}
            </button>
          </div>
          <textarea
            ref={corpsRef}
            name="corps"
            value={formData.corps || ''}
            onChange={handleChange}
            rows={10}
            placeholder={t("Rédigez librement le contenu de la demande d'explication...")}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
            required
          />
          <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 4 }}>
            {t('Astuce : une ligne vide sépare les paragraphes. Sélectionnez du texte puis cliquez sur un bouton pour le mettre en forme.')}
          </p>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>📋 {t('Copie — liste complète (une entrée par ligne, ex: DA)')}</label>
          <textarea
            name="copie"
            value={formData.copie || ''}
            onChange={handleChange}
            rows={3}
            placeholder={t('DA\nDS\nRH')}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
      </div>

      {/* Aperçu PDF */}
      <div ref={pdfContainerRef} style={{ background: '#ffffff', position: 'relative', width: '210mm', minHeight: '297mm', padding: '18mm 18mm 20mm 18mm', boxSizing: 'border-box', color: '#000000' }}>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <img src={logo} alt={t('Logo Ordre de Malte')} style={{ height: 64, objectFit: 'contain' }} />
          <p style={{ fontSize: 12, margin: 0 }}>{formData.date_lieu || ''}</p>
        </div>
        {formData.service && (
          <p style={{ fontSize: 11, color: '#4b5563', textAlign: 'right', margin: '0 0 24px' }}>{t('Service')} : {formData.service}</p>
        )}

        {/* Titre */}
        <div style={{ textAlign: 'center', marginBottom: 32, marginTop: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, textDecoration: 'underline', margin: 0 }}>{t("DEMANDE D'EXPLICATION")}</h1>
        </div>

        {/* Destinataire */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{formData.noms_prenoms || '_____________________________'}</p>
        </div>

        {/* Corps libre */}
        <div style={{ fontSize: 13, lineHeight: 1.8, minHeight: 220 }}>
          {formData.corps
            ? renderFormattedBody(formData.corps)
            : <p style={{ color: '#9ca3af' }}>{t("Le contenu de la demande apparaîtra ici...")}</p>}
        </div>

        {/* Signataire + Copie */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 48 }}>
          <div style={{ fontSize: 12 }}>
            <p style={{ fontWeight: 700, margin: '0 0 6px' }}>{t('Copie')} :</p>
            {(formData.copie || '').split('\n').filter(l => l.trim()).map((l, i) => (
              <p key={i} style={{ margin: '2px 0' }}>- {l.trim()}</p>
            ))}
          </div>
          <div style={{ textAlign: 'right', width: 220 }}>
            <p style={{ fontSize: 13, marginBottom: 12 }}>{t('Le Directeur Général')}</p>
            <SignatureFrame label="" signatureUrl={null} stampUrl={null} zoneIndex={1} height="96px" />
          </div>
        </div>

        {/* Pied de page */}
        <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, padding: '8px 32px 0', textAlign: 'center', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: 9, color: '#6b7280', margin: '2px 0' }}>{t('Hôpital Saint-Jean de Malte — Tél : {{tel}} — e-mail : {{email}}', { tel: '00 (237)6 57 56 91 03', email: 'hopital.cameroun@ordredemaltefrance.org' })}</p>
          <p style={{ fontSize: 9, color: '#6b7280', margin: '2px 0' }}>{t("Dépendant des œuvres Hospitalières Françaises de l'ordre de malte, association BP 56 – Njombé-Cameroun reconnue d'utilité publique")}</p>
          <p style={{ fontSize: 9, color: '#6b7280', margin: '2px 0' }}>{t('en partenariat avec le Ministère de la Santé Publique, et avec les plantations du groupe PHP')}</p>
        </div>
      </div>
    </div>
  );
};

export default DemandeExplication;
