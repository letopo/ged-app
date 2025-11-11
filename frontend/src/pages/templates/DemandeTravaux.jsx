// frontend/src/pages/templates/DemandeTravaux.jsx - TEMPLATE COMPLET
import React from 'react';
import logo from '../../assets/logo-ordre-malte.png';

const DemandeTravaux = ({ formData, setFormData, pdfContainerRef }) => {
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    return (
        <div ref={pdfContainerRef} className="bg-white p-12 shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
            <div className="flex items-center justify-between mb-6">
                <img src={logo} alt="Logo" className="h-20" />
                <div className="text-right">
                    <h1 className="text-xl font-bold">HÔPITAL SAINT JEAN DE MALTE</h1>
                    <p className="text-sm">Njombé - Cameroun</p>
                </div>
            </div>
            <div className="border-t-2 border-b-2 border-gray-800 py-3 mb-8 text-center">
                <h2 className="text-2xl font-bold">DEMANDE DE TRAVAUX</h2>
            </div>
            <div className="mb-6 space-y-3 text-sm">
                <div className="flex items-end">
                    <span className="font-semibold w-48">Date de la demande :</span>
                    <div className="flex-1">
                        <input name="date_demande" value={formData.date_demande || ''} onChange={handleChange} className="not-printable w-full border-b border-gray-400 px-2" />
                        <div className="print-only static-field">{formData.date_demande || '\u00A0'}</div>
                    </div>
                </div>
                <div className="flex items-end">
                    <span className="font-semibold w-48">Service demandeur :</span>
                    <div className="flex-1">
                        <input name="service" value={formData.service || ''} onChange={handleChange} className="not-printable w-full border-b border-gray-400 px-2" />
                        <div className="print-only static-field">{formData.service || '\u00A0'}</div>
                    </div>
                </div>
                <div className="flex items-end">
                    <span className="font-semibold w-48">Demandeur :</span>
                    <div className="flex-1">
                        <input name="demandeur" value={formData.demandeur || ''} onChange={handleChange} className="not-printable w-full border-b border-gray-400 px-2" />
                        <div className="print-only static-field">{formData.demandeur || '\u00A0'}</div>
                    </div>
                </div>
            </div>
            <div className="mb-6">
                <h3 className="font-bold text-base mb-3 border-b border-gray-400 pb-1">Type de demande :</h3>
                <div className="flex gap-8 text-sm">
                    <label className="flex items-center gap-2">
                        <input type="checkbox" name="mg" checked={formData.mg || false} onChange={handleChange} className="w-4 h-4" />
                        <span>Moyens Généraux (MG)</span>
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" name="biomedical" checked={formData.biomedical || false} onChange={handleChange} className="w-4 h-4" />
                        <span>Biomédical</span>
                    </label>
                </div>
            </div>
            <div className="mb-6">
                <h3 className="font-bold text-base mb-3 border-b border-gray-400 pb-1">Description des travaux demandés :</h3>
                <div>
                    <textarea name="description_travaux" value={formData.description_travaux || ''} onChange={handleChange} className="not-printable w-full border border-gray-400 p-4 min-h-[200px] text-sm" />
                    <div className="print-only border border-gray-400 p-4 min-h-[200px] text-sm whitespace-pre-wrap">{formData.description_travaux || 'Aucune description fournie'}</div>
                </div>
            </div>
            <div className="mt-16 grid grid-cols-3 gap-8 text-center text-sm">
                <div><div className="h-24 mb-2"></div><div className="border-t-2 border-dotted border-gray-400 pt-2"><p className="font-semibold">Demandeur</p></div></div>
                <div><div className="h-24 mb-2"></div><div className="border-t-2 border-dotted border-gray-400 pt-2"><p className="font-semibold">MG</p></div></div>
                <div><div className="h-24 mb-2"></div><div className="border-t-2 border-dotted border-gray-400 pt-2"><p className="font-semibold">Validation Finale</p></div></div>
            </div>
            <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600 text-center not-printable">Document généré le {new Date().toLocaleDateString('fr-FR')}</div>
        </div>
    );
};

export default DemandeTravaux;