// frontend/src/pages/templates/DemandePermission.jsx
import React, { useState } from 'react';
import logo from '../../assets/logo-ordre-malte.png';

const DemandePermission = ({ formData, setFormData, pdfContainerRef }) => {
    const [isPdfMode, setIsPdfMode] = useState(false);
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const exceptionalReasons = [
        "mariage du travailleur (5 jours)",
        "accouchement de l'épouse du travailleur (3 jours)",
        "mariage d'un enfant du travailleur (2 jours)",
        "décès du conjoint du travailleur (5 jours)",
        "décès du père ou de la mère du travailleur (5 jours)",
        "décès d'un frère ou d'une sœur (2 jour)",
        "médaille d'honneur du travail (2 jours)"
    ];

    let nombreDeJours = "...";
    if (formData.date_debut && formData.date_fin) {
        const start = new Date(formData.date_debut);
        const end = new Date(formData.date_fin);
        if (start <= end) {
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            nombreDeJours = diffDays > 1 ? `${diffDays} jours` : `${diffDays} jour`;
        }
    }

    // Formater les dates pour affichage
    const formatDate = (dateStr) => {
        if (!dateStr) return '____________________';
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <div 
            ref={pdfContainerRef} 
            className="bg-white p-12 shadow-lg mx-auto relative" 
            style={{ 
                width: '210mm', 
                minHeight: '297mm', 
                fontFamily: 'Arial, sans-serif' 
            }}
        >
            
            <header className="flex items-center justify-between mb-12">
                <img src={logo} alt="Logo" style={{ width: '80px' }} />
                <h1 className="text-center">
                    <span className="text-xl font-bold block">ORDRE DE MALTE</span>
                    <span className="text-lg text-red-600">HÔPITAL SAINT JEAN DE MALTE</span>
                </h1>
            </header>

            <div className="flex justify-between mb-10 text-base">
                <div className="w-1/2">
                    <label className="font-semibold">NOMS et prénom(s)</label>
                    <input 
                        name="noms_prenoms" 
                        value={formData.noms_prenoms || ''} 
                        onChange={handleChange} 
                        className="w-full mt-1 p-1 border-b-2 border-dotted border-gray-400" 
                    />
                    <label className="mt-4 block font-semibold">Service</label>
                    <input 
                        name="service" 
                        value={formData.service || ''} 
                        onChange={handleChange} 
                        className="w-full mt-1 p-1 border-b-2 border-dotted border-gray-400" 
                    />
                </div>
                <div className="w-1/3 text-right">
                    <input 
                        name="date_lieu" 
                        value={formData.date_lieu || ''} 
                        onChange={handleChange} 
                        placeholder="Njombé, le ..."
                        className="w-full mt-1 p-1 border-b-2 border-dotted border-gray-400" 
                    />
                </div>
            </div>

            <div className="text-right mb-8 text-base">
                <p className="font-semibold">A Monsieur le Directeur Général</p>
                <p>De l'Hôpital Saint Jean de Malte de Njombé</p>
            </div>

            <div className="mb-6">
                <label className="font-bold text-base">Objet :</label>
                <input 
                    name="objet" 
                    value={formData.objet || ''} 
                    onChange={handleChange} 
                    className="w-full mt-1 p-1 border-b-2 border-dotted border-gray-400 text-base" 
                />
            </div>
            
            <div className="mb-8">
                <p className="text-base mb-6">Monsieur,</p>
                
                <div className="text-base leading-loose">
                    <p className="mb-4">
                        Je viens par cette demande solliciter une permission de <span className="font-bold">« {nombreDeJours} »</span> allant du <span className="font-bold underline">{formatDate(formData.date_debut)}</span> au <span className="font-bold underline">{formatDate(formData.date_fin)}</span>.
                    </p>

                    {/* Zone d'édition (cachée lors de la génération PDF) */}
                    <div className="not-printable my-6 p-4 bg-blue-50 border-2 border-blue-200 rounded">
                        <div className="mb-4">
                            <label className="block mb-2 font-semibold text-blue-900">📅 Dates :</label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="text-sm text-gray-600">Du :</label>
                                    <input 
                                        type="date" 
                                        name="date_debut" 
                                        value={formData.date_debut || ''} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-sm text-gray-600">Au :</label>
                                    <input 
                                        type="date" 
                                        name="date_fin" 
                                        value={formData.date_fin || ''} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block mb-2 font-semibold text-blue-900">📝 Type de permission :</label>
                            <select 
                                name="motif" 
                                value={formData.motif || 'Personnel'} 
                                onChange={handleChange} 
                                className="w-full px-3 py-2 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500 bg-white"
                            >
                                <option value="Personnel">Personnel</option>
                                <option value="Journée Directeur">Journée Directeur</option>
                                <option value="Journée Major">Journée Major</option>
                                <option value="Permission d'Urgence">Permission d'Urgence</option>
                                <option value="Exceptionnel">Permission exceptionnel</option>
                            </select>
                        </div>
                        
                        {formData.motif === 'Exceptionnel' && (
                            <div>
                                <label className="block mb-2 font-semibold text-blue-900">⚠️ Motif exceptionnel :</label>
                                <select 
                                    name="motif_exceptionnel" 
                                    value={formData.motif_exceptionnel || ''} 
                                    onChange={handleChange} 
                                    className="w-full px-3 py-2 border-2 border-red-300 rounded focus:outline-none focus:border-red-500 bg-white"
                                >
                                    <option value="">-- Sélectionner un motif --</option>
                                    {exceptionalReasons.map(reason => (
                                        <option key={reason} value={reason}>{reason}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Affichage pour le PDF */}
                    <p className="mb-4">
                        Pour des raisons <span className="font-bold">« {formData.motif || 'Personnel'} »</span>
                        {formData.motif === 'Exceptionnel' && formData.motif_exceptionnel && (
                            <span> : <span className="underline">{formData.motif_exceptionnel}</span></span>
                        )}.
                    </p>
                </div>
            </div>
            
            <p className="mt-12 text-base">
                Dans l'attente d'une suite favorable, veuillez agréer Monsieur l'expression de mon plus profond respect.
            </p>
            
            <div className="absolute bottom-24 left-12 right-12 grid grid-cols-3 gap-8 text-center text-base">
                <div>
                    <p className="font-semibold">Intéressé(e)</p>
                </div>
                <div>
                    <p className="font-semibold">Signatures des supérieurs</p>
                </div>
                <div>
                    <p className="font-semibold">Le Directeur Général</p>
                </div>
            </div>
        </div>
    );
};

export default DemandePermission;