// frontend/src/pages/templates/PieceDeCaisse.jsx - VERSION COMPLÈTE CORRIGÉE

import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Link as LinkIcon } from 'lucide-react';
import { documentsAPI } from '../../services/api';

const PieceDeCaisse = ({ formData, setFormData, pdfContainerRef, showOrdreMissionSelector = true }) => {
    const [ordresMission, setOrdresMission] = useState([]);
    const [loadingOM, setLoadingOM] = useState(false);

    // ✅ Charger les Ordres de Mission validés
    useEffect(() => {
        if (showOrdreMissionSelector) {
            loadOrdresMission();
        }
    }, [showOrdreMissionSelector]);

    const loadOrdresMission = async () => {
        try {
            setLoadingOM(true);
            
            console.log('📋 Chargement des Ordres de Mission...');
            const response = await documentsAPI.getValidatedOrdreMission();
            
            console.log('✅ Ordres de Mission reçus:', response.data.data?.length || 0);
            console.log('📄 Détails:', response.data.data);
            
            setOrdresMission(response.data.data || []);
        } catch (error) {
            console.error('❌ Erreur chargement OM:', error);
            console.error('❌ Détails:', error.response?.data);
        } finally {
            setLoadingOM(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        console.log(`🔄 Changement de champ: ${name} = ${value}`);
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

    const totalEntrees = formData.lines.reduce((acc, line) => acc + (Number(line.entrees) || 0), 0);
    const totalSorties = formData.lines.reduce((acc, line) => acc + (Number(line.sorties) || 0), 0);

    return (
        <>
            {/* ✅ Sélecteur d'Ordre de Mission */}
            {showOrdreMissionSelector && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6 not-printable">
                    <div className="flex items-center gap-3 mb-4">
                        <LinkIcon className="text-blue-600" size={24} />
                        <h3 className="text-lg font-bold text-blue-900">Lier à un Ordre de Mission</h3>
                    </div>
                    
                    <p className="text-sm text-blue-800 mb-4">
                        ⚠️ <strong>Important :</strong> En sélectionnant un Ordre de Mission, le PDF généré contiendra 
                        automatiquement l'OM en haut et la Pièce de Caisse en bas. Le Directeur Général pourra ainsi 
                        tout visualiser d'un seul coup.
                    </p>

                    {loadingOM ? (
                        <div className="text-center py-4 text-blue-600">Chargement des Ordres de Mission...</div>
                    ) : (
                        <>
                            <select
                                name="linkedOrdreMissionId"
                                value={formData.linkedOrdreMissionId || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            >
                                <option value="">-- Aucun Ordre de Mission lié --</option>
                                {ordresMission.map(om => (
                                    <option key={om.id} value={om.id}>
                                        {om.title} - {new Date(om.createdAt).toLocaleDateString('fr-FR')} - {om.status}
                                    </option>
                                ))}
                            </select>
                            
                            {ordresMission.length === 0 && (
                                <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                                    ⚠️ Aucun Ordre de Mission disponible. Assurez-vous qu'il y a des OM validés ou en cours.
                                </p>
                            )}
                        </>
                    )}

                    {formData.linkedOrdreMissionId && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-300 rounded text-sm text-green-800">
                            ✅ Le PDF final contiendra l'Ordre de Mission sélectionné suivi de cette Pièce de Caisse
                        </div>
                    )}
                </div>
            )}

            {/* Template Pièce de Caisse */}
            <div ref={pdfContainerRef} className="bg-white p-12 shadow-lg mx-auto flex flex-col" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
                
                <div className="flex-grow">
                    <h1 className="text-center font-bold text-xl mb-2">HOPITAL SAINT JEAN DE MALTE</h1>
                    <h2 className="text-center font-bold text-lg mb-8">PIECE DE CAISSE N° ........................</h2>
                    
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

                <div className="grid grid-cols-3 gap-8 text-center text-sm mt-auto">
                    <div>
                        <div className="h-24 pt-2 border-t-2 border-dotted">Visa Bénéficiaire</div>
                    </div>
                    <div>
                        <div className="h-24 pt-2 border-t-2 border-dotted">Comptabilité</div>
                    </div>
                    <div>
                        <div className="h-24 pt-2 border-t-2 border-dotted">Visa Directeur</div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PieceDeCaisse;