// frontend/src/pages/templates/FicheSuiviEquipements.jsx
import React from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import logo from '../../assets/logo-ordre-malte.png';

const FicheSuiviEquipements = ({ formData, setFormData, pdfContainerRef }) => {
    const motifs = [
        'Installation',
        'Maintenance préventive',
        'Maintenance curative',
        'Dépannage',
        'Visite de courtoisie',
        'Diagnostic'
    ];

    const situations = [
        'Sous garantie',
        'Hors garantie',
        'Sous contrat de maintenance',
        'Hors contrat de maintenance'
    ];

    const handlePieceChange = (index, field, value) => {
        const newPieces = [...formData.pieces];
        newPieces[index][field] = value;
        setFormData({ ...formData, pieces: newPieces });
    };

    const addPiece = () => {
        setFormData({ 
            ...formData, 
            pieces: [...formData.pieces, { designation: '', reference: '', quantite: '' }] 
        });
    };

    const removePiece = (index) => {
        const newPieces = formData.pieces.filter((_, i) => i !== index);
        setFormData({ ...formData, pieces: newPieces });
    };

    const toggleMotif = (motif) => {
        const current = formData.motifs || [];
        if (current.includes(motif)) {
            setFormData({ ...formData, motifs: current.filter(m => m !== motif) });
        } else {
            setFormData({ ...formData, motifs: [...current, motif] });
        }
    };

    const toggleSituation = (situation) => {
        const current = formData.situations || [];
        if (current.includes(situation)) {
            setFormData({ ...formData, situations: current.filter(s => s !== situation) });
        } else {
            setFormData({ ...formData, situations: [...current, situation] });
        }
    };

    return (
        <div 
            ref={pdfContainerRef} 
            className="bg-white p-8 shadow-lg mx-auto" 
            style={{ 
                width: '210mm', 
                minHeight: '297mm', 
                fontFamily: 'Arial, sans-serif',
                fontSize: '11px'
            }}
        >
            {/* En-tête */}
            <div className="flex items-start justify-between mb-4">
                <img src={logo} alt="Logo" className="h-16" />
                <div className="text-right">
                    <h1 className="text-lg font-bold">ORDRE DE MALTE</h1>
                    <p className="text-xs">HÔPITAL SAINT JEAN DE MALTE</p>
                </div>
            </div>

            <h2 className="text-center font-bold text-lg mb-3">FICHE DE SUIVI D'ÉQUIPEMENTS</h2>
            <p className="text-center text-xs mb-4">
                N°......../ FS/CMB/HSJM/........{new Date().getFullYear().toString().slice(-2)}
            </p>

            {/* Informations de base */}
            <table className="w-full border-collapse border border-black text-xs mb-3">
                <tbody>
                    {/* Ligne 1: SERVICE et EQUIPEMENT */}
                    <tr>
                        <td className="border border-black p-1 font-bold bg-red-100" style={{ width: '15%' }}>SERVICE :</td>
                        <td className="border border-black p-1 bg-red-50" style={{ width: '35%' }}>
                            <input 
                                type="text"
                                value={formData.service || ''}
                                onChange={(e) => setFormData({...formData, service: e.target.value})}
                                className="w-full bg-transparent"
                            />
                        </td>
                        <td className="border border-black p-1 font-bold bg-green-100" style={{ width: '20%' }}>EQUIPEMENT :</td>
                        <td className="border border-black p-1 bg-green-50" colSpan="3" style={{ width: '30%' }}>
                            <input 
                                type="text"
                                value={formData.equipement || ''}
                                onChange={(e) => setFormData({...formData, equipement: e.target.value})}
                                className="w-full bg-transparent"
                            />
                        </td>
                    </tr>
                    
                    {/* Ligne 2: DATE, MARQUE et NS */}
                    <tr>
                        <td className="border border-black p-1 font-bold bg-cyan-100">DATE :</td>
                        <td className="border border-black p-1 bg-cyan-50">
                            <input 
                                type="text"
                                value={formData.date || ''}
                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                                className="w-full bg-transparent"
                            />
                        </td>
                        <td className="border border-black p-1 font-bold bg-purple-100">MARQUE :</td>
                        <td className="border border-black p-1 bg-purple-50" colSpan="2">
                            <input 
                                type="text"
                                value={formData.marque || ''}
                                onChange={(e) => setFormData({...formData, marque: e.target.value})}
                                className="w-full bg-transparent"
                            />
                        </td>
                        <td className="border border-black p-1 font-bold bg-orange-100" style={{ width: '10%' }}>NS :</td>
                        <td className="border border-black p-1 bg-orange-50">
                            <input 
                                type="text"
                                value={formData.ns || ''}
                                onChange={(e) => setFormData({...formData, ns: e.target.value})}
                                className="w-full bg-transparent"
                            />
                        </td>
                    </tr>
                    
                    {/* Ligne 3: HEURE DÉBUT et HEURE FIN */}
                    <tr>
                        <td className="border border-black p-1 font-bold bg-pink-100">HEURE DÉBUT :</td>
                        <td className="border border-black p-1 bg-pink-50" colSpan="2">
                            <input 
                                type="text"
                                value={formData.heureDebut || ''}
                                onChange={(e) => setFormData({...formData, heureDebut: e.target.value})}
                                className="w-full bg-transparent"
                                placeholder="HH:MM"
                            />
                        </td>
                        <td className="border border-black p-1 font-bold bg-yellow-100" colSpan="2">HEURE FIN :</td>
                        <td className="border border-black p-1 bg-yellow-50" colSpan="2">
                            <input 
                                type="text"
                                value={formData.heureFin || ''}
                                onChange={(e) => setFormData({...formData, heureFin: e.target.value})}
                                className="w-full bg-transparent"
                                placeholder="HH:MM"
                            />
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Motif et Situation */}
            <table className="w-full border-collapse border border-black text-xs mb-3">
                <tbody>
                    <tr>
                        <td className="border border-black p-2 align-top w-1/2">
                            <p className="font-bold mb-2">MOTIF</p>
                            {motifs.map(motif => (
                                <label key={motif} className="flex items-center gap-2 mb-1">
                                    <input 
                                        type="checkbox"
                                        checked={(formData.motifs || []).includes(motif)}
                                        onChange={() => toggleMotif(motif)}
                                        className="w-3 h-3"
                                    />
                                    <span className="text-xs">{motif}</span>
                                </label>
                            ))}
                        </td>
                        <td className="border border-black p-2 align-top">
                            <p className="font-bold mb-2">SITUATION DE L'APPAREIL :</p>
                            {situations.map(situation => (
                                <label key={situation} className="flex items-center gap-2 mb-1">
                                    <input 
                                        type="checkbox"
                                        checked={(formData.situations || []).includes(situation)}
                                        onChange={() => toggleSituation(situation)}
                                        className="w-3 h-3"
                                    />
                                    <span className="text-xs">{situation}</span>
                                </label>
                            ))}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Problème posé / Travail effectué */}
            <table className="w-full border-collapse border border-black text-xs mb-3">
                <tbody>
                    <tr>
                        <td className="border border-black p-2 align-top w-1/2">
                            <p className="font-bold mb-2">Problème posé:</p>
                            <textarea 
                                value={formData.probleme || ''}
                                onChange={(e) => setFormData({...formData, probleme: e.target.value})}
                                className="w-full h-20 p-1 text-xs"
                            />
                            <p className="font-bold mb-2 mt-3">Panne constatée:</p>
                            <textarea 
                                value={formData.panne || ''}
                                onChange={(e) => setFormData({...formData, panne: e.target.value})}
                                className="w-full h-20 p-1 text-xs"
                            />
                        </td>
                        <td className="border border-black p-2 align-top">
                            <p className="font-bold mb-2">TRAVAIL EFFECTUÉ</p>
                            <textarea 
                                value={formData.travail || ''}
                                onChange={(e) => setFormData({...formData, travail: e.target.value})}
                                className="w-full h-44 p-1 text-xs"
                            />
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Pièces de rechanges */}
            <p className="font-bold text-xs mb-2">Pièces de rechanges</p>
            <table className="w-full border-collapse border border-black text-xs mb-3">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-1">DÉSIGNATION</th>
                        <th className="border border-black p-1">RÉFÉRENCE</th>
                        <th className="border border-black p-1">QUANTITÉ</th>
                    </tr>
                </thead>
                <tbody>
                    {formData.pieces.map((piece, index) => (
                        <tr key={index}>
                            <td className="border border-black">
                                <input 
                                    value={piece.designation}
                                    onChange={(e) => handlePieceChange(index, 'designation', e.target.value)}
                                    className="w-full p-1"
                                />
                            </td>
                            <td className="border border-black">
                                <input 
                                    value={piece.reference}
                                    onChange={(e) => handlePieceChange(index, 'reference', e.target.value)}
                                    className="w-full p-1"
                                />
                            </td>
                            <td className="border border-black">
                                <div className="flex items-center">
                                    <input 
                                        type="number"
                                        value={piece.quantite}
                                        onChange={(e) => handlePieceChange(index, 'quantite', e.target.value)}
                                        className="w-full p-1"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => removePiece(index)}
                                        className="text-red-500 hover:text-red-700 ml-1 not-printable"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button 
                type="button"
                onClick={addPiece}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs mb-3 not-printable"
            >
                <PlusCircle size={14}/> Ajouter une pièce
            </button>

            {/* Conclusion */}
            <div className="mb-3">
                <p className="font-bold text-xs mb-1">Conclusion :</p>
                <textarea 
                    value={formData.conclusion || ''}
                    onChange={(e) => setFormData({...formData, conclusion: e.target.value})}
                    className="w-full border-b border-dotted border-black p-1 text-xs"
                    rows="3"
                />
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 text-xs mt-6">
                <div className="text-center">
                    <div className="h-16 mb-2"></div>
                    <p className="border-t border-black pt-1">Cellule de Maintenance Biomédicale</p>
                </div>
                <div className="text-center">
                    <div className="h-16 mb-2"></div>
                    <p className="border-t border-black pt-1">Service Utilisateur</p>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-4 text-xs">
                <p className="font-bold">Hôpital Saint-Jean de Malte</p>
                <p>BP 56 - Njombé - Cameroun</p>
                <p>Tél.: 00(237)657 56 91 03 - Email: hospitalcameroun@ordredemaltefrance.org</p>
                <p className="text-[10px] mt-1">
                    Dépendant des œuvres Hospitalières françaises de l'Ordre de Malte, association d'utilité publique
                    en partenariat avec le Ministère de la santé publique et avec les plantations du groupe PHP
                </p>
            </div>
        </div>
    );
};

export default FicheSuiviEquipements;