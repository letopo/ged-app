// frontend/src/pages/CreateFromTemplate.jsx - VERSION HYBRIDE AVEC TEMPLATE ENGINE
import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { documentsAPI } from '../services/api';
import { Loader, Send } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Importer les composants de modèle MANUELS
import DemandePermission from './templates/DemandePermission';
import PieceDeCaisse from './templates/PieceDeCaisse';
import DemandeTravaux from './templates/DemandeTravaux';
import OrdreDeMission from './templates/OrdreDeMission';
import DemandePermutation from './templates/DemandePermutation';
import BonDeSortie from './templates/BonDeSortie';

// Importer le TemplateEngine DYNAMIQUE
import TemplateEngine from '../templates/TemplateEngine';
import demandeExplicationConfig from '../templates/configs/demande-explication.json';

// Définir les modèles disponibles (SYSTÈME HYBRIDE)
const templates = {
    // ============================================
    // TEMPLATES MANUELS (existant)
    // ============================================
    "Demande de permission": {
        type: "manual",
        component: DemandePermission,
        initialState: {
            noms_prenoms: '', 
            service: '',
            date_debut: '', 
            date_fin: '',
            motif: 'Personnel',
            motif_exceptionnel: '',
            objet: 'Demande de permission d\'absence',
            date_lieu: 'Njombé le ' + new Date().toLocaleDateString('fr-FR'),
        }
    },
    "Pièce de caisse": {
        type: "manual",
        component: PieceDeCaisse,
        initialState: {
            nom: '', 
            date: new Date().toLocaleDateString('fr-FR'), 
            concerne: '',
            lines: [{ refCompta: '', libelle: '', refGage: '', entrees: '', sorties: '' }],
            totalEnLettres: '',
            linkedOrdreMissionId: ''
        }
    },
    "Demande de travaux": {
        type: "manual",
        component: DemandeTravaux,
        initialState: {
            date_demande: new Date().toISOString().split('T')[0],
            service: '',
            prevention: false,
            urgence: false,
            description_travaux: '',
            realise_par: '',
            date_realisation: ''
        }
    },
    "Ordre de mission": {
        type: "manual",
        component: OrdreDeMission,
        initialState: {
            numero_ordre: '',
            date_depart: new Date().toISOString().split('T')[0],
            date_retour: '',
            service_demandeur: '',
            objet_mission: '',
            nom_conducteur: '',
            nom_missionnaire: '',
            immat_vehicule: '',
            frais_mission: false
        }
    },
    "Demande de permutation": {
        type: "manual",
        component: DemandePermutation,
        initialState: {
            demandeur_noms_prenoms: '',
            service: '',
            permute_id: '',
            permute_noms_prenoms: '',
            date_permutation: new Date().toISOString().split('T')[0],
            plage_horaire_debut: '',
            plage_horaire_fin: ''
        }
    },
    "Bon de sortie": {
        type: "manual",
        component: BonDeSortie,
        initialState: {
            date: new Date().toISOString().split('T')[0],
            nomDemandeur: '',
            lines: [
                { designation: '', quantite: '', pu: '', montant: '' }
            ],
            montantEnLettres: ''
        }
    },
    // ============================================
    // TEMPLATES DYNAMIQUES (nouveau système)
    // ============================================
    "Demande d'explication": {
        type: "dynamic",
        configFile: "demande-explication.json",
        initialState: {
            noms_prenoms: '',
            service: '',
            date_lieu: 'Njombé le ' + new Date().toLocaleDateString('fr-FR'),
            date_incident: '',
            heure_incident: '',
            lieu_incident: '',
            type_incident: '',
            description_incident: '',
            motifs_explication: '',
            delai_reponse: 7,
            objet: 'Demande d\'explication'
        }
    }
};

// Fonction pour charger les configurations dynamiques
const dynamicTemplateConfigs = {
    "demande-explication.json": demandeExplicationConfig
};

const loadDynamicTemplate = async (configFile) => {
    try {
        const config = dynamicTemplateConfigs[configFile];
        if (!config) {
            throw new Error(`Template ${configFile} non configuré`);
        }
        return config;
    } catch (error) {
        console.error(`❌ Erreur chargement template ${configFile}:`, error);
        throw new Error(`Template ${configFile} introuvable: ${error.message}`);
    }
};

