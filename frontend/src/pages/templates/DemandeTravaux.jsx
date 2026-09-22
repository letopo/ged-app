// frontend/src/pages/templates/DemandeTravaux.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import logo from '../../assets/logo-ordre-malte.png';
import { useAuth } from '../../contexts/AuthContext';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';

const DemandeTravaux = ({ formData, setFormData, pdfContainerRef }) => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    return (
        <div ref={pdfContainerRef} style={{ background: '#ffffff', padding: 48, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', margin: '0 auto', width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <img src={logo} alt="Logo" style={{ height: 80 }} />
                <div style={{ textAlign: 'right' }}>
                    <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>HÔPITAL SAINT JEAN DE MALTE</h1>
                    <p style={{ fontSize: 13, margin: '4px 0 0' }}>{t('Njombé - Cameroun')}</p>
                </div>
            </div>

            <div style={{ borderTop: '2px solid #1f2937', borderBottom: '2px solid #1f2937', padding: '12px 0', marginBottom: 32, textAlign: 'center' }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t('DEMANDE DE TRAVAUX')}</h2>
            </div>

            <div style={{ marginBottom: 24, fontSize: 13 }}>
                {[['date_demande','Date de la demande'], ['service','Service demandeur'], ['demandeur','Demandeur']].map(([name, label]) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 12 }}>
                        <span style={{ fontWeight: 600, width: 180 }}>{t(label)} :</span>
                        <div style={{ flex: 1 }}>
                            <input name={name} value={formData[name] || ''} onChange={handleChange} className="not-printable" style={{ width: '100%', borderBottom: '1px solid #9ca3af', outline: 'none', padding: '0 8px', fontSize: 13 }} />
                            <div className="print-only static-field">{formData[name] || ' '}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, borderBottom: '1px solid #9ca3af', paddingBottom: 4 }}>{t('Type de demande :')}</h3>
                <div style={{ display: 'flex', gap: 32, fontSize: 13 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" name="mg" checked={formData.mg || false} onChange={handleChange} style={{ width: 16, height: 16 }} />
                        <span>{t('Moyens Généraux (MG)')}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" name="biomedical" checked={formData.biomedical || false} onChange={handleChange} style={{ width: 16, height: 16 }} />
                        <span>{t('Biomédical')}</span>
                    </label>
                </div>
            </div>

            <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, borderBottom: '1px solid #9ca3af', paddingBottom: 4 }}>{t('Description des travaux demandés :')}</h3>
                <div>
                    <textarea name="description_travaux" value={formData.description_travaux || ''} onChange={handleChange} className="not-printable" style={{ width: '100%', border: '1px solid #9ca3af', padding: 16, minHeight: 200, fontSize: 13, outline: 'none', resize: 'vertical' }} />
                    <div className="print-only" style={{ border: '1px solid #9ca3af', padding: 16, minHeight: 200, fontSize: 13, whiteSpace: 'pre-wrap' }}>{formData.description_travaux || t('Aucune description fournie')}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, marginTop: 64 }}>
                <SignatureFrame label={t('Demandeur')} signatureUrl={getImageUrl(user?.signaturePath)} stampUrl={getImageUrl(user?.stampPath)} zoneIndex={1} />
                <SignatureFrame label={t('Technicien')} signatureUrl={null} stampUrl={null} zoneIndex={2} />
                <SignatureFrame label={t('Validation Finale')} signatureUrl={null} stampUrl={null} zoneIndex={3} />
            </div>

            <div className="not-printable" style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #d1d5db', fontSize: 10, color: 'var(--fg-muted)', textAlign: 'center' }}>
                {t('Document généré le {{date}}', { date: new Date().toLocaleDateString('fr-FR') })}
            </div>
        </div>
    );
};

export default DemandeTravaux;
