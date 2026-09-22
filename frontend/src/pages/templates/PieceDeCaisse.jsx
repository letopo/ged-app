// frontend/src/pages/templates/PieceDeCaisse.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusCircle, Trash2, Link as LinkIcon, Eye } from 'lucide-react';
import { documentsAPI } from '../../services/api';
import DocumentViewer from '../../components/DocumentViewer';
import { useAuth } from '../../contexts/AuthContext';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';
import PersonAutocomplete from '../../components/PersonAutocomplete';

const PieceDeCaisse = ({ formData, setFormData, pdfContainerRef, showOrdreMissionSelector = true }) => {
    const { user } = useAuth();
    const { t } = useTranslation();
    // Si c'est le comptable qui génère la PC, sa signature/cachet va sur la zone
    // « Comptabilité », pas sur « Visa Bénéficiaire ».
    const isComptable = (user?.postes || []).includes('comptable');
    const mySig = getImageUrl(user?.signaturePath);
    const myStamp = getImageUrl(user?.stampPath);
    const [ordresMission, setOrdresMission] = useState([]);
    const [loadingOM, setLoadingOM] = useState(false);
    const [viewingDoc, setViewingDoc] = useState(null);

    useEffect(() => {
        if (formData.numero) return;
        documentsAPI.getNextNumero('Pièce de caisse')
            .then(res => setFormData(prev => ({ ...prev, numero: res.data.numero })))
            .catch(err => console.error('Erreur récupération numéro PC:', err));
    }, []);

    useEffect(() => {
        if (showOrdreMissionSelector) loadOrdresMission();
    }, [showOrdreMissionSelector]);

    const loadOrdresMission = async () => {
        try {
            setLoadingOM(true);
            const response = await documentsAPI.getValidatedForPC();
            setOrdresMission(response.data.data || []);
        } catch (error) {
            console.error('❌ Erreur chargement documents:', error);
        } finally {
            setLoadingOM(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLineChange = (index, field, value) => {
        const newLines = [...formData.lines];
        newLines[index][field] = value;
        setFormData({ ...formData, lines: newLines });
    };

    const addLine = () => setFormData({ ...formData, lines: [...formData.lines, { refCompta: '', libelle: '', refGage: '', entrees: '', sorties: '' }] });

    const removeLine = (index) => setFormData({ ...formData, lines: formData.lines.filter((_, i) => i !== index) });

    const handleViewDocument = () => {
        const docId = formData.linkedOrdreMissionId;
        if (!docId) return;
        const docToView = ordresMission.find(d => d.id === parseInt(docId) || d.id === docId);
        if (docToView) setViewingDoc(docToView);
    };

    const totalEntrees = formData.lines.reduce((acc, line) => acc + (Number(line.entrees) || 0), 0);
    const totalSorties = formData.lines.reduce((acc, line) => acc + (Number(line.sorties) || 0), 0);

    const cellIn = { background: 'none', border: 'none', outline: 'none', width: '100%', padding: 4, height: 32, fontSize: 12 };

    return (
        <>
            {/* Sélecteur d'Ordre de Mission */}
            {showOrdreMissionSelector && (
                <div className="not-printable" style={{
                    background: 'var(--brand-soft)', border: '2px solid var(--brand)',
                    borderRadius: 'var(--radius-3)', padding: 24, marginBottom: 24,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <LinkIcon size={22} color="var(--brand)" />
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>{t('Lier à un document justificatif')}</h3>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16 }}>
                        ⚠️ <strong>{t('Important')} :</strong> {t('En sélectionnant un document, le PDF généré contiendra automatiquement le document justificatif en haut et la Pièce de Caisse en bas.')}
                    </p>
                    {loadingOM ? (
                        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--brand)', fontSize: 13 }}>{t('Chargement des documents...')}</div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <select
                                name="linkedOrdreMissionId"
                                value={formData.linkedOrdreMissionId || ''}
                                onChange={handleChange}
                                style={{
                                    flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-2)',
                                    border: '1.5px solid var(--border)', background: 'var(--surface)',
                                    color: 'var(--fg)', fontSize: 13, outline: 'none',
                                }}
                            >
                                <option value="">{t('-- Aucun document lié --')}</option>
                                {ordresMission.map(doc => (
                                    <option key={doc.id} value={doc.id}>
                                        [{doc.category}] {doc.title} - {new Date(doc.createdAt).toLocaleDateString('fr-FR')} - {doc.status}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={handleViewDocument}
                                disabled={!formData.linkedOrdreMissionId}
                                style={{
                                    padding: 10, borderRadius: 'var(--radius-2)', cursor: formData.linkedOrdreMissionId ? 'pointer' : 'not-allowed',
                                    background: formData.linkedOrdreMissionId ? 'var(--brand)' : 'var(--surface-2)',
                                    color: formData.linkedOrdreMissionId ? '#fff' : 'var(--fg-muted)',
                                    border: 'none', display: 'flex', alignItems: 'center',
                                }}
                                title={t('Voir le document sélectionné')}
                            >
                                <Eye size={22} />
                            </button>
                        </div>
                    )}
                    {ordresMission.length === 0 && !loadingOM && (
                        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--warning)', background: 'var(--warning-soft)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-2)', padding: 10 }}>
                            ⚠️ {t("Aucun document disponible. Assurez-vous qu'il y a des documents validés.")}
                        </p>
                    )}
                    {formData.linkedOrdreMissionId && (
                        <div style={{ marginTop: 12, padding: 10, background: 'var(--success-soft)', border: '1px solid var(--success)', borderRadius: 'var(--radius-2)', fontSize: 12, color: 'var(--success)' }}>
                            ✅ {t('Le PDF final contiendra le document sélectionné suivi de cette Pièce de Caisse')}
                        </div>
                    )}
                </div>
            )}

            {/* Template Pièce de Caisse */}
            <div ref={pdfContainerRef} style={{ background: '#ffffff', padding: 48, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', margin: '0 auto', display: 'flex', flexDirection: 'column', width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
                <div style={{ flex: 1 }}>
                    <h1 style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{t('HOPITAL SAINT JEAN DE MALTE')}</h1>
                    <h2 style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, marginBottom: 32 }}>{t('PIECE DE CAISSE N° {{num}}', { num: formData.numero || '...' })}</h2>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13 }}>
                        <div style={{ width: '65%' }}>
                            <div className="not-printable">
                                <PersonAutocomplete
                                    value={formData.nom || ''}
                                    placeholder={t('NOM du bénéficiaire...')}
                                    onSelect={(c) => setFormData(prev => ({
                                        ...prev, nom: c.label, beneficiaire_id: c.id, beneficiaire_source: c.source,
                                    }))}
                                />
                            </div>
                            <div className="print-only static-field">{formData.nom || ' '}</div>
                        </div>
                        <div style={{ width: '25%' }}>
                            <input name="date" value={formData.date || ''} onChange={handleChange} className="not-printable" style={{ width: '100%', padding: '4px 0', borderBottom: '1px solid #999', outline: 'none', fontSize: 13 }} placeholder={t('DATE...')} />
                            <div className="print-only static-field">{formData.date || ' '}</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: 32 }}>
                        <input name="concerne" value={formData.concerne || ''} onChange={handleChange} className="not-printable" style={{ width: '100%', padding: '4px 0', borderBottom: '1px solid #999', outline: 'none', fontSize: 13 }} placeholder={t('CONCERNE...')} />
                        <div className="print-only static-field">{formData.concerne || ' '}</div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: '#f3f4f6' }}>
                                <th style={{ border: '1px solid #000', padding: 4, width: '15%' }}>{t('Réf. Comptabilité')}</th>
                                <th style={{ border: '1px solid #000', padding: 4, width: '40%' }}>{t('LIBELLES')}</th>
                                <th style={{ border: '1px solid #000', padding: 4, width: '15%' }}>{t('Réf. GAGE')}</th>
                                <th style={{ border: '1px solid #000', padding: 4, width: '15%' }}>{t('ENTREES')}</th>
                                <th style={{ border: '1px solid #000', padding: 4, width: '15%' }}>{t('SORTIES')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {formData.lines.map((line, index) => (
                                <tr key={index}>
                                    <td style={{ border: '1px solid #000' }}>
                                        <input value={line.refCompta || ''} onChange={(e) => handleLineChange(index, 'refCompta', e.target.value)} className="not-printable" style={cellIn} />
                                        <div className="print-only" style={{ padding: 4, height: 32 }}>{line.refCompta}</div>
                                    </td>
                                    <td style={{ border: '1px solid #000' }}>
                                        <input value={line.libelle || ''} onChange={(e) => handleLineChange(index, 'libelle', e.target.value)} className="not-printable" style={cellIn} />
                                        <div className="print-only" style={{ padding: 4, height: 32 }}>{line.libelle}</div>
                                    </td>
                                    <td style={{ border: '1px solid #000' }}>
                                        <input value={line.refGage || ''} onChange={(e) => handleLineChange(index, 'refGage', e.target.value)} className="not-printable" style={cellIn} />
                                        <div className="print-only" style={{ padding: 4, height: 32 }}>{line.refGage}</div>
                                    </td>
                                    <td style={{ border: '1px solid #000' }}>
                                        <input type="number" value={line.entrees || ''} onChange={(e) => handleLineChange(index, 'entrees', e.target.value)} className="not-printable" style={{ ...cellIn, textAlign: 'right' }} />
                                        <div className="print-only" style={{ padding: 4, height: 32, textAlign: 'right' }}>{Number(line.entrees || 0).toLocaleString('fr-FR')}</div>
                                    </td>
                                    <td style={{ border: '1px solid #000' }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <input type="number" value={line.sorties || ''} onChange={(e) => handleLineChange(index, 'sorties', e.target.value)} className="not-printable" style={{ ...cellIn, textAlign: 'right', flex: 1 }} />
                                            <div className="print-only" style={{ padding: 4, height: 32, textAlign: 'right', flex: 1 }}>{Number(line.sorties || 0).toLocaleString('fr-FR')}</div>
                                            <button type="button" onClick={() => removeLine(index)} className="not-printable" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', marginLeft: 4 }}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button type="button" onClick={addLine} className="not-printable" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: 13 }}>
                        <PlusCircle size={16}/> {t('Ajouter une ligne')}
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                        <table style={{ width: '50%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 12 }}>
                            <tbody>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: 4, fontWeight: 700 }}>{t('TOTAL')}</td>
                                    <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right', fontWeight: 700 }}>{totalEntrees.toLocaleString('fr-FR')}</td>
                                    <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right', fontWeight: 700 }}>{totalSorties.toLocaleString('fr-FR')}</td>
                                </tr>
                                <tr>
                                    <td colSpan={3} style={{ border: '1px solid #000', padding: 4, fontWeight: 700 }}>
                                        {t('En lettres...')}
                                        <input name="totalEnLettres" value={formData.totalEnLettres || ''} onChange={handleChange} className="not-printable" style={{ width: '60%', marginLeft: 8, border: 'none', borderBottom: '1px solid #999', outline: 'none', fontSize: 12 }} />
                                        <span className="print-only" style={{ marginLeft: 8, fontWeight: 400 }}>{formData.totalEnLettres}</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, fontSize: 12, marginTop: 'auto', borderTop: '2px solid #000', paddingTop: 16 }}>
                    <SignatureFrame label={t('Visa Bénéficiaire')} signatureUrl={isComptable ? null : mySig} stampUrl={isComptable ? null : myStamp} zoneIndex={1} />
                    <SignatureFrame label={t('Comptabilité')} signatureUrl={isComptable ? mySig : null} stampUrl={isComptable ? myStamp : null} zoneIndex={2} />
                    <SignatureFrame label={t('Visa Directeur')} signatureUrl={null} stampUrl={null} zoneIndex={3} />
                </div>
            </div>

            {viewingDoc && <DocumentViewer document={viewingDoc} onClose={() => setViewingDoc(null)} />}
        </>
    );
};

export default PieceDeCaisse;
