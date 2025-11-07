// frontend/src/pages/CreateWorkRequest.jsx - VERSION AVEC TRI CORRECT DES VALIDATEURS

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { listsAPI, documentsAPI, workflowAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DemandeTravaux from './templates/DemandeTravaux';
import { Loader, Send, ArrowRight, CheckCircle, Info, Users } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const CreateWorkRequest = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const pdfContainerRef = useRef(null);

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        service: '',
        serviceId: '',
        type: '',
        motifId: '',
        motifText: '',
        customMotif: '',
        demandeur: `${user.firstName} ${user.lastName}`,
    });

    const [services, setServices] = useState([]);
    const [motifs, setMotifs] = useState([]);
    const [availableValidators, setAvailableValidators] = useState([]);
    const [dynamicValidators, setDynamicValidators] = useState([]);
    const [selectedValidators, setSelectedValidators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [chefDeService, setChefDeService] = useState(null);

    // Charger les services avec leurs membres au démarrage
    useEffect(() => {
        const fetchServices = async () => {
            try {
                const response = await listsAPI.getServicesWithMembers();
                setServices(response.data.data || []);
            } catch (err) {
                setError('Impossible de charger les services.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchServices();
    }, []);

    // Charger les motifs selon le type sélectionné
    useEffect(() => {
        if (formData.type) {
            const fetchMotifs = async () => {
                setLoading(true);
                try {
                    const response = await listsAPI.getMotifs(formData.type);
                    setMotifs(response.data.data || []);
                } catch (err) {
                    setError('Impossible de charger les motifs.');
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
            fetchMotifs();
        }
    }, [formData.type]);

    // Charger le Chef de Service quand un service est sélectionné
    useEffect(() => {
        if (formData.serviceId && formData.type) {
            const fetchChefDeService = async () => {
                try {
                    const selectedService = services.find(s => s.id === formData.serviceId);
                    if (selectedService && selectedService.members) {
                        const chef = selectedService.members.find(
                            member => member.fonction === 'Chef de Service' && member.isActive
                        );
                        setChefDeService(chef || null);
                    }
                } catch (err) {
                    console.error('Erreur récupération chef de service:', err);
                    setChefDeService(null);
                }
            };
            fetchChefDeService();
        }
    }, [formData.serviceId, formData.type, services]);

    // Charger les validateurs fixes selon le type
    useEffect(() => {
        if (formData.type) {
            const fetchValidators = async () => {
                try {
                    const response = await workflowAPI.getValidators();
                    const allValidators = response.data.data || [];
                    setAvailableValidators(allValidators);
                } catch (err) {
                    setError('Impossible de charger les validateurs.');
                    console.error(err);
                }
            };
            fetchValidators();
        }
    }, [formData.type]);

    // ✅ NOUVEAU : Fonction pour déterminer l'ordre des validateurs
    const getValidatorOrder = (email) => {
        const orderMap = {
            // Directeur du Soutien - TOUJOURS EN DERNIER
            'hsjm.directeurdusoutien@gmail.com': 999,
            'hsjm.directeursoutien@gmail.com': 999,
            
            // MG et SécuLog - Milieu
            'hsjm.moyengeneraux@gmail.com': 2,
            'hsjm.securitelogistique@gmail.com': 3,
            'hsjm.chefseculog@gmail.com': 3,
            
            // Biomédical
            'hsjm.cellulebiomedicale@gmail.com': 2,
            'hsjm.pharma@gmail.com': 3,
            
            // Chef de Service - TOUJOURS EN PREMIER
            'default': 1
        };
        
        return orderMap[email] || orderMap['default'];
    };

    // Construire la liste dynamique des validateurs avec tri correct
    useEffect(() => {
        if (formData.type && availableValidators.length > 0) {
            const validators = [];

            // 1. Ajouter le Chef de Service si disponible
            if (chefDeService) {
                validators.push({
                    id: chefDeService.userId,
                    firstName: chefDeService.user.firstName,
                    lastName: chefDeService.user.lastName,
                    email: chefDeService.user.email,
                    position: `Chef de Service - ${formData.service}`,
                    ordre: 1,
                    isChefService: true,
                });
            }

            // 2. Ajouter les validateurs selon le type
            if (formData.type === 'MG') {
                // MG → Chef de Service → MG → SecuLog → Directeur du Soutien
                const mgValidators = availableValidators.filter(v => 
                    v.email === 'hsjm.moyengeneraux@gmail.com' ||
                    v.email === 'hsjm.chefseculog@gmail.com' ||
                    v.email === 'hsjm.securitelogistique@gmail.com' ||
                    v.email === 'hsjm.directeurdusoutien@gmail.com' ||
                    v.email === 'hsjm.directeursoutien@gmail.com'
                );
                
                // ✅ MODIFIÉ : Assigner l'ordre selon la fonction
                mgValidators.forEach(v => {
                    validators.push({ 
                        ...v, 
                        ordre: getValidatorOrder(v.email)
                    });
                });
            } else if (formData.type === 'Biomedical') {
                // Biomédical → Chef de Service → Cellule Biomédical → Directrice Adjointe
                const bioValidators = availableValidators.filter(v => 
                    v.email === 'hsjm.cellulebiomedicale@gmail.com' ||
                    v.email === 'hsjm.pharma@gmail.com'
                );
                
                bioValidators.forEach(v => {
                    validators.push({ 
                        ...v, 
                        ordre: getValidatorOrder(v.email)
                    });
                });
            }

            // ✅ CRITIQUE : Trier par ordre (le Directeur du Soutien sera automatiquement à la fin)
            validators.sort((a, b) => a.ordre - b.ordre);
            
            // ✅ NOUVEAU : Réassigner les ordres d'affichage après tri
            const sortedValidators = validators.map((v, index) => ({
                ...v,
                displayOrder: index + 1 // Pour l'affichage dans l'UI
            }));
            
            setDynamicValidators(sortedValidators);

            // Présélectionner automatiquement tous les validateurs
            setSelectedValidators(sortedValidators.map(v => v.id));
            
            // ✅ NOUVEAU : Log pour debug
            console.log('📋 Ordre des validateurs construit:');
            sortedValidators.forEach((v, i) => {
                console.log(`   Étape ${i + 1}: ${v.firstName} ${v.lastName} (${v.email})`);
            });
        }
    }, [formData.type, chefDeService, availableValidators, formData.service]);

    const handleNextStep = (stepNumber) => {
        setError('');
        
        // Validations par étape
        if (step === 1 && !formData.service) {
            return setError("Veuillez choisir un service.");
        }
        if (step === 2 && !formData.type) {
            return setError("Veuillez choisir un type de problème.");
        }
        if (step === 3 && !formData.motifId) {
            return setError("Veuillez choisir ou créer un motif.");
        }
        if (step === 3 && formData.motifId === 'autre' && !formData.customMotif.trim()) {
            return setError("Veuillez spécifier le motif personnalisé.");
        }
        if (step === 4 && selectedValidators.length === 0) {
            return setError("Veuillez sélectionner au moins un validateur.");
        }
        
        setStep(stepNumber);
    };

    const handleServiceChange = (e) => {
        const selectedId = e.target.value;
        const selectedService = services.find(s => s.id === selectedId);
        setFormData(prev => ({
            ...prev,
            serviceId: selectedId,
            service: selectedService ? selectedService.name : ''
        }));
    };
    
    const handleMotifChange = (e) => {
        const selectedId = e.target.value;
        const selectedMotif = motifs.find(m => m.id === selectedId);
        setFormData(prev => ({
            ...prev,
            motifId: selectedId,
            motifText: selectedMotif ? selectedMotif.name : ''
        }));
    };

    const toggleValidator = (validatorId) => {
        setSelectedValidators(prev => {
            if (prev.includes(validatorId)) {
                return prev.filter(id => id !== validatorId);
            } else {
                return [...prev, validatorId];
            }
        });
    };

    const handleFinalSubmit = async () => {
        setSubmitting(true);
        setError('');
        let finalMotifText = formData.motifText;

        try {
            // Étape 1: Créer un nouveau motif si nécessaire
            if (formData.motifId === 'autre') {
                const response = await listsAPI.createMotif({
                    name: formData.customMotif,
                    type: formData.type
                });
                finalMotifText = response.data.data.name;
            }

            // Étape 2: Générer le PDF
            const nonPrintableElements = pdfContainerRef.current?.querySelectorAll('.not-printable');
            nonPrintableElements?.forEach(el => el.style.display = 'none');
            
            const canvas = await html2canvas(pdfContainerRef.current, { scale: 2 });
            nonPrintableElements?.forEach(el => el.style.display = 'block');
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
            const pdfBlob = pdf.output('blob');

            // Étape 3: Upload du document
            const uploadData = new FormData();
            const fileName = `Demande_Travaux_${formData.service.replace(/\s/g, '_')}_${Date.now()}.pdf`;
            uploadData.append('file', pdfBlob, fileName);
            uploadData.append('title', `Demande de travaux - ${formData.service}`);
            uploadData.append('category', 'Demande de travaux');
            uploadData.append('metadata', JSON.stringify({
                service: formData.service,
                type: formData.type,
                motif: finalMotifText,
                demandeur: formData.demandeur
            }));

            const uploadResponse = await documentsAPI.upload(uploadData);
            const documentId = uploadResponse.data.data.id;

            // ✅ MODIFIÉ : Étape 4 - Trier les validateurs sélectionnés dans le bon ordre
            const orderedValidators = dynamicValidators
                .filter(v => selectedValidators.includes(v.id))
                .sort((a, b) => a.ordre - b.ordre) // ✅ Tri par ordre (pas par displayOrder)
                .map(v => v.id);

            console.log('🚀 Soumission avec ordre final:');
            dynamicValidators
                .filter(v => selectedValidators.includes(v.id))
                .sort((a, b) => a.ordre - b.ordre)
                .forEach((v, i) => {
                    console.log(`   Étape ${i + 1}: ${v.firstName} ${v.lastName} (${v.email})`);
                });

            await workflowAPI.submitWorkflow({
                documentId,
                validatorIds: orderedValidators
            });

            alert('✅ Demande de travaux créée et soumise avec succès !');
            navigate('/documents');

        } catch (err) {
            setError(err.response?.data?.message || "Une erreur est survenue lors de la soumission.");
            console.error('Erreur soumission:', err);
        } finally {
            setSubmitting(false);
        }
    };
    
    // Données pour le template
    const templateData = {
        date_demande: new Date().toLocaleDateString('fr-FR'),
        service: formData.service,
        demandeur: formData.demandeur,
        description_travaux: formData.motifId === 'autre' ? formData.customMotif : formData.motifText,
        [formData.type?.toLowerCase()]: true 
    };

    return (
        <div className="max-w-4xl mx-auto p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold mb-2">Nouvelle Demande de Travaux</h1>
            <p className="text-gray-600 mb-8">Suivez les étapes pour compléter votre demande.</p>
            
            {/* Indicateur de progression */}
            <div className="mb-8 flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map(num => (
                    <div key={num} className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= num ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                            {num}
                        </div>
                        {num < 5 && <div className={`w-12 h-1 ${step > num ? 'bg-blue-600' : 'bg-gray-300'}`}></div>}
                    </div>
                ))}
            </div>

            {step < 5 && (
                <div className="bg-white p-8 rounded-lg shadow-md space-y-6">
                    
                    {/* Étape 1: Service */}
                    {step === 1 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Étape 1 : Quel est votre service ?</h2>
                            {loading ? (
                                <Loader className="animate-spin mx-auto" />
                            ) : (
                                <select 
                                    value={formData.serviceId} 
                                    onChange={handleServiceChange} 
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Sélectionnez un service --</option>
                                    {services.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Étape 2: Type */}
                    {step === 2 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Étape 2 : Type de problème</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => setFormData({...formData, type: 'MG'})} 
                                    className={`p-6 border-2 rounded-lg text-center transition ${formData.type === 'MG' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
                                >
                                    <p className="font-bold text-lg">Moyens Généraux</p>
                                    <p className="text-sm text-gray-600 mt-2">Plomberie, électricité, bâtiment...</p>
                                </button>
                                <button 
                                    onClick={() => setFormData({...formData, type: 'Biomedical'})} 
                                    className={`p-6 border-2 rounded-lg text-center transition ${formData.type === 'Biomedical' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
                                >
                                    <p className="font-bold text-lg">Biomédical</p>
                                    <p className="text-sm text-gray-600 mt-2">Équipements médicaux</p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Étape 3: Motif */}
                    {step === 3 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Étape 3 : Motif de la demande</h2>
                            {loading ? (
                                <Loader className="animate-spin mx-auto" />
                            ) : (
                                <div className="space-y-4">
                                    <select 
                                        value={formData.motifId} 
                                        onChange={handleMotifChange} 
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- Choisissez un motif --</option>
                                        {motifs.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                        <option value="autre">✏️ Autre (à préciser)</option>
                                    </select>
                                    {formData.motifId === 'autre' && (
                                        <textarea
                                            value={formData.customMotif}
                                            onChange={(e) => setFormData({...formData, customMotif: e.target.value})}
                                            placeholder="Décrivez précisément le problème..."
                                            className="w-full p-3 border rounded-lg h-32 focus:ring-2 focus:ring-blue-500"
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Étape 4: Sélection des validateurs */}
                    {step === 4 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Étape 4 : Sélectionnez les validateurs</h2>
                            
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4 flex gap-3">
                                <Info className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                                <div className="text-sm text-blue-800">
                                    {formData.type === 'MG' ? (
                                        <p><strong>Demande Moyens Généraux :</strong> Chef de Service → MG → SécuLog → <strong className="text-red-600">Directeur du Soutien (EN DERNIER)</strong></p>
                                    ) : (
                                        <p><strong>Demande Biomédical :</strong> Chef de Service → Cellule Biomédical → Directrice Adjointe</p>
                                    )}
                                </div>
                            </div>

                            {!chefDeService && formData.serviceId && (
                                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4 flex gap-3">
                                    <Users className="text-yellow-600 flex-shrink-0 mt-1" size={20} />
                                    <div className="text-sm text-yellow-800">
                                        <p><strong>Aucun Chef de Service disponible pour ce service.</strong></p>
                                        <p className="mt-1">Veuillez contacter l'administrateur pour configurer un Chef de Service pour <strong>{formData.service}</strong>.</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                {dynamicValidators.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">
                                        Aucun validateur disponible pour ce type de demande.
                                    </p>
                                ) : (
                                    dynamicValidators.map((validator, index) => (
                                        <label 
                                            key={validator.id} 
                                            className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${
                                                selectedValidators.includes(validator.id) ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                                            } ${
                                                validator.email === 'hsjm.directeurdusoutien@gmail.com' || validator.email === 'hsjm.directeursoutien@gmail.com' 
                                                    ? 'border-red-300 bg-red-50' 
                                                    : ''
                                            }`}
                                        >
                                            <input 
                                                type="checkbox" 
                                                checked={selectedValidators.includes(validator.id)}
                                                onChange={() => toggleValidator(validator.id)}
                                                className="w-5 h-5"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                        Étape {index + 1}
                                                    </span>
                                                    <p className="font-semibold">
                                                        {validator.firstName} {validator.lastName}
                                                    </p>
                                                    {validator.isChefService && (
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                            Chef de Service
                                                        </span>
                                                    )}
                                                    {(validator.email === 'hsjm.directeurdusoutien@gmail.com' || validator.email === 'hsjm.directeursoutien@gmail.com') && (
                                                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-bold">
                                                            ⚠️ EN DERNIER
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {validator.position || validator.email}
                                                </p>
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-lg">
                            {error}
                        </div>
                    )}
                    
                    <div className="flex justify-between pt-4">
                        {step > 1 && (
                            <button 
                                onClick={() => setStep(step - 1)} 
                                className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                            >
                                Retour
                            </button>
                        )}
                        <button 
                            onClick={() => handleNextStep(step + 1)} 
                            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2 ml-auto transition"
                        >
                            Suivant <ArrowRight size={18}/>
                        </button>
                    </div>
                </div>
            )}

            {/* Étape 5: Prévisualisation */}
            {step === 5 && (
                <div>
                    <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                        <CheckCircle className="text-green-500"/> Prévisualisation du document
                    </h2>
                    
                    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                        <DemandeTravaux 
                            formData={templateData} 
                            setFormData={() => {}} 
                            pdfContainerRef={pdfContainerRef} 
                        />
                    </div>
                    
                    {error && (
                        <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-lg mb-4 text-center">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        <button 
                            onClick={() => setStep(4)} 
                            className="px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                        >
                            Retour
                        </button>
                        <button 
                            onClick={handleFinalSubmit} 
                            disabled={submitting} 
                            className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2 transition"
                        >
                            {submitting ? (
                                <>
                                    <Loader className="animate-spin w-5 h-5" /> 
                                    Génération en cours...
                                </>
                            ) : (
                                <>
                                    <Send size={18}/> 
                                    Générer et Soumettre
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateWorkRequest;