// frontend/src/pages/templates/DemandePermutation.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usersAPI, servicesAPI } from '../../services/api';
import logo from '../../assets/logo-ordre-malte.png';

const DemandePermutation = ({ formData, setFormData, pdfContainerRef }) => {
    const { user } = useAuth();
    const [services, setServices] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) {
            setLoadingData(false);
            return;
        }
        
        try {
            const [servicesResponse, usersResponse, userServiceResponse] = await Promise.all([
                servicesAPI.getAll(),
                usersAPI.getAll(),
                usersAPI.getMyService()
            ]);
            
            setServices(servicesResponse.data.data || []);
            const allUsers = usersResponse.data.users || [];
            setUsersList(allUsers.filter(u => u.id !== user.id));

            const serviceName = userServiceResponse.data.success && userServiceResponse.data.service 
                ? userServiceResponse.data.service.name 
                : '';
                
            setFormData(prev => ({
                ...prev,
                demandeur_noms_prenoms: `${user.firstName} ${user.lastName}`, 
                demandeur_id: user.id,
                service: serviceName
            }));

        } catch (error) {
            console.error('Erreur chargement des données:', error);
        } finally {
            setLoadingData(false);
        }
    }, [user, setFormData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (formData.demandeur_noms_prenoms || formData.permute_noms_prenoms) {
            setFormData(prev => ({
                ...prev,
                signatureZones: [
                    {
                        role: 'requester',
                        label: 'Le Demandeur',
                        x: 40,
                        y: 200,
                        width: 60,
                        height: 20,
                        page: 1
                    },
                    {
                        role: 'substitute',
                        label: 'Le Remplaçant',
                        x: 110,
                        y: 200,
                        width: 60,
                        height: 20,
                        page: 1
                    }
                ],
                validationWorkflow: ['requester', 'substitute', 'major', 'chef_service', 'dds']
            }));
        }
    }, [formData.demandeur_noms_prenoms, formData.permute_noms_prenoms, setFormData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '___________';
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const staticFieldStyle = {
        borderBottom: '2px dotted #9CA3AF',
        padding: '2px 4px',
        minHeight: '20px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#000000',
        lineHeight: '1.5'
    };

    if (loadingData) {
        return <div className="p-8 text-center text-gray-500">Chargement des données...</div>;
    }

    return (
        <div 
            ref={pdfContainerRef} 
            className="bg-white p-12 shadow-lg mx-auto relative" 
            style={{ 
                width: '210mm', 
                minHeight: '297mm', 
                fontFamily: 'Arial, sans-serif',
                fontSize: '15px'
            }}
        >
            <header className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                    <img src={logo} alt="Logo" style={{ width: '80px' }} />
                    <h1 className="text-left">
                        <span style={{ fontSize: '20px', fontWeight: 'bold', display: 'block' }}>
                            ORDRE DE MALTE
                        </span>
                        <span style={{ fontSize: '18px', color: '#DC2626' }}>
                            HÔPITAL SAINT JEAN DE MALTE
                        </span>
                    </h1>
                </div>
            </header>

            <div className="flex justify-between mb-8">
                <div style={{ width: '50%' }}>
                    <p className="font-semibold block mb-2" style={{ fontSize: '15px' }}>
                        NOMS et prénom(s) du demandeur
                    </p>
                    <input 
                        name="demandeur_noms_prenoms" 
                        value={formData.demandeur_noms_prenoms || ''} 
                        onChange={handleChange} 
                        className="not-printable w-full border-b-2 border-gray-400 bg-transparent focus:outline-none focus:border-blue-500"
                        style={{ ...staticFieldStyle, borderStyle: 'dotted' }}
                    />
                    <div className="print-only" style={{ ...staticFieldStyle, display: 'none', borderBottom: 'none' }}>
                        {formData.demandeur_noms_prenoms || '\u00A0'}
                    </div>
                    
                    <p className="font-semibold block mb-2 mt-6" style={{ fontSize: '15px' }}>
                        Service
                    </p>
                    <input 
                        name="service" 
                        value={formData.service || ''} 
                        onChange={handleChange} 
                        className="not-printable w-full border-b-2 border-gray-400 bg-transparent focus:outline-none focus:border-blue-500"
                        style={{ ...staticFieldStyle, borderStyle: 'dotted' }}
                    />
                    <div className="print-only" style={{ ...staticFieldStyle, display: 'none', borderBottom: 'none' }}>
                        {formData.service || '\u00A0'}
                    </div>
                </div>
                <div style={{ width: '35%', textAlign: 'right' }}>
                    <p>
                        Njombé le <span className="font-bold underline print-only" style={{ display: 'inline' }}>
                            {formatDate(new Date())}
                        </span>
                    </p>
                    <p className="font-semibold mt-6">A Monsieur le Directeur Général</p>
                    <p>De l'Hôpital Saint Jean de Malte de Njombé</p>
                </div>
            </div>

            <div className="mb-6">
                <label className="font-bold" style={{ fontSize: '15px' }}>Objet :</label>
                <div className="inline-block font-bold ml-2">Demande de permutation</div>
            </div>
            
            <div className="mb-4">
                <p className="mb-6 font-bold" style={{ fontSize: '15px' }}>Monsieur,</p>
                
                {/* Sélecteur de personne (Visible uniquement à l'écran pour la saisie) */}
                <div className="not-printable mb-4 p-3 bg-gray-50 border rounded-lg">
                    <label className="font-semibold block mb-1 text-gray-700" style={{ fontSize: '14px' }}>
                        Personne avec qui permuter :
                    </label>
                    <input
                        name="permute_noms_prenoms"
                        value={formData.permute_noms_prenoms || ''}
                        onChange={handleChange}
                        className="w-full border-b-2 border-gray-400 bg-transparent focus:outline-none focus:border-blue-500"
                        style={{ fontSize: '15px', fontWeight: '600' }}
                        placeholder="Saisir le nom et prénom"
                    />
                </div>

                {/* CORPS DE LA LETTRE - STRUCTURE "INLINE" STRICTE */}
                <div style={{ fontSize: '15px', lineHeight: '2.5', textAlign: 'justify' }}>
                    
                    {/* PARAGRAPHE 1 */}
                    <span>
                        Je viens par la présente vous solliciter respectueusement pour une permutation entre 
                        
                        {/* NOM REMPLAÇANT */}
                        <span className="font-bold underline mx-1">
                            {formData.permute_noms_prenoms || '______________________'}
                        </span> 
                        
                        et 
                        
                        {/* NOM DEMANDEUR */}
                        <span className="font-bold underline mx-1"> 
                            {formData.demandeur_noms_prenoms}
                        </span> 
                        
                        en date du 
                        
                        {/* DATE DÉBUT */}
                        <span className="inline-block mx-1">
                            {/* Input écran */}
                            <input 
                                type="date" 
                                name="date_permutation" 
                                value={formData.date_permutation || ''} 
                                onChange={handleChange} 
                                className="not-printable border-b border-gray-400 bg-transparent focus:outline-none font-bold"
                                style={{ width: '130px', display: 'inline-block' }}
                            />
                            {/* Texte impression */}
                            <span className="print-only font-bold underline" style={{ display: 'none' }}> 
                                {formatDate(formData.date_permutation)}
                            </span>
                        </span>

                        au

                        {/* DATE FIN */}
                        <span className="inline-block mx-1">
                            {/* Input écran */}
                            <input 
                                type="date" 
                                name="date_permutation_fin" 
                                value={formData.date_permutation_fin || ''} 
                                onChange={handleChange} 
                                className="not-printable border-b border-gray-400 bg-transparent focus:outline-none font-bold"
                                style={{ width: '130px', display: 'inline-block' }}
                            />
                            {/* Texte impression */}
                            <span className="print-only font-bold underline" style={{ display: 'none' }}> 
                                {formatDate(formData.date_permutation_fin)}
                            </span>
                        </span>.
                    </span>

                    <br /> {/* Saut de ligne explicite entre les paragraphes */}

                    {/* PARAGRAPHE 2 - CORRECTION ICI : Affichage des heures */}
                    <span style={{ display: 'inline-block', marginTop: '10px' }}>
                        En effet, 
                        <span className="font-bold underline mx-1">
                            {formData.permute_noms_prenoms || '______________________'}
                        </span> 
                        assurera ma plage horaire ce jour-là, de 
                        
                        {/* HEURE DÉBUT */}
                        <span className="inline-block mx-1">
                            {/* Input écran */}
                            <input 
                                type="time" 
                                name="plage_horaire_debut" 
                                value={formData.plage_horaire_debut || ''} 
                                onChange={handleChange} 
                                className="not-printable border-b border-gray-400 bg-transparent focus:outline-none text-center font-bold"
                                style={{ width: '100px', display: 'inline-block', cursor: 'pointer' }}
                            /> 
                            {/* Texte impression - CORRECTION ICI */}
                            <span className="print-only font-bold" style={{ display: 'none' }}> 
                                {formData.plage_horaire_debut || '______'}
                            </span>
                        </span>
                        
                        à 
                        
                        {/* HEURE FIN */}
                        <span className="inline-block mx-1">
                            {/* Input écran */}
                            <input 
                                type="time" 
                                name="plage_horaire_fin" 
                                value={formData.plage_horaire_fin || ''} 
                                onChange={handleChange} 
                                className="not-printable border-b border-gray-400 bg-transparent focus:outline-none text-center font-bold"
                                style={{ width: '100px', display: 'inline-block', cursor: 'pointer' }}
                            />
                            {/* Texte impression - CORRECTION ICI */}
                            <span className="print-only font-bold" style={{ display: 'none' }}> 
                                {formData.plage_horaire_fin || '______'}
                            </span>
                        </span>,
                        
                        laquelle sera remboursée ultérieurement, pour des raisons personnelles.
                    </span>
                </div>
            </div>
            
            <p className="mt-6 mb-8" style={{ fontSize: '15px', lineHeight: '1.6' }}>
                Dans l'attente d'une suite favorable, veuillez agréer, Monsieur, l'expression de ma
                considération distinguée.
            </p>

            {/* CADRES POUR SIGNATURES DEMANDEUR / REMPLAÇANT */}
            <div className="flex justify-between items-start px-4 mb-20">
                {/* Cadre Demandeur */}
                <div className="flex flex-col items-center">
                    <div 
                        id="signature-zone-requester"
                        style={{
                            border: '1px solid transparent',
                            borderRadius: '6px',
                            width: '200px',
                            height: '50px',
                            marginBottom: '5px',
                            backgroundColor: 'transparent'
                        }}
                    >
                        {/* Zone vide pour la signature future */}
                    </div>
                    <p className="font-bold text-sm text-center">
                        {formData.demandeur_noms_prenoms || 'Le Demandeur'}
                    </p>
                </div>

                {/* Cadre Remplaçant */}
                <div className="flex flex-col items-center">
                    <div 
                        id="signature-zone-substitute"
                        style={{
                            border: '1px solid transparent',
                            borderRadius: '6px',
                            width: '200px',
                            height: '50px',
                            marginBottom: '5px',
                            backgroundColor: 'transparent'
                        }}
                    >
                        {/* Zone vide pour la signature future */}
                    </div>
                    <p className="font-bold text-sm text-center">
                        {formData.permute_noms_prenoms || 'Le Remplaçant'}
                    </p>
                </div>
            </div>
            
            {/* SIGNATURES ADMINISTRATIVES EN BAS */}
            <div className="absolute bottom-16 left-12 right-12 grid grid-cols-3 gap-8 text-center" style={{ fontSize: '15px' }}>
                <div>
                    <p className="font-bold">Signature du Major</p>
                </div>
                <div>
                    <p className="font-bold">Signature du Chef de service</p>
                </div>
                <div>
                    <p className="font-bold">La Directrice Des Soins</p>
                </div>
            </div>
        </div>
    );
};

export default DemandePermutation;