// frontend/src/pages/templates/DemandePermission.jsx - VERSION OPTIMALE AVEC SUPPORT DARK MODE ET FORCAGE COULEUR NOIRE
import React, { useState, useEffect } from 'react';
import { usersAPI, servicesAPI } from '../../services/api';
import logo from '../../assets/logo-ordre-malte.png';

const DemandePermission = ({ formData, setFormData, pdfContainerRef }) => {
    const [services, setServices] = useState([]);
    const [loadingServices, setLoadingServices] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const servicesResponse = await servicesAPI.getAll();
                setServices(servicesResponse.data.data || []);
                
                const userServiceResponse = await usersAPI.getMyService();
                if (userServiceResponse.data.success && userServiceResponse.data.service) {
                    setFormData(prev => ({
                        ...prev,
                        service: userServiceResponse.data.service.name
                    }));
                }
            } catch (error) {
                console.error('Erreur chargement des données:', error);
            } finally {
                setLoadingServices(false);
            }
        };
        
        fetchData();
    }, [setFormData]);
    
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

    const formatDate = (dateStr) => {
        if (!dateStr) return '____________________';
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Style pour les champs de texte statiques (pour PDF)
    const staticFieldStyle = {
        borderBottom: '2px dotted #9CA3AF',
        padding: '8px 4px',
        minHeight: '40px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#000000', // FORCER LA COULEUR NOIRE
        lineHeight: '1.5'
    };

    // Styles pour les inputs/selects en mode Dark (non-imprimable)
    const inputDarkModeStyle = "not-printable w-full border-b-2 border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 dark:border-gray-600 dark:text-dark-text dark:focus:border-blue-400";
    const inputBaseStyle = {
        borderStyle: 'dotted',
        fontSize: '16px',
        fontWeight: '600',
        padding: '8px 4px',
        minHeight: '40px',
        lineHeight: '1.5',
    };
    
    // Style pour les labels en mode Dark (UI)
    const labelDarkModeStyle = "font-semibold block mb-2 text-gray-900 dark:text-dark-text";
    
    // Style pour le select en mode Dark (UI)
    const selectDarkModeStyle = "w-full px-3 py-2 border-2 border-blue-300 dark:border-blue-700 rounded focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 bg-white dark:bg-dark-surface dark:text-dark-text";

    // Style commun pour le texte du PDF
    const pdfTextStyle = "text-gray-900 dark:text-dark-text"; // Sera écrasé par la logique PDF mais aide à la prévisualisation UI
    
    return (
        // Le conteneur du PDF DOIT rester bg-white
        <div 
            ref={pdfContainerRef} 
            className="bg-white p-12 shadow-lg mx-auto relative" 
            style={{ 
                width: '210mm', 
                minHeight: '297mm', 
                fontFamily: 'Arial, sans-serif',
                fontSize: '15px',
                color: '#000000' // FORCER TOUT LE TEXTE GÉNÉRAL AU NOIR
            }}
        >
            <header className="flex items-center justify-between mb-12">
                <img src={logo} alt="Logo" style={{ width: '80px' }} />
                <h1 className="text-center">
                    <span style={{ fontSize: '20px', fontWeight: 'bold', display: 'block', color: '#000000' }}>
                        ORDRE DE MALTE
                    </span>
                    <span style={{ fontSize: '18px', color: '#DC2626' }}>
                        HÔPITAL SAINT JEAN DE MALTE
                    </span>
                </h1>
            </header>

            <div className="flex justify-between mb-10">
                <div style={{ width: '50%' }}>
                    <label className={labelDarkModeStyle} style={{ fontSize: '15px' }}>
                        NOMS et prénom(s)
                    </label>
                    {/* Input pour édition - Support Dark Mode */}
                    <input 
                        name="noms_prenoms" 
                        value={formData.noms_prenoms || ''} 
                        onChange={handleChange} 
                        className={inputDarkModeStyle}
                        style={inputBaseStyle}
                    />
                    {/* Texte statique pour PDF */}
                    <div className="print-only" style={{ ...staticFieldStyle, display: 'none' }}>
                        {formData.noms_prenoms || '\u00A0'}
                    </div>
                    
                    <label className={labelDarkModeStyle} style={{ fontSize: '15px', marginTop: '1.5rem' }}>
                        Service
                    </label>
                    {loadingServices ? (
                        <div className="w-full p-2 text-gray-400 italic">Chargement...</div>
                    ) : (
                        <>
                            {/* Select pour édition - Support Dark Mode */}
                            <select
                                name="service"
                                value={formData.service || ''}
                                onChange={handleChange}
                                className={`${inputDarkModeStyle} appearance-none`}
                                style={{ ...inputBaseStyle, appearance: 'none' }}
                            >
                                <option value="" className="bg-white dark:bg-dark-surface">-- Sélectionner un service --</option>
                                {services.map((service) => (
                                    <option key={service.id} value={service.name} className="bg-white dark:bg-dark-surface">
                                        {service.name}
                                    </option>
                                ))}
                            </select>
                            {/* Texte statique pour PDF */}
                            <div className="print-only" style={{ ...staticFieldStyle, display: 'none' }}>
                                {formData.service || '\u00A0'}
                            </div>
                        </>
                    )}
                </div>
                <div style={{ width: '35%', textAlign: 'right' }}>
                    {/* Input pour édition - Support Dark Mode */}
                    <input 
                        name="date_lieu" 
                        value={formData.date_lieu || ''} 
                        onChange={handleChange} 
                        placeholder="Njombé, le ..."
                        className={`${inputDarkModeStyle} text-right`} 
                        style={inputBaseStyle}
                    />
                    {/* Texte statique pour PDF */}
                    <div className="print-only" style={{ ...staticFieldStyle, display: 'none', textAlign: 'right' }}>
                        {formData.date_lieu || '\u00A0'}
                    </div>
                </div>
            </div>

            <div className="text-right mb-8" style={{ fontSize: '15px' }}>
                <p className="font-semibold" style={{ color: '#000000' }}>A Monsieur le Directeur Général</p>
                <p style={{ color: '#000000' }}>De l'Hôpital Saint Jean de Malte de Njombé</p>
            </div>

            <div className="mb-6">
                <label className="font-bold text-gray-900 dark:text-dark-text" style={{ fontSize: '15px', color: '#000000' }}>Objet :</label>
                {/* Input pour édition - Support Dark Mode */}
                <input 
                    name="objet" 
                    value={formData.objet || ''} 
                    onChange={handleChange} 
                    className={inputDarkModeStyle} 
                    style={{ ...inputBaseStyle, marginTop: '8px' }}
                />
                {/* Texte statique pour PDF */}
                <div className="print-only" style={{ ...staticFieldStyle, display: 'none', marginTop: '8px' }}>
                    {formData.objet || '\u00A0'}
                </div>
            </div>
            
            <div className="mb-8">
                <p className="mb-6 text-gray-900 dark:text-dark-text" style={{ fontSize: '15px', color: '#000000' }}>Monsieur,</p>
                
                <div style={{ fontSize: '15px', lineHeight: '1.8' }}>
                    <p className="mb-4 text-gray-900 dark:text-dark-text" style={{ color: '#000000' }}>
                        Je viens par cette demande solliciter une permission de <span className="font-bold">« {nombreDeJours} »</span> allant du <span className="font-bold underline">{formatDate(formData.date_debut)}</span> au <span className="font-bold underline">{formatDate(formData.date_fin)}</span>.
                    </p>

                    {/* Zone d'édition (cachée lors de la génération PDF) - Support Dark Mode pour le conteneur */}
                    <div className="not-printable my-6 p-4 bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-200 dark:border-blue-700 rounded">
                        <div className="mb-4">
                            <label className="block mb-2 font-semibold text-blue-900 dark:text-blue-300">📅 Dates :</label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="text-sm text-gray-600 dark:text-dark-text-secondary">Du :</label>
                                    {/* Input Date - Support Dark Mode */}
                                    <input 
                                        type="date" 
                                        name="date_debut" 
                                        value={formData.date_debut || ''} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border-2 border-blue-300 dark:border-blue-700 rounded focus:outline-none focus:border-blue-500 dark:bg-dark-surface dark:text-dark-text"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-sm text-gray-600 dark:text-dark-text-secondary">Au :</label>
                                    {/* Input Date - Support Dark Mode */}
                                    <input 
                                        type="date" 
                                        name="date_fin" 
                                        value={formData.date_fin || ''} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border-2 border-blue-300 dark:border-blue-700 rounded focus:outline-none focus:border-blue-500 dark:bg-dark-surface dark:text-dark-text"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block mb-2 font-semibold text-blue-900 dark:text-blue-300">📝 Type de permission :</label>
                            {/* Select Type - Support Dark Mode */}
                            <select 
                                name="motif" 
                                value={formData.motif || 'Personnel'} 
                                onChange={handleChange} 
                                className={selectDarkModeStyle}
                            >
                                <option value="Personnel" className="bg-white dark:bg-dark-surface">Personnel</option>
                                <option value="Journée Directeur" className="bg-white dark:bg-dark-surface">Journée Directeur</option>
                                <option value="Journée Major" className="bg-white dark:bg-dark-surface">Journée Major</option>
                                <option value="Permission d'Urgence" className="bg-white dark:bg-dark-surface">Permission d'Urgence</option>
                                <option value="Exceptionnel" className="bg-white dark:bg-dark-surface">Permission exceptionnel</option>
                            </select>
                        </div>
                        
                        {formData.motif === 'Exceptionnel' && (
                            <div>
                                <label className="block mb-2 font-semibold text-blue-900 dark:text-blue-300">⚠️ Motif exceptionnel :</label>
                                {/* Select Motif Exceptionnel - Support Dark Mode */}
                                <select 
                                    name="motif_exceptionnel" 
                                    value={formData.motif_exceptionnel || ''} 
                                    onChange={handleChange} 
                                    className="w-full px-3 py-2 border-2 border-red-300 dark:border-red-700 rounded focus:outline-none focus:border-red-500 dark:bg-dark-surface dark:text-dark-text"
                                >
                                    <option value="" className="bg-white dark:bg-dark-surface">-- Sélectionner un motif --</option>
                                    {exceptionalReasons.map(reason => (
                                        <option key={reason} value={reason} className="bg-white dark:bg-dark-surface">{reason}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Affichage pour le PDF - FORCER LA COULEUR NOIRE */}
                    <p className="mb-4" style={{ color: '#000000' }}>
                        Pour des raisons <span className="font-bold">« {formData.motif || 'Personnel'} »</span>
                        {formData.motif === 'Exceptionnel' && formData.motif_exceptionnel && (
                            <span> : <span className="underline">{formData.motif_exceptionnel}</span></span>
                        )}.
                    </p>
                </div>
            </div>
            
            <p className="mt-12" style={{ fontSize: '15px', lineHeight: '1.6', color: '#000000' }}>
                Dans l'attente d'une suite favorable, veuillez agréer Monsieur l'expression de mon plus profond respect.
            </p>
            
            <div className="absolute bottom-24 left-12 right-12 grid grid-cols-3 gap-8 text-center" style={{ fontSize: '15px', color: '#000000' }}>
                {/* Pied de page du PDF - FORCER LA COULEUR NOIRE */}
                <div style={{ color: '#000000' }}>
                    <p className="font-semibold">Chef de Pôle</p>
                </div>
                <div style={{ color: '#000000' }}>
                    <p className="font-semibold">Signature du RH</p>
                </div>
                <div style={{ color: '#000000' }}>
                    <p className="font-semibold">Le Directeur Général</p>
                </div>
            </div>
        </div>
    );
};

export default DemandePermission;