const CreateFromTemplate = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const templateName = location.state?.templateName || "Demande de permission";
    
    const template = templates[templateName] || templates["Demande de permission"];
    const [formData, setFormData] = useState(template.initialState);
    const [templateConfig, setTemplateConfig] = useState(null);
    const [loadingConfig, setLoadingConfig] = useState(template.type === "dynamic");
    const pdfContainerRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Charger la configuration pour les templates dynamiques
    React.useEffect(() => {
        const loadConfig = async () => {
            if (template.type === "dynamic") {
                try {
                    setLoadingConfig(true);
                    const config = await loadDynamicTemplate(template.configFile);
                    setTemplateConfig(config);
                    
                    // Appliquer les valeurs par défaut du template
                    if (config.fields) {
                        const defaults = {};
                        config.fields.forEach(field => {
                            if (field.defaultValue && !formData[field.name]) {
                                if (field.defaultValue.includes('{{currentDate}}')) {
                                    defaults[field.name] = field.defaultValue.replace('{{currentDate}}', new Date().toLocaleDateString('fr-FR'));
                                } else {
                                    defaults[field.name] = field.defaultValue;
                                }
                            }
                        });
                        if (Object.keys(defaults).length > 0) {
                            setFormData(prev => ({ ...prev, ...defaults }));
                        }
                    }
                } catch (err) {
                    setError(`Erreur chargement template: ${err.message}`);
                } finally {
                    setLoadingConfig(false);
                }
            }
        };

        loadConfig();
    }, [templateName, template.type, template.configFile]);

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        
        console.log('📋 === DÉBUT GÉNÉRATION DOCUMENT ===');
        console.log('🔍 Template Name:', templateName);
        console.log('🔍 Template Type:', template.type);
        console.log('🔍 FormData complet:', formData);
        
        const notPrintable = pdfContainerRef.current?.querySelectorAll('.not-printable');
        const printOnly = pdfContainerRef.current?.querySelectorAll('.print-only');
        
        notPrintable.forEach(el => el.style.display = 'none');
        printOnly.forEach(el => el.style.display = 'block');

        try {
            const canvas = await html2canvas(pdfContainerRef.current, { 
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 1200,
                windowHeight: 1697
            });
            
            notPrintable.forEach(el => el.style.display = 'block');
            printOnly.forEach(el => el.style.display = 'none');

            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF({ 
                orientation: 'portrait', 
                unit: 'pt', 
                format: 'a4',
                compress: false
            });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, '', 'FAST');
            const pdfBlob = pdf.output('blob');

            const uploadData = new FormData();
            const fileName = `${templateName.replace(/\s/g, '_')}_${Date.now()}.pdf`;
            uploadData.append('file', pdfBlob, fileName);
            
            let documentTitle = `${templateName}`;
            if (formData.noms_prenoms) {
                documentTitle += ` - ${formData.noms_prenoms}`;
            } else if (formData.nom) {
                documentTitle += ` - ${formData.nom}`;
            } else if (formData.service) {
                documentTitle += ` - ${formData.service}`;
            }
            
            uploadData.append('title', documentTitle);
            uploadData.append('category', templateName);
            
            // LOGIQUE ROBUSTE : Détecter si c'est une Pièce de Caisse
            const isPieceDeCaisse = templateName === 'Pièce de caisse' || 
                                    templateName.toLowerCase().includes('piece') ||
                                    templateName.toLowerCase().includes('caisse');
            
            console.log('🔍 Vérification type document:', {
                templateName,
                isPieceDeCaisse,
                hasLinkedOM: !!formData.linkedOrdreMissionId,
                linkedOMValue: formData.linkedOrdreMissionId
            });
            
            // ENVOYER linkedOrdreMissionId en paramètre séparé
            if (isPieceDeCaisse && formData.linkedOrdreMissionId) {
                console.log('🔗 ✅ Ajout linkedOrdreMissionId au FormData:', formData.linkedOrdreMissionId);
                uploadData.append('linkedOrdreMissionId', formData.linkedOrdreMissionId);
            }
            
            if (formData.date_debut && formData.date_fin) {
                uploadData.append('dateDebut', formData.date_debut);
                uploadData.append('dateFin', formData.date_fin);
            }
            
            if (formData.date_demande) {
                uploadData.append('date_demande', formData.date_demande);
            }

            // Préparer les metadata SANS linkedOrdreMissionId
            const metadataToSend = { ...formData };
            delete metadataToSend.linkedOrdreMissionId;
            uploadData.append('metadata', JSON.stringify(metadataToSend));

            console.log('📤 Données envoyées au backend:');
            for (let pair of uploadData.entries()) {
                if (pair[0] !== 'file') {
                    console.log(`   ${pair[0]}:`, pair[1]);
                }
            }

            const response = await documentsAPI.upload(uploadData);
            
            console.log('✅ Réponse backend:', response.data);
            
            // Afficher un message spécial si fusion réussie
            if (response.data.data.metadata?.fusionné) {
                alert('✅ Pièce de Caisse générée et fusionnée avec l\'Ordre de Mission avec succès!\n\nLe document final contient l\'OM et la PC.');
            } else if (response.data.data.metadata?.fusionError) {
                alert('⚠️ Pièce de Caisse créée, mais la fusion avec l\'OM a échoué:\n' + response.data.data.metadata.fusionError);
            } else if (isPieceDeCaisse && formData.linkedOrdreMissionId) {
                alert('⚠️ Document créé, mais la fusion n\'a pas eu lieu. Vérifiez les logs backend.');
            } else {
                alert('Document généré et sauvegardé avec succès !');
            }
            
            navigate('/documents');

        } catch (err) {
            setError("Erreur lors de la génération ou de l'upload du document.");
            console.error('❌ Erreur détaillée:', err);
            
            notPrintable.forEach(el => el.style.display = 'block');
            printOnly.forEach(el => el.style.display = 'none');
        } finally {
            setLoading(false);
        }
    };

    // Rendu conditionnel du template
    const renderTemplate = () => {
        if (template.type === "dynamic") {
            if (loadingConfig) {
                return (
                    <div className="bg-white p-12 shadow-lg mx-auto flex items-center justify-center" style={{ width: '210mm', minHeight: '297mm' }}>
                        <div className="text-center">
                            <Loader className="animate-spin w-8 h-8 mx-auto mb-4 text-blue-600" />
                            <p className="text-gray-600">Chargement du template...</p>
                        </div>
                    </div>
                );
            }
            
            if (!templateConfig) {
                return (
                    <div className="bg-white p-12 shadow-lg mx-auto flex items-center justify-center" style={{ width: '210mm', minHeight: '297mm' }}>
                        <div className="text-center text-red-600">
                            <p>Erreur: Configuration du template introuvable</p>
                        </div>
                    </div>
                );
            }

            return (
                <TemplateEngine 
                    templateConfig={templateConfig}
                    formData={formData}
                    setFormData={setFormData}
                    pdfContainerRef={pdfContainerRef}
                />
            );
        } else {
            // Template manuel classique
            const TemplateComponent = template.component;
            return (
                <TemplateComponent 
                    formData={formData}
                    setFormData={setFormData}
                    pdfContainerRef={pdfContainerRef}
                />
            );
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 bg-gray-100 dark:bg-dark-bg">
            <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-dark-text">
                Créer : {templateName}
                {template.type === "dynamic" && (
                    <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Dynamique
                    </span>
                )}
            </h1>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-8">
                Remplissez les champs pour générer le document PDF.
            </p>
            
            {/* Rendu du template (manuel ou dynamique) */}
            {renderTemplate()}

            {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-center">
                    {error}
                </div>
            )}
            
            <div className="text-center mt-8">
                <button 
                    onClick={handleSubmit} 
                    disabled={loading || (template.type === "dynamic" && loadingConfig)}
                    className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto transition-all shadow-lg hover:shadow-xl dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                    {loading ? (
                        <>
                            <Loader className="animate-spin w-5 h-5" /> 
                            Génération en cours...
                        </>
                    ) : (
                        <>
                            <Send size={18}/> 
                            Générer et Sauvegarder
                        </>
                    )}
                </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 p-4 bg-gray-50 dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg">
                    <h3 className="font-semibold mb-2 text-gray-900 dark:text-dark-text">🔧 Debug Info</h3>
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                        Template: {templateName} ({template.type})
                    </p>
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-2">
                        Config: {template.type === "dynamic" ? template.configFile : "Manuel"}
                    </p>
                    <details className="mt-2 text-gray-900 dark:text-dark-text">
                        <summary className="text-sm font-medium cursor-pointer">Voir FormData complet</summary>
                        <pre className="text-xs bg-white dark:bg-dark-bg p-2 rounded mt-2 overflow-auto max-h-40 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-dark-text">
                            {JSON.stringify(formData, null, 2)}
                        </pre>
                    </details>
                </div>
            )}
        </div>
    );
};

export default CreateFromTemplate;