// frontend/src/pages/templates/PieceDeCaisse.jsx - VERSION AVEC APERÇU DOCUMENT

import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Link as LinkIcon, Eye } from 'lucide-react';
import { documentsAPI } from '../../services/api';
import DocumentViewer from '../../components/DocumentViewer';
import { useAuth } from '../../contexts/AuthContext';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';

const PieceDeCaisse = ({ formData, setFormData, pdfContainerRef, showOrdreMissionSelector = true }) => {
    const { user } = useAuth();
    const [ordresMission, setOrdresMission] = useState([]);
    const [loadingOM, setLoadingOM] = useState(false);

    // Nouvel état pour gérer la visualisation
    const [viewingDoc, setViewingDoc] = useState(null);

    // Générer automatiquement le numéro de pièce au premier chargement
    useEffect(() => {
        if (formData.numero) return; // déjà renseigné
        documentsAPI.getNextNumero('Pièce de caisse')
            .then(res => {
                setFormData(prev => ({ ...prev, numero: res.data.numero }));
            })
            .catch(err => console.error('Erreur récupération numéro PC:', err));
    }, []);

    // ✅ Charger les Ordres de Mission validés
    useEffect(() => {
        if (showOrdreMissionSelector) {
            loadOrdresMission();
        }
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

    const addLine = () => {
        setFormData({ ...formData, lines: [...formData.lines, { refCompta: '', libelle: '', refGage: '', entrees: '', sorties: '' }] });
    };

    const removeLine = (index) => {
        const newLines = formData.lines.filter((_, i) => i !== index);
        setFormData({ ...formData, lines: newLines });
    };

    // Handler pour ouvrir le Viewer
    const handleViewDocument = () => {
        const docId = formData.linkedOrdreMissionId;
        if (!docId) return;

        const docToView = ordresMission.find(d => d.id === parseInt(docId) || d.id === docId);
        if (docToView) {
            setViewingDoc(docToView);
        }
    };

    const totalEntrees = formData.lines.reduce((acc, line) => acc + (Number(line.entrees) || 0), 0);
    const totalSorties = formData.lines.reduce((acc, line) => acc + (Number(line.sorties) || 0), 0);

    return (
        <>
            {/* ✅ Sélecteur d'Ordre de Mission */}
            {showOrdreMissionSelector && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6 not-printable">
                    <div className="flex items-center gap-3 mb-4">
                        <LinkIcon className="text-blue-600" size={24} />
                        <h3 className="text-lg font-bold text-blue-900">Lier à un document justificatif</h3>
                    </div>
                    
                    <p className="text-sm text-blue-800 mb-4">
                        ⚠️ <strong>Important :</strong> En sélectionnant un document, le PDF généré contiendra 
                        automatiquement le document justificatif en haut et la Pièce de Caisse en bas. Le Directeur Général pourra ainsi 
                        tout visualiser d'un seul coup.
                    </p>

                    {loadingOM ? (
                        <div className="text-center py-4 text-blue-600">Chargement des documents...</div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <select
                                name="linkedOrdreMissionId"
                                value={formData.linkedOrdreMissionId || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            >
                                <option value="">-- Aucun document lié --</option>
                                {ordresMission.map(doc => (
                                    <option key={doc.id} value={doc.id}>
                                        [{doc.category}] {doc.title} - {new Date(doc.createdAt).toLocaleDateString('fr-FR')} - {doc.status}
                                    </option>
                                ))}
                            </select>

                            {/* BOUTON DE VISUALISATION */}
                            <button
                                type="button"
                                onClick={handleViewDocument}
                                disabled={!formData.linkedOrdreMissionId}
                                className={`p-3 rounded-lg border-2 transition-colors ${
                                    formData.linkedOrdreMissionId 
                                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                                    : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                                }`}
                                title="Voir le document sélectionné"
                            >
                                <Eye size={24} />
                            </button>
                        </div>
                    )}
                    
                    {ordresMission.length === 0 && !loadingOM && (
                        <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                            ⚠️ Aucun document disponible. Assurez-vous qu'il y a des documents validés.
                        </p>
                    )}

                    {formData.linkedOrdreMissionId && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-300 rounded text-sm text-green-800">
                            ✅ Le PDF final contiendra le document sélectionné suivi de cette Pièce de Caisse
                        </div>
                    )}
                </div>
            )}

            {/* Template Pièce de Caisse */}
            <div ref={pdfContainerRef} className="bg-white p-12 shadow-lg mx-auto flex flex-col" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
                
                <div className="flex-grow">
                    <h1 className="text-center font-bold text-xl mb-2">HOPITAL SAINT JEAN DE MALTE</h1>
                    <h2 className="text-center font-bold text-lg mb-8">PIECE DE CAISSE N° {formData.numero || '...'}</h2>
                    
                    <div className="flex justify-between mb-4 text-sm">
                        <div className="w-2/3">
                            <input name="nom" value={formData.nom || ''} onChange={handleChange} className="not-printable w-full p-1 border-b" placeholder="NOM..." />
                            <div className="print-only static-field">{formData.nom || '\u00A0'}</div>
                        </div>
                        <div className="w-1/4">
                            <input name="date" value={formData.date || ''} onChange={handleChange} className="not-printable w-full p-1 border-b" placeholder="DATE..." />
                            <div className="print-only static-field">{formData.date || '\u00A0'}</div>
                        </div>
                    </div>
                    
                    <div>
                        <input name="concerne" value={formData.concerne || ''} onChange={handleChange} className="not-printable w-full p-1 border-b mb-8 text-sm" placeholder="CONCERNE..." />
                        <div className="print-only static-field mb-8">{formData.concerne || '\u00A0'}</div>
                    </div>

                    <table className="w-full border-collapse border border-black text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-1 w-[15%]">Réf. Comptabilité</th>
                                <th className="border border-black p-1 w-[40%]">LIBELLES</th>
                                <th className="border border-black p-1 w-[15%]">Réf. GAGE</th>
                                <th className="border border-black p-1 w-[15%]">ENTREES</th>
                                <th className="border border-black p-1 w-[15%]">SORTIES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {formData.lines.map((line, index) => (
                                <tr key={index}>
                                    <td className="border border-black">
                                        <input value={line.refCompta || ''} onChange={(e) => handleLineChange(index, 'refCompta', e.target.value)} className="not-printable w-full p-1 h-8"/>
                                        <div className="print-only p-1 h-8">{line.refCompta}</div>
                                    </td>
                                    <td className="border border-black">
                                        <input value={line.libelle || ''} onChange={(e) => handleLineChange(index, 'libelle', e.target.value)} className="not-printable w-full p-1 h-8"/>
                                        <div className="print-only p-1 h-8">{line.libelle}</div>
                                    </td>
                                    <td className="border border-black">
                                        <input value={line.refGage || ''} onChange={(e) => handleLineChange(index, 'refGage', e.target.value)} className="not-printable w-full p-1 h-8"/>
                                        <div className="print-only p-1 h-8">{line.refGage}</div>
                                    </td>
                                    <td className="border border-black">
                                        <input type="number" value={line.entrees || ''} onChange={(e) => handleLineChange(index, 'entrees', e.target.value)} className="not-printable w-full p-1 h-8 text-right"/>
                                        <div className="print-only p-1 h-8 text-right">{Number(line.entrees || 0).toLocaleString('fr-FR')}</div>
                                    </td>
                                    <td className="border border-black">
                                        <div className="flex items-center">
                                            <input type="number" value={line.sorties || ''} onChange={(e) => handleLineChange(index, 'sorties', e.target.value)} className="not-printable w-full p-1 h-8 text-right"/>
                                            <div className="print-only p-1 h-8 text-right flex-1">{Number(line.sorties || 0).toLocaleString('fr-FR')}</div>
                                            <button type="button" onClick={() => removeLine(index)} className="not-printable text-red-500 hover:text-red-700 ml-1"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button type="button" onClick={addLine} className="not-printable mt-2 flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm">
                        <PlusCircle size={16}/> Ajouter une ligne
                    </button>
                    
                    <div className="flex justify-end mt-4">
                        <table className="w-1/2 border-collapse border border-black text-sm">
                            <tbody>
                                <tr>
                                    <td className="border border-black p-1 font-bold">TOTAL</td>
                                    <td className="border border-black p-1 text-right font-bold">{totalEntrees.toLocaleString('fr-FR')}</td>
                                    <td className="border border-black p-1 text-right font-bold">{totalSorties.toLocaleString('fr-FR')}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black p-1 font-bold" colSpan="3">
                                        En lettres...
                                        <input name="totalEnLettres" value={formData.totalEnLettres || ''} onChange={handleChange} className="not-printable w-2/3 ml-2 p-1"/>
                                        <span className="print-only ml-2 font-normal">{formData.totalEnLettres}</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-8 text-sm mt-auto border-t-2 border-black pt-4">
                    <SignatureFrame
                        label="Visa Bénéficiaire"
                        signatureUrl={getImageUrl(user?.signaturePath)}
                        stampUrl={getImageUrl(user?.stampPath)}
                        zoneIndex={1}
                    />
                    <SignatureFrame
                        label="Comptabilité"
                        signatureUrl={null}
                        stampUrl={null}
                        zoneIndex={2}
                    />
                    <SignatureFrame
                        label="Visa Directeur"
                        signatureUrl={null}
                        stampUrl={null}
                        zoneIndex={3}
                    />
                </div>
            </div>

            {/* ✅ DOCUMENT VIEWER EN OVERLAY */}
            {viewingDoc && (
                <DocumentViewer
                    document={viewingDoc}
                    onClose={() => setViewingDoc(null)}
                />
            )}
        </>
    );
};

export default PieceDeCaisse;