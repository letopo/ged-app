// frontend/src/pages/templates/PieceDeCaisse.jsx - VERSION 100% COMPLÈTE
import React from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import logo from '../../assets/logo-ordre-malte.png';

const PieceDeCaisse = ({ formData, setFormData, pdfContainerRef }) => {
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
        <div ref={pdfContainerRef} className="bg-white p-12 shadow-lg mx-auto flex flex-col" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
            
            <div className="flex-grow">
                <h1 className="text-center font-bold text-xl mb-2">HOPITAL SAINT JEAN DE MALTE</h1>
                <h2 className="text-center font-bold text-lg mb-8">PIECE DE CAISSE N° ........................</h2>
                
                <div className="flex justify-between mb-4 text-sm">
                    <input name="nom" value={formData.nom} onChange={(e) => setFormData({...formData, nom: e.target.value})} className="w-2/3 p-1 border-b" placeholder="NOM..." />
                    <input name="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-1/4 p-1 border-b" placeholder="DATE..." />
                </div>
                <input name="concerne" value={formData.concerne} onChange={(e) => setFormData({...formData, concerne: e.target.value})} className="w-full p-1 border-b mb-8 text-sm" placeholder="CONCERNE..." />

                <table className="w-full border-collapse border border-black text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-1 w-[15%]">Réf. Comptabilité Générale</th>
                            <th className="border border-black p-1 w-[40%]">LIBELLES DES DEPENSES</th>
                            <th className="border border-black p-1 w-[15%]">Réf. GAGE</th>
                            <th className="border border-black p-1 w-[15%]">ENTREES</th>
                            <th className="border border-black p-1 w-[15%]">SORTIES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.lines.map((line, index) => (
                            <tr key={index}>
                                <td className="border border-black"><input value={line.refCompta} onChange={(e) => handleLineChange(index, 'refCompta', e.target.value)} className="w-full p-1 h-8"/></td>
                                <td className="border border-black"><input value={line.libelle} onChange={(e) => handleLineChange(index, 'libelle', e.target.value)} className="w-full p-1 h-8"/></td>
                                <td className="border border-black"><input value={line.refGage} onChange={(e) => handleLineChange(index, 'refGage', e.target.value)} className="w-full p-1 h-8"/></td>
                                <td className="border border-black"><input type="number" value={line.entrees} onChange={(e) => handleLineChange(index, 'entrees', e.target.value)} className="w-full p-1 h-8"/></td>
                                <td className="border border-black"><input type="number" value={line.sorties} onChange={(e) => handleLineChange(index, 'sorties', e.target.value)} className="w-full p-1 h-8"/></td>
                                <td className="pl-2 align-middle">
                                    <button type="button" onClick={() => removeLine(index)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button type="button" onClick={addLine} className="mt-2 flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm">
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
                                <td className="border border-black p-1 font-bold" colSpan="3">En lettres... <input name="totalEnLettres" value={formData.totalEnLettres} onChange={(e) => setFormData({...formData, totalEnLettres: e.target.value})} className="w-2/3 ml-2 p-1"/></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- CORRECTION DU BLOC SIGNATURE --- */}
            <div className="grid grid-cols-3 gap-8 text-center text-sm">
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
    );
};

export default PieceDeCaisse;