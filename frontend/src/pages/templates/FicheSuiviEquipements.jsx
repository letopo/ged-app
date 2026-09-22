// frontend/src/pages/templates/FicheSuiviEquipements.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PlusCircle, Trash2 } from 'lucide-react';
import logo from '../../assets/logo-ordre-malte.png';
import SignatureFrame from '../../components/SignatureFrame';

const FicheSuiviEquipements = ({ formData, setFormData, pdfContainerRef }) => {
    const { t } = useTranslation();
    const motifs = ['Installation', 'Maintenance préventive', 'Maintenance curative', 'Dépannage', 'Visite de courtoisie', 'Diagnostic'];
    const situations = ['Sous garantie', 'Hors garantie', 'Sous contrat de maintenance', 'Hors contrat de maintenance'];

    const handlePieceChange = (index, field, value) => {
        const newPieces = [...(formData.pieces || [])];
        newPieces[index][field] = value;
        setFormData({ ...formData, pieces: newPieces });
    };

    const addPiece = () => setFormData({ ...formData, pieces: [...(formData.pieces || []), { designation: '', reference: '', quantite: '' }] });

    const removePiece = (index) => setFormData({ ...formData, pieces: formData.pieces.filter((_, i) => i !== index) });

    const toggleMotif = (motif) => {
        const current = formData.motifs || [];
        setFormData({ ...formData, motifs: current.includes(motif) ? current.filter(m => m !== motif) : [...current, motif] });
    };

    const toggleSituation = (situation) => {
        const current = formData.situations || [];
        setFormData({ ...formData, situations: current.includes(situation) ? current.filter(s => s !== situation) : [...current, situation] });
    };

    const cellIn = { background: 'none', border: 'none', outline: 'none', width: '100%', fontSize: 11 };
    const taStyle = { width: '100%', padding: 4, fontSize: 10, border: '1px solid #d1d5db', borderRadius: 4, outline: 'none', resize: 'vertical' };

    return (
        <div ref={pdfContainerRef} style={{ background: '#ffffff', padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', margin: '0 auto', width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif', fontSize: 11 }}>

            {/* En-tête */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <img src={logo} alt="Logo" style={{ height: 64, objectFit: 'contain' }} />
                <div style={{ textAlign: 'right' }}>
                    <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{t('ORDRE DE MALTE')}</h1>
                    <p style={{ fontSize: 10, margin: '2px 0 0' }}>{t('HÔPITAL SAINT JEAN DE MALTE')}</p>
                </div>
            </div>

            <h2 style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{t("FICHE DE SUIVI D'ÉQUIPEMENTS")}</h2>
            <p style={{ textAlign: 'center', fontSize: 10, marginBottom: 16 }}>
                N°......../ FS/CMB/HSJM/........{new Date().getFullYear().toString().slice(-2)}
            </p>

            {/* Informations de base */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 10, marginBottom: 12 }}>
                <tbody>
                    <tr>
                        <td style={{ border: '1px solid #000', padding: 4, fontWeight: 700, background: '#fee2e2', width: '15%' }}>{t('SERVICE')} :</td>
                        <td style={{ border: '1px solid #000', padding: 4, background: '#fef2f2', width: '35%' }}>
                            <input type="text" value={formData.service || ''} onChange={(e) => setFormData({...formData, service: e.target.value})} className="not-printable" style={cellIn} />
                            <div className="print-only" style={{ fontWeight: 500 }}>{formData.service}</div>
                        </td>
                        <td style={{ border: '1px solid #000', padding: 4, fontWeight: 700, background: '#dcfce7', width: '20%' }}>{t('EQUIPEMENT')} :</td>
                        <td style={{ border: '1px solid #000', padding: 4, background: '#f0fdf4', width: '30%' }} colSpan={3}>
                            <input type="text" value={formData.equipement || ''} onChange={(e) => setFormData({...formData, equipement: e.target.value})} className="not-printable" style={cellIn} />
                            <div className="print-only" style={{ fontWeight: 500 }}>{formData.equipement}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style={{ border: '1px solid #000', padding: 4, fontWeight: 700, background: '#cffafe' }}>{t('DATE')} :</td>
                        <td style={{ border: '1px solid #000', padding: 4, background: '#ecfeff' }}>
                            <input type="date" value={formData.date || ''} onChange={(e) => setFormData({...formData, date: e.target.value})} className="not-printable" style={cellIn} />
                            <div className="print-only" style={{ fontWeight: 500 }}>{formData.date ? new Date(formData.date).toLocaleDateString('fr-FR') : ''}</div>
                        </td>
                        <td style={{ border: '1px solid #000', padding: 4, fontWeight: 700, background: '#f3e8ff' }}>{t('MARQUE')} :</td>
                        <td style={{ border: '1px solid #000', padding: 4, background: '#faf5ff' }} colSpan={2}>
                            <input type="text" value={formData.marque || ''} onChange={(e) => setFormData({...formData, marque: e.target.value})} className="not-printable" style={cellIn} />
                            <div className="print-only" style={{ fontWeight: 500 }}>{formData.marque}</div>
                        </td>
                        <td style={{ border: '1px solid #000', padding: 4, fontWeight: 700, background: '#ffedd5', width: '10%' }}>{t('NS')} :</td>
                        <td style={{ border: '1px solid #000', padding: 4, background: '#fff7ed' }}>
                            <input type="text" value={formData.ns || ''} onChange={(e) => setFormData({...formData, ns: e.target.value})} className="not-printable" style={cellIn} />
                            <div className="print-only" style={{ fontWeight: 500 }}>{formData.ns}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style={{ border: '1px solid #000', padding: 4, fontWeight: 700, background: '#fce7f3' }}>{t('HEURE DÉBUT')} :</td>
                        <td style={{ border: '1px solid #000', padding: 4, background: '#fdf2f8' }} colSpan={2}>
                            <input type="time" value={formData.heureDebut || ''} onChange={(e) => setFormData({...formData, heureDebut: e.target.value})} className="not-printable" style={cellIn} />
                            <div className="print-only" style={{ fontWeight: 500 }}>{formData.heureDebut}</div>
                        </td>
                        <td style={{ border: '1px solid #000', padding: 4, fontWeight: 700, background: '#fef9c3' }} colSpan={2}>{t('HEURE FIN')} :</td>
                        <td style={{ border: '1px solid #000', padding: 4, background: '#fefce8' }} colSpan={2}>
                            <input type="time" value={formData.heureFin || ''} onChange={(e) => setFormData({...formData, heureFin: e.target.value})} className="not-printable" style={cellIn} />
                            <div className="print-only" style={{ fontWeight: 500 }}>{formData.heureFin}</div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Motif et Situation */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 10, marginBottom: 12 }}>
                <tbody>
                    <tr>
                        <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top', width: '50%' }}>
                            <p style={{ fontWeight: 700, marginBottom: 8 }}>{t('MOTIF')}</p>
                            {motifs.map(motif => (
                                <div key={motif} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <label className="not-printable" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={(formData.motifs || []).includes(motif)} onChange={() => toggleMotif(motif)} style={{ width: 12, height: 12 }} />
                                        <span style={{ fontSize: 10 }}>{t(motif)}</span>
                                    </label>
                                    <div className="print-only" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 13, lineHeight: 1, fontWeight: 700 }}>{(formData.motifs || []).includes(motif) ? '☒' : '☐'}</span>
                                        <span style={{ fontSize: 10 }}>{t(motif)}</span>
                                    </div>
                                </div>
                            ))}
                        </td>
                        <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                            <p style={{ fontWeight: 700, marginBottom: 8 }}>{t("SITUATION DE L'APPAREIL")} :</p>
                            {situations.map(situation => (
                                <div key={situation} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <label className="not-printable" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={(formData.situations || []).includes(situation)} onChange={() => toggleSituation(situation)} style={{ width: 12, height: 12 }} />
                                        <span style={{ fontSize: 10 }}>{t(situation)}</span>
                                    </label>
                                    <div className="print-only" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 13, lineHeight: 1, fontWeight: 700 }}>{(formData.situations || []).includes(situation) ? '☒' : '☐'}</span>
                                        <span style={{ fontSize: 10 }}>{t(situation)}</span>
                                    </div>
                                </div>
                            ))}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Problème / Travail */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 10, marginBottom: 12 }}>
                <tbody>
                    <tr>
                        <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top', width: '50%' }}>
                            <p style={{ fontWeight: 700, marginBottom: 8 }}>{t('Problème posé')}:</p>
                            <textarea value={formData.probleme || ''} onChange={(e) => setFormData({...formData, probleme: e.target.value})} className="not-printable" style={{ ...taStyle, height: 80 }} />
                            <div className="print-only" style={{ whiteSpace: 'pre-wrap', minHeight: '5rem', fontSize: 10 }}>{formData.probleme}</div>

                            <p style={{ fontWeight: 700, marginBottom: 8, marginTop: 12 }}>{t('Panne constatée')}:</p>
                            <textarea value={formData.panne || ''} onChange={(e) => setFormData({...formData, panne: e.target.value})} className="not-printable" style={{ ...taStyle, height: 80 }} />
                            <div className="print-only" style={{ whiteSpace: 'pre-wrap', minHeight: '5rem', fontSize: 10 }}>{formData.panne}</div>
                        </td>
                        <td style={{ border: '1px solid #000', padding: 8, verticalAlign: 'top' }}>
                            <p style={{ fontWeight: 700, marginBottom: 8 }}>{t('TRAVAIL EFFECTUÉ')}</p>
                            <textarea value={formData.travail || ''} onChange={(e) => setFormData({...formData, travail: e.target.value})} className="not-printable" style={{ ...taStyle, height: 176 }} />
                            <div className="print-only" style={{ whiteSpace: 'pre-wrap', minHeight: '11rem', fontSize: 10 }}>{formData.travail}</div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Pièces de rechange */}
            <p style={{ fontWeight: 700, fontSize: 10, marginBottom: 8 }}>{t('Pièces de rechanges')}</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 10, marginBottom: 12 }}>
                <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ border: '1px solid #000', padding: 4 }}>{t('DÉSIGNATION')}</th>
                        <th style={{ border: '1px solid #000', padding: 4 }}>{t('RÉFÉRENCE')}</th>
                        <th style={{ border: '1px solid #000', padding: 4 }}>{t('QUANTITÉ')}</th>
                    </tr>
                </thead>
                <tbody>
                    {(formData.pieces || []).map((piece, index) => (
                        <tr key={index}>
                            <td style={{ border: '1px solid #000', padding: 4 }}>
                                <input value={piece.designation} onChange={(e) => handlePieceChange(index, 'designation', e.target.value)} className="not-printable" style={{ ...cellIn, padding: 4 }} />
                                <div className="print-only">{piece.designation}</div>
                            </td>
                            <td style={{ border: '1px solid #000', padding: 4 }}>
                                <input value={piece.reference} onChange={(e) => handlePieceChange(index, 'reference', e.target.value)} className="not-printable" style={{ ...cellIn, padding: 4 }} />
                                <div className="print-only">{piece.reference}</div>
                            </td>
                            <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <input type="number" value={piece.quantite} onChange={(e) => handlePieceChange(index, 'quantite', e.target.value)} className="not-printable" style={{ ...cellIn, textAlign: 'center', padding: 4 }} />
                                    <div className="print-only">{piece.quantite}</div>
                                    <button type="button" onClick={() => removePiece(index)} className="not-printable" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', marginLeft: 4 }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button type="button" onClick={addPiece} className="not-printable" style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: 10, marginBottom: 12 }}>
                <PlusCircle size={14}/> {t('Ajouter une pièce')}
            </button>

            {/* Conclusion */}
            <div style={{ marginBottom: 12 }}>
                <p style={{ fontWeight: 700, fontSize: 10, marginBottom: 4 }}>{t('Conclusion')} :</p>
                <textarea value={formData.conclusion || ''} onChange={(e) => setFormData({...formData, conclusion: e.target.value})} className="not-printable" style={{ ...taStyle, minHeight: 60 }} rows={3} />
                <div className="print-only" style={{ borderBottom: '1px dotted #000', minHeight: '3rem', whiteSpace: 'pre-wrap', fontSize: 10 }}>{formData.conclusion}</div>
            </div>

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, fontSize: 10, marginTop: 24 }}>
                <SignatureFrame label={t('Cellule de Maintenance Biomédicale')} zoneIndex={1} height="112px" />
                <SignatureFrame label={t('Service Utilisateur')} zoneIndex={2} height="112px" />
            </div>

            {/* Footer */}
            <div style={{ marginTop: 16, fontSize: 10 }}>
                <p style={{ fontWeight: 700, margin: '0 0 2px' }}>{t('Hôpital Saint-Jean de Malte')}</p>
                <p style={{ margin: '0 0 2px' }}>{t('BP 56 - Njombé - Cameroun')}</p>
                <p style={{ margin: '0 0 2px' }}>{t('Tél.: {{tel}} - Email: {{email}}', { tel: '00(237)657 56 91 03', email: 'hospitalcameroun@ordredemaltefrance.org' })}</p>
                <p style={{ fontSize: 9, marginTop: 4, color: '#4b5563' }}>
                    {t("Dépendant des œuvres Hospitalières françaises de l'Ordre de Malte, association d'utilité publique en partenariat avec le Ministère de la santé publique et avec les plantations du groupe PHP")}
                </p>
            </div>
        </div>
    );
};

export default FicheSuiviEquipements;
