// frontend/src/pages/templates/DemandeBesoin.jsx - TEMPLATE COMPLET
import React from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import logo from '../../assets/logo-ordre-malte.png';

const DemandeBesoin = ({ formData, setFormData, pdfContainerRef }) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLineChange = (index, field, value) => {
        const newLines = [...formData.lines];
        newLines[index][field] = value;
        // Auto-calculate total when quantity or price changes
        if(field === 'quantite' || field === 'prixUnitaire') {
            const qty = Number(newLines[index].quantite) || 0;
            const price = Number(newLines[index].prixUnitaire) || 0;
            newLines[index].montantTotal = qty * price;
        }
        setFormData({ ...formData, lines: newLines });
    };

    const addLine = () => { setFormData({ ...formData, lines: [...formData.lines, { designation: '', quantite: '', prixUnitaire: '', montantTotal: '' }] }); };
    const removeLine = (index) => { const newLines = formData.lines.filter((_, i) => i !== index); setFormData({ ...formData, lines: newLines }); };
    const grandTotal = formData.lines.reduce((acc, line) => acc + (Number(line.montantTotal) || 0), 0);

    return (
        <div ref={pdfContainerRef} className="bg-white p-12 shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
            <div className="flex items-center justify-between mb-6"><img src={logo} alt="Logo" className="h-20" /><div className="text-right"><h1 className="text-xl font-bold">HÔPITAL SAINT JEAN DE MALTE</h1><p className="text-sm">Njombé - Cameroun</p></div></div>
            <div className="border-t-2 border-b-2 border-gray-800 py-3 mb-8 text-center"><h2 className="text-2xl font-bold">DEMANDE DE BESOIN</h2></div>
            
            <div className="mb-6 space-y-3 text-sm">
                <div className="flex items-end"><span className="font-semibold w-48">Date de la demande :</span><div className="flex-1"><input name="date_demande" value={formData.date_demande || ''} onChange={handleChange} className="not-printable w-full border-b border-gray-400 px-2" /><div className="print-only static-field">{formData.date_demande || '\u00A0'}</div></div></div>
                <div className="flex items-end"><span className="font-semibold w-48">Service demandeur :</span><div className="flex-1"><input name="service" value={formData.service || ''} onChange={handleChange} className="not-printable w-full border-b border-gray-400 px-2" /><div className="print-only static-field">{formData.service || '\u00A0'}</div></div></div>
                <div className="flex items-end"><span className="font-semibold w-48">Référence demande :</span><div className="flex-1"><input name="reference" value={formData.reference || ''} onChange={handleChange} className="not-printable w-full border-b border-gray-400 px-2" /><div className="print-only static-field">{formData.reference || '\u00A0'}</div></div></div>
            </div>
            
            <div className="mb-6">
                <h3 className="font-bold text-base mb-3 border-b border-gray-400 pb-1">Liste des besoins :</h3>
                <table className="w-full border-collapse border border-black text-sm">
                    <thead><tr className="bg-gray-100"><th className="border border-black p-2 w-[45%]">Désignation</th><th className="border border-black p-2 w-[15%]">Quantité</th><th className="border border-black p-2 w-[20%]">P.U. (FCFA)</th><th className="border border-black p-2 w-[20%]">Montant (FCFA)</th></tr></thead>
                    <tbody>
                        {formData.lines.map((line, index) => (
                            <tr key={index}>
                                <td className="border border-black">
                                    <input value={line.designation || ''} onChange={(e) => handleLineChange(index, 'designation', e.target.value)} className="not-printable w-full p-2 h-10" />
                                    <div className="print-only p-2 h-10">{line.designation}</div>
                                </td>
                                <td className="border border-black">
                                    <input type="number" value={line.quantite || ''} onChange={(e) => handleLineChange(index, 'quantite', e.target.value)} className="not-printable w-full p-2 h-10 text-center" />
                                    <div className="print-only p-2 h-10 text-center">{line.quantite}</div>
                                </td>
                                <td className="border border-black">
                                    <input type="number" value={line.prixUnitaire || ''} onChange={(e) => handleLineChange(index, 'prixUnitaire', e.target.value)} className="not-printable w-full p-2 h-10 text-right" />
                                    <div className="print-only p-2 h-10 text-right">{Number(line.prixUnitaire || 0).toLocaleString('fr-FR')}</div>
                                </td>
                                <td className="border border-black">
                                    <div className="flex items-center justify-between p-2 h-10">
                                        <span className="flex-1 text-right">{Number(line.montantTotal || 0).toLocaleString('fr-FR')}</span>
                                        <button type="button" onClick={() => removeLine(index)} className="text-red-500 hover:text-red-700 ml-2 not-printable"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot><tr className="bg-gray-100 font-bold"><td colSpan="3" className="border border-black p-2 text-right">TOTAL GÉNÉRAL :</td><td className="border border-black p-2 text-right">{grandTotal.toLocaleString('fr-FR')} FCFA</td></tr></tfoot>
                </table>
                <button type="button" onClick={addLine} className="mt-3 flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm not-printable"><PlusCircle size={16}/> Ajouter une ligne</button>
            </div>

            <div className="mb-6">
                <h3 className="font-bold text-base mb-3 border-b border-gray-400 pb-1">Justification de la demande :</h3>
                <textarea value={formData.justification || ''} onChange={handleChange} name="justification" className="not-printable w-full border border-gray-400 p-3 min-h-[100px] text-sm" placeholder="Expliquez la raison de cette demande..." />
                <div className="print-only static-field min-h-[100px]">{formData.justification || '\u00A0'}</div>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-8 text-center text-sm">
                <div><div className="h-20 mb-2"></div><div className="border-t-2 border-dotted border-gray-400 pt-2"><p className="font-semibold">Demandeur</p></div></div>
                <div><div className="h-20 mb-2"></div><div className="border-t-2 border-dotted border-gray-400 pt-2"><p className="font-semibold">Chef de Service</p></div></div>
                <div><div className="h-20 mb-2"></div><div className="border-t-2 border-dotted border-gray-400 pt-2"><p className="font-semibold">Validation GLB</p></div></div>
            </div>
            <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600 text-center not-printable">Document généré le {new Date().toLocaleDateString('fr-FR')}</div>
        </div>
    );
};

export default DemandeBesoin;