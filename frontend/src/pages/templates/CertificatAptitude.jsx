// frontend/src/pages/templates/CertificatAptitude.jsx
// Certificat d'aptitude : saisie du médecin, puis aperçu A5 paysage identique au
// PDF produit (utils/certificatAptitudePdf.js), sur le modèle du Bon de prise en charge.
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { servicesAPI } from '../../services/api';
import logo from '../../assets/logo-ordre-malte.png';

const input = {
  width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-2)', border: '1.5px solid var(--border)',
  background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const label = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 4 };

// Aperçu du certificat (fond blanc, comme le papier)
const row = { display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 13, color: '#111', margin: '9px 0' };
const dots = { flex: 1, borderBottom: '1px dotted #777', minHeight: 16, color: '#0d2a8c', fontWeight: 700, paddingLeft: 4 };
const box = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 13, height: 13, border: '1px solid #111', fontSize: 10, color: '#0d2a8c', fontWeight: 700 };

const frDate = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

const CertificatAptitude = ({ formData, setFormData }) => {
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));

  useEffect(() => {
    servicesAPI.getAll()
      .then(res => setServices(res.data.data || []))
      .catch(err => console.error('Erreur chargement services:', err));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label><span style={label}>{t('Docteur')}</span>
          <input style={input} value={formData.nom_docteur || ''} maxLength={120} placeholder={t('Nom du docteur')} onChange={e => set('nom_docteur', e.target.value)} />
        </label>
        <label><span style={label}>{t("Noms et prénoms de l'employé")}</span>
          <input style={input} value={formData.nom_employe || ''} maxLength={120} onChange={e => set('nom_employe', e.target.value)} />
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <label style={{ flex: '1 1 240px' }}><span style={label}>{t('Service')}</span>
            <select style={input} value={formData.service || ''} onChange={e => set('service', e.target.value)}>
              <option value="">{t('-- Sélectionner le service --')}</option>
              {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </label>
          <label style={{ flex: '0 1 200px' }}><span style={label}>{t('Date')}</span>
            <input type="date" style={input} value={formData.date_certificat || ''} onChange={e => set('date_certificat', e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {['Apte', 'Inapte'].map(val => (
            <label key={val} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--fg)' }}>
              <input type="radio" name="certificat-declaration" checked={formData.declaration === val} onChange={() => set('declaration', val)} style={{ accentColor: 'var(--brand)' }} />
              {t(val)}
            </label>
          ))}
        </div>
      </div>

      {/* Aperçu A5 paysage */}
      <div style={{ background: '#fff', color: '#111', border: '1px solid #ddd', borderRadius: 4, padding: '18px 22px', aspectRatio: '1.414', maxWidth: 720, width: '100%', margin: '0 auto', boxSizing: 'border-box', fontFamily: 'Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <img src={logo} alt="" style={{ width: '34%', minWidth: 120 }} />
          <div style={{ textAlign: 'right', fontSize: 9, fontWeight: 700, color: '#333', lineHeight: 1.35 }}>
            HÔPITAL SAINT-JEAN DE MALTE<br />BP.: 56 NJOMBE - CAMEROUN<br />Tél.: (237) 697 09 29 92<br />233 21 10 22
          </div>
        </div>
        <div style={{ textAlign: 'center', fontFamily: 'Times New Roman, serif', fontWeight: 700, fontSize: 'clamp(16px, 3.4vw, 24px)', margin: '6px 0 10px' }}>CERTIFICAT D'APTITUDE</div>
        <div style={row}>Je soussigné(e), Docteur <span style={dots}>{formData.nom_docteur}</span></div>
        <div style={row}>Certifie avoir examiné ce jour <span style={dots}>{formData.nom_employe}</span></div>
        <div style={row}>travaillant au service <span style={dots}>{formData.service}</span></div>
        <div style={{ ...row, gap: 12, flexWrap: 'wrap' }}>
          et le (la) déclare :
          {['Apte', 'Inapte'].map(val => (
            <span key={val} style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><span style={box}>{formData.declaration === val ? 'X' : ''}</span>{val}</span>
          ))}
          à son poste de travail.
        </div>
        <div style={{ ...row, marginLeft: '50%' }}>Njombé le <span style={dots}>{frDate(formData.date_certificat)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 13, marginTop: 14, paddingRight: '22%' }}><span>LE MÉDECIN</span></div>
      </div>
    </div>
  );
};

export default CertificatAptitude;
