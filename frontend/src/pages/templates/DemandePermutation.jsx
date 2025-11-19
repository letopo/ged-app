// frontend/src/pages/templates/DemandePermutation.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext'; // CORRECTION DU CHEMIN
import { usersAPI, servicesAPI } from '../../services/api';
import logo from '../../assets/logo-ordre-malte.png';

const DemandePermutation = ({ formData, setFormData, pdfContainerRef }) => {
    const { user } = useAuth(); // Récupération de l'utilisateur connecté
    const [services, setServices] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    const fetchData = useCallback(async () => {
        // Sortir si l'utilisateur n'est pas encore chargé dans le contexte
        if (!user) {
            setLoadingData(false);
            return;
        }
        
        try {
            // Chargement des services et de tous les utilisateurs
            const [servicesResponse, usersResponse, userServiceResponse] = await Promise.all([
                servicesAPI.getAll(),
                usersAPI.getAll(),
                usersAPI.getMyService()
            ]);
            
            setServices(servicesResponse.data.data || []);
            // La liste des permutés disponibles n'inclut pas le demandeur actuel
            const allUsers = usersResponse.data.users || [];
            setUsersList(allUsers.filter(u => u.id !== user.id));

            // Remplissage automatique des données du demandeur (sert de valeur par défaut modifiable)
            const serviceName = userServiceResponse.data.success && userServiceResponse.data.service 
                ? userServiceResponse.data.service.name 
                : '';
                
            setFormData(prev => ({
                ...prev,
                // Rempli par défaut par l'utilisateur connecté
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '___________';
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Style pour les champs de texte statiques (pour PDF)
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

            <div className="flex justify-between mb-10">
                <div style={{ width: '50%' }}>
                    <p className="font-semibold block mb-2" style={{ fontSize: '15px' }}>
                        NOMS et prénom(s) du demandeur
                    </p>
                    {/* INPUT POUR ÉDITION */}
                    <input 
                        name="demandeur_noms_prenoms" 
                        value={formData.demandeur_noms_prenoms || ''} 
                        onChange={handleChange} 
                        className="not-printable w-full border-b-2 border-gray-400 bg-transparent focus:outline-none focus:border-blue-500"
                        style={{
                            borderStyle: 'dotted',
                            fontSize: '16px',
                            fontWeight: '600',
                            padding: '2px 4px',
                            minHeight: '20px',
                            lineHeight: '1.5'
                        }}
                    />
                    {/* TEXTE STATIQUE POUR PDF */}
                    <div className="print-only" style={{ ...staticFieldStyle, display: 'none', borderBottom: 'none' }}>
                        {formData.demandeur_noms_prenoms || '\u00A0'}
                    </div>
                    
                    <p className="font-semibold block mb-2 mt-6" style={{ fontSize: '15px' }}>
                        Service
                    </p>
                    {/* INPUT POUR ÉDITION */}
                    <input 
                        name="service" 
                        value={formData.service || ''} 
                        onChange={handleChange} 
                        className="not-printable w-full border-b-2 border-gray-400 bg-transparent focus:outline-none focus:border-blue-500"
                        style={{
                            borderStyle: 'dotted',
                            fontSize: '16px',
                            fontWeight: '600',
                            padding: '2px 4px',
                            minHeight: '20px',
                            lineHeight: '1.5'
                        }}
                    />
                    {/* TEXTE STATIQUE POUR PDF */}
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

            <div className="mb-8">
                <label className="font-bold" style={{ fontSize: '15px' }}>Objet :</label>
                <div className="inline-block font-bold ml-2">Demande de permutation</div>
            </div>
            
            <div className="mb-8">
                <p className="mb-6" style={{ fontSize: '15px' }}>Monsieur,</p>
                
                <div style={{ fontSize: '15px', lineHeight: '2.0' }}>
                    
                    {/* REMPLACEMENT DU SELECT PAR UN INPUT TEXT */}
                    <div className="not-printable my-3 p-4 bg-gray-50 border rounded-lg">
                        <label className="font-semibold block mb-2 text-gray-700" style={{ fontSize: '15px' }}>
                            Personne avec qui permuter
                        </label>
                        <input
                            name="permute_noms_prenoms"
                            value={formData.permute_noms_prenoms || ''}
                            onChange={handleChange}
                            className="w-full border-b-2 border-gray-400 bg-transparent focus:outline-none focus:border-blue-500"
                            style={{
                                borderStyle: 'dotted',
                                fontSize: '16px',
                                fontWeight: '600',
                                padding: '8px 4px',
                                minHeight: '40px',
                                lineHeight: '1.5'
                            }}
                            placeholder="Saisir le nom et prénom de la personne"
                        />
                    </div>
                    
                    <p className="mb-4 text-justify">
                        Je viens par la présente vous solliciter respectueusement pour une permutation entre 
                        <span className="font-bold underline print-only mx-1" style={{ display: 'none' }}>{formData.permute_noms_prenoms || '______________________'}</span>
                        <span className="font-bold underline not-printable mx-1"> {formData.permute_noms_prenoms || '______________________'}</span> et 
                        <span className="font-bold underline mx-1"> {formData.demandeur_noms_prenoms}</span> en date du 
                        <input 
                            type="date" 
                            name="date_permutation" 
                            value={formData.date_permutation || ''} 
                            onChange={handleChange} 
                            className="not-printable mx-2 p-1 border-b-2 border-gray-400 bg-transparent focus:outline-none focus:border-blue-500"
                            style={{ width: '150px' }}
                        />
                        <span className="font-bold underline print-only mx-1" style={{ display: 'none' }}> {formatDate(formData.date_permutation)}</span>.
                    </p>

                    <p className="mb-4 text-justify">
                        En effet, <span className="font-bold underline print-only">{formData.permute_noms_prenoms || '______________________'}</span>
                        <span className="font-bold underline not-printable mx-1">{formData.permute_noms_prenoms || '______________________'}</span> assurera 
                        ma plage horaire ce jour-là, de 
                        <input 
                            type="time" 
                            name="plage_horaire_debut" 
                            value={formData.plage_horaire_debut || ''} 
                            onChange={handleChange} 
                            className="not-printable mx-2 p-1 border-b-2 border-gray-400 bg-transparent focus:outline-none focus:border-blue-500"
                            style={{ width: '100px' }}
                        /> à 
                        <input 
                            type="time" 
                            name="plage_horaire_fin" 
                            value={formData.plage_horaire_fin || ''} 
                            onChange={handleChange} 
                            className="not-printable mx-2 p-1 border-b-2 border-gray-400 bg-transparent focus:outline-none focus:border-blue-500"
                            style={{ width: '100px' }}
                        />
                        <span className="font-bold underline print-only" style={{ display: 'none' }}> {formData.plage_horaire_debut ? formData.plage_horaire_debut + ' à ' : ''}{formData.plage_horaire_fin || '_________________'}</span>,
                        laquelle sera remboursée ultérieurement, pour des raisons personnelles.
                    </p>
                </div>
            </div>
            
            <p className="mt-12" style={{ fontSize: '15px', lineHeight: '1.6' }}>
                Dans l'attente d'une suite favorable, veuillez agréer, Monsieur, l'expression de ma
                considération distinguée.
            </p>
            
            <div className="absolute bottom-24 left-12 right-12 grid grid-cols-3 gap-8 text-center" style={{ fontSize: '15px' }}>
                <div>
                    <p className="font-semibold">Signature du Major</p>
                </div>
                <div>
                    <p className="font-semibold">Signature du Chef de service</p>
                </div>
                <div>
                    <p className="font-semibold">La Directrice Des Soins</p>
                </div>
            </div>
        </div>
    );
};

export default DemandePermutation;