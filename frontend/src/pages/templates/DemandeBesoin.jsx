// frontend/src/pages/templates/DemandeBesoin.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PlusCircle, Trash2 } from 'lucide-react';
import logo from '../../assets/logo-ordre-malte.png';
import { useAuth } from '../../contexts/AuthContext';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';

const DemandeBesoin = ({ formData, setFormData, pdfContainerRef }) => {
    const { user } = useAuth();
    const { t } = useTranslation();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLineChange = (index, field, value) => {
        const newLines = [...formData.lines];
        newLines[index][field] = value;
        if (field === 'quantite' || field === 'prixUnitaire') {
            const qty = Number(newLines[index].quantite) || 0;
            const price = Number(newLines[index].prixUnitaire) || 0;
            newLines[index].montantTotal = qty * price;
        }
        setFormData({ ...formData, lines: newLines });
    };

    const addLine = () => setFormData({ ...formData, lines: [...formData.lines, { designation: '', quantite: '', prixUnitaire: '', montantTotal: '' }] });
    const removeLine = (index) => setFormData({ ...formData, lines: formData.lines.filter((_, i) => i !== index) });
    const grandTotal = formData.lines.reduce((acc, line) => acc + (Number(line.montantTotal) || 0), 0);

    const cellIn = { background: 'none', border: 'none', outline: 'none', width: '100%', padding: 8, height: 40, fontSize: 12 };

    return (
        <div ref={pdfContainerRef} style={{ background: '#ffffff', padding: 48, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', margin: '0 auto', width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <img src={logo} alt="Logo" style={{ height: 80 }} />
                <div style={{ textAlign: 'right' }}>
                    <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t('HÔPITAL SAINT JEAN DE MALTE')}</h1>
                    <p style={{ fontSize: 13, margin: '4px 0 0' }}>{t('Njombé - Cameroun')}</p>
                </div>
            </div>

            <div style={{ borderTop: '2px solid #1f2937', borderBottom: '2px solid #1f2937', padding: '12px 0', marginBottom: 32, textAlign: 'center' }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t('DEMANDE DE BESOIN')}</h2>
            </div>

            <div style={{ marginBottom: 24, fontSize: 13 }}>
                {[['date_demande','Date de la demande'], ['service','Service demandeur'], ['reference','Référence demande']].map(([name, label]) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 12 }}>
                        <span style={{ fontWeight: 600, width: 180 }}>{t(label)} :</span>
                        <div style={{ flex: 1 }}>
                            <input name={name} value={formData[name] || ''} onChange={handleChange} className="not-printable" style={{ width: '100%', borderBottom: '1px solid #9ca3af', outline: 'none', padding: '0 8px', fontSize: 13 }} />
                            <div className="print-only static-field">{formData[name] || ' '}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, borderBottom: '1px solid #9ca3af', paddingBottom: 4 }}>{t('Liste des besoins :')}</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 12 }}>
                    <thead>
                        <tr style={{ background: '#f3f4f6' }}>
                            <th style={{ border: '1px solid #000', padding: 8, width: '45%' }}>{t('Désignation')}</th>
                            <th style={{ border: '1px solid #000', padding: 8, width: '15%' }}>{t('Quantité')}</th>
                            <th style={{ border: '1px solid #000', padding: 8, width: '20%' }}>{t('P.U. (FCFA)')}</th>
                            <th style={{ border: '1px solid #000', padding: 8, width: '20%' }}>{t('Montant (FCFA)')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.lines.map((line, index) => (
                            <tr key={index}>
                                <td style={{ border: '1px solid #000' }}>
                                    <input value={line.designation || ''} onChange={(e) => handleLineChange(index, 'designation', e.target.value)} className="not-printable" style={cellIn} />
                                    <div className="print-only" style={{ padding: 8, height: 40 }}>{line.designation}</div>
                                </td>
                                <td style={{ border: '1px solid #000' }}>
                                    <input type="number" value={line.quantite || ''} onChange={(e) => handleLineChange(index, 'quantite', e.target.value)} className="not-printable" style={{ ...cellIn, textAlign: 'center' }} />
                                    <div className="print-only" style={{ padding: 8, height: 40, textAlign: 'center' }}>{line.quantite}</div>
                                </td>
                                <td style={{ border: '1px solid #000' }}>
                                    <input type="number" value={line.prixUnitaire || ''} onChange={(e) => handleLineChange(index, 'prixUnitaire', e.target.value)} className="not-printable" style={{ ...cellIn, textAlign: 'right' }} />
                                    <div className="print-only" style={{ padding: 8, height: 40, textAlign: 'right' }}>{Number(line.prixUnitaire || 0).toLocaleString('fr-FR')}</div>
                                </td>
                                <td style={{ border: '1px solid #000' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, height: 40 }}>
                                        <span style={{ flex: 1, textAlign: 'right' }}>{Number(line.montantTotal || 0).toLocaleString('fr-FR')}</span>
                                        <button type="button" onClick={() => removeLine(index)} className="not-printable" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', marginLeft: 8 }}><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: '#f3f4f6', fontWeight: 700 }}>
                            <td colSpan={3} style={{ border: '1px solid #000', padding: 8, textAlign: 'right' }}>{t('TOTAL GÉNÉRAL :')}</td>
                            <td style={{ border: '1px solid #000', padding: 8, textAlign: 'right' }}>{grandTotal.toLocaleString('fr-FR')} FCFA</td>
                        </tr>
                    </tfoot>
                </table>
                <button type="button" onClick={addLine} className="not-printable" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: 13 }}>
                    <PlusCircle size={16}/> {t('Ajouter une ligne')}
                </button>
            </div>

            <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, borderBottom: '1px solid #9ca3af', paddingBottom: 4 }}>{t('Justification de la demande :')}</h3>
                <textarea value={formData.justification || ''} onChange={handleChange} name="justification" className="not-printable" style={{ width: '100%', border: '1px solid #9ca3af', padding: 12, minHeight: 100, fontSize: 13, outline: 'none', resize: 'vertical' }} placeholder={t('Expliquez la raison de cette demande...')} />
                <div className="print-only static-field" style={{ minHeight: 100 }}>{formData.justification || ' '}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, marginTop: 64 }}>
                <SignatureFrame label={t('Demandeur')} signatureUrl={getImageUrl(user?.signaturePath)} stampUrl={getImageUrl(user?.stampPath)} zoneIndex={1} />
                <SignatureFrame label={t('Responsable achats')} signatureUrl={null} stampUrl={null} zoneIndex={2} />
                <SignatureFrame label={t('Directeur du Soutient')} signatureUrl={null} stampUrl={null} zoneIndex={3} />
            </div>

            <div className="not-printable" style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #d1d5db', fontSize: 10, color: 'var(--fg-muted)', textAlign: 'center' }}>
                {t('Document généré le {{date}}', { date: new Date().toLocaleDateString('fr-FR') })}
            </div>
        </div>
    );
};

export default DemandeBesoin;
