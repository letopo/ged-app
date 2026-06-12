// frontend/src/pages/CreateFromTemplate.jsx - VERSION HYBRIDE AVEC TEMPLATE ENGINE
import React, { useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { documentsAPI, postesAPI } from '../services/api';
import { Loader, Send, Save, RotateCcw, X } from 'lucide-react';
import useDraftAutoSave from '../hooks/useDraftAutoSave';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { pdf } from '@react-pdf/renderer';

// Importer les composants de modèle MANUELS
import DemandePermission from './templates/DemandePermission';
import PieceDeCaisse from './templates/PieceDeCaisse';
import DemandeTravaux from './templates/DemandeTravaux';
import OrdreDeMission from './templates/OrdreDeMission';
import DemandePermutation from './templates/DemandePermutation';
import BonDeSortie from './templates/BonDeSortie';
import PlanningOperatoire from './templates/PlanningOperatoire'; // ✅ NOUVEAU
import BonDeCommande from './templates/BonDeCommande';
import BonDeCommandeInterne from './templates/BonDeCommandeInterne';
import CertificatAptitude from './templates/CertificatAptitude';
import AttestationConge from './templates/AttestationConge';
import DemandeBesoin from './templates/DemandeBesoin';

// Importer le TemplateEngine DYNAMIQUE
import TemplateEngine from '../templates/TemplateEngine';
import demandeExplicationConfig from '../templates/configs/demande-explication.json';

import { PermissionPdfDocument } from '../pdf-templates/PermissionPdf';
import toast from 'react-hot-toast';

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
    "Demande de besoin": {
        type: "manual",
        component: DemandeBesoin,
        initialState: {
            date_demande: new Date().toISOString().split('T')[0],
            service_demandeur: '',
            justification: '',
            lines: [
                { designation: '', quantite: '', prixUnitaire: '', montantTotal: '' }
            ]
        }
    },
    "Pièce de caisse": {
        type: "manual",
        component: PieceDeCaisse,
        initialState: {
            numero: '',
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
    "Bon de commande": {
        type: "manual",
        component: BonDeCommande,
        initialState: {
            numeroCommande: `BC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
            date: new Date().toISOString().split('T')[0],
            serviceDemandeur: '',
            fournisseur: { name: '', address: '', phone: '', fax: '' },
            livraison: { contact: '', address: 'Hôpital Saint Jean de Malte - Njombé', datePrevue: '' },
            objet: '',
            modeTransport: '',
            conditionPaiement: 'Virement à 30 jours',
            lines: [{ ref: '', designation: '', quantite: 1, unite: 'U', prixUnitaire: 0, remise: 0 }],
            tvaRate: 19.25
        }
    },
    "Bon de commande interne": {
        type: "manual",
        component: BonDeCommandeInterne,
        initialState: {
            date: new Date().toISOString().split('T')[0],
            serviceDemandeur: '',
            lines: [{ no: 1, designation: '', quantite: '', observation: '' }],
        }
    },
    "Certificat d'aptitude": {
        type: "manual",
        component: CertificatAptitude,
        initialState: {
            nom_docteur: '',
            nom_employe: '',
            service: '',
            date_certificat: new Date().toISOString().split('T')[0],
            declaration: ''
        }
    },
    // ✅ NOUVEAU : Planning Opératoire de la semaine
    "Planning Opératoire": {
        type: "manual",
        component: PlanningOperatoire,
        initialState: {
            periode: '',
            service: 'Chirurgie',
            lignes: [
                {
                    jour: '',
                    nomPatient: '',
                    age: '',
                    natureIntervention: '',
                    intervenant: '',
                    numeroSalle: ''
                }
            ]
        }
    },
    "Attestation de départ en congé annuel": {
        type: "manual",
        component: AttestationConge,
        initialState: {
            civilite: 'Monsieur',
            nom_prenom: '',
            fonction: '',
            service: '',
            matricule: '',
            nb_jours: '',
            date_debut: '',
            date_fin: '',
            date_reprise: '',
            date_document: new Date().toISOString().split('T')[0],
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
    const [genStep, setGenStep] = useState(''); // étape lisible pendant la génération
    const [error, setError] = useState('');

    // Étape « choix du type » pour les ordres de mission (3 circuits différents)
    const isOrdreMission = templateName === 'Ordre de mission';
    const [omTypes, setOmTypes] = useState([]);
    React.useEffect(() => {
        if (!isOrdreMission) return;
        postesAPI.getOrdreMissionTypes()
            .then(res => setOmTypes(res.data.data || []))
            .catch(() => setOmTypes([]));
    }, [isOrdreMission]);

    // Auto-save brouillon
    const { draftStatus, hasDraft, restoreDraft, dismissDraft, clearDraft, getDraftAge } = useDraftAutoSave(
        templateName, formData, setFormData, template.initialState
    );

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
    setGenStep('Préparation…');
    setError('');

    console.log('📋 === DÉBUT GÉNÉRATION DOCUMENT ===');
    console.log('📝 Template Name:', templateName);
    console.log('📝 Template Type:', template.type);
    console.log('📝 FormData complet:', formData);

    let pdfBlob;
    let finalTitle = `${templateName}`;
    let signatureZones = null; // Zones d'ancrage de signature (calculées dynamiquement)

    // ====================================================================
    // ✅ NOUVELLE LOGIQUE HYBRIDE (PRIORITÉ AU PDF NATIF)
    // ====================================================================
    if (templateName === 'Demande de permission') {
        // 1. Génération PDF Natif (@react-pdf/renderer)
        try {
            setGenStep('Génération PDF…');
            const doc = <PermissionPdfDocument formData={formData} />;
            pdfBlob = await pdf(doc).toBlob();

            finalTitle = `Demande de permission - ${formData.noms_prenoms || 'Inconnu'}`;
            console.log('✅ Document généré en PDF NATIF');

        } catch (pdfError) {
            console.error('❌ Erreur de génération PDF Natif:', pdfError);
            setError("Erreur critique lors de la génération PDF natif. Veuillez vérifier la console.");
            setLoading(false);
            setGenStep('');
            return;
        }

    } else {
        // 2. Fallback (Génération HTML2CANVAS pour les autres templates)
        const notPrintable = pdfContainerRef.current?.querySelectorAll('.not-printable');
        const printOnly = pdfContainerRef.current?.querySelectorAll('.print-only');

        notPrintable?.forEach(el => el.style.display = 'none');
        printOnly?.forEach(el => el.style.display = 'block');

        // ── ANCRAGE DES ZONES DE SIGNATURE ──────────────────────────────────
        // Mesure la position réelle des cadres translucides dans le DOM
        // APRÈS masquage des éléments not-printable (le layout correspond alors
        // exactement à ce que html2canvas va capturer).
        const sigZoneEls = pdfContainerRef.current?.querySelectorAll('[data-sig-zone]');
        if (sigZoneEls && sigZoneEls.length > 0) {
            const container   = pdfContainerRef.current;
            const containerRect = container.getBoundingClientRect();
            const containerW  = container.offsetWidth;
            const containerH  = container.offsetHeight;
            // Facteur de conversion px → pt (A4 = 595.28 × 841.89 pt)
            const scaleX = 595.28 / containerW;
            const scaleY = 841.89 / containerH;

            signatureZones = Array.from(sigZoneEls).map(el => {
                const rect   = el.getBoundingClientRect();
                const topPx  = rect.top  - containerRect.top;
                const leftPx = rect.left - containerRect.left;
                const wPx    = el.offsetWidth;
                const hPx    = el.offsetHeight;
                return {
                    index:  parseInt(el.dataset.sigZone),
                    x:      leftPx * scaleX,
                    // pdf-lib: Y = 0 en bas de page → convertir depuis le haut
                    y:      841.89 - (topPx + hPx) * scaleY,
                    width:  wPx * scaleX,
                    height: hPx * scaleY,
                };
            }).sort((a, b) => a.index - b.index);

            console.log('📐 Zones de signature calculées:', signatureZones);
        }
        // ────────────────────────────────────────────────────────────────────

        try {
            // scale: 2 = qualité A4 suffisante (300 DPI effectif) sans exploser la mémoire
            // scale: 3 produisait un canvas de ~55 MB bloquant le thread 5-8s sur tablette
            setGenStep('Capture du document…');
            // Laisser le navigateur afficher le message avant de bloquer le thread
            await new Promise(r => setTimeout(r, 50));

            const isLandscape = templateName === 'Planning Opératoire';
            const canvas = await html2canvas(pdfContainerRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: isLandscape ? 1697 : 1200,
                windowHeight: isLandscape ? 1200 : 1697,
                imageTimeout: 0,
            });

            notPrintable?.forEach(el => el.style.display = 'block');
            printOnly?.forEach(el => el.style.display = 'none');

            setGenStep('Compression PDF…');
            await new Promise(r => setTimeout(r, 30));

            // JPEG au lieu de PNG : 5-10× plus léger, imperceptible sur A4 imprimé
            const imgData = canvas.toDataURL('image/jpeg', 0.92);

            const pdfGenerator = new jsPDF({
                orientation: isLandscape ? 'landscape' : 'portrait',
                unit: 'pt',
                format: 'a4',
                compress: true,   // était false → active la compression zlib
            });

            const pdfWidth = pdfGenerator.internal.pageSize.getWidth();
            const pdfHeight = pdfGenerator.internal.pageSize.getHeight();

            pdfGenerator.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, '', 'FAST');
            pdfBlob = pdfGenerator.output('blob');

            // Mise à jour du titre pour les autres documents
            if (formData.noms_prenoms) {
                finalTitle += ` - ${formData.noms_prenoms}`;
            } else if (formData.nom_missionnaire) {
                finalTitle += ` - ${formData.nom_missionnaire}`;
            } else if (formData.nom_employe) {
                finalTitle += ` - ${formData.nom_employe}`;
            } else if (formData.nom) {
                finalTitle += ` - ${formData.nom}`;
            } else if (formData.service) {
                finalTitle += ` - ${formData.service}`;
            } else if (formData.periode) {
                finalTitle += ` - ${formData.periode}`;
            }

        } catch (err) {
            setError("Erreur lors de la génération HTML2CANVAS.");
            console.error('❌ Erreur détaillée HTML2CANVAS:', err);
            notPrintable?.forEach(el => el.style.display = 'block');
            printOnly?.forEach(el => el.style.display = 'none');
            setLoading(false);
            setGenStep('');
            return;
        }
    }
    // ====================================================================

    // 3. PRÉPARATION DE L'UPLOAD
    setGenStep('Envoi vers le serveur…');
    try {
        const uploadData = new FormData();
        const fileName = `${templateName.replace(/\s/g, '_')}_${Date.now()}.pdf`;
        uploadData.append('file', pdfBlob, fileName);
        uploadData.append('title', finalTitle);
        uploadData.append('category', templateName);

        // Gérer les métadonnées spécifiques pour la fusion de PC/OM
        const metadataToSend = { ...formData };

        // Inclure les zones d'ancrage de signature si elles ont été calculées
        if (signatureZones && signatureZones.length > 0) {
            metadataToSend.signatureZones = signatureZones;
        }
        if (metadataToSend.linkedOrdreMissionId) {
             uploadData.append('linkedOrdreMissionId', metadataToSend.linkedOrdreMissionId);
             delete metadataToSend.linkedOrdreMissionId;
        }

        // AJOUTER LES DATES pour les Demandes de Permission (car elles ne sont plus dans la 'view')
        if (templateName === 'Demande de permission') {
             uploadData.append('dateDebut', metadataToSend.date_debut);
             uploadData.append('dateFin', metadataToSend.date_fin);
        }

        uploadData.append('metadata', JSON.stringify(metadataToSend));

        console.log('📤 Données envoyées au backend:');
        for (let pair of uploadData.entries()) {
            if (pair[0] !== 'file') {
                console.log(`   ${pair[0]}:`, pair[1]);
            }
        }

        const response = await documentsAPI.upload(uploadData);

        console.log('✅ Réponse backend:', response.data);

        // Affichage des messages de succès/erreur de fusion
        if (response.data.data?.metadata?.fusionné) {
            toast.success('Fusion avec l\'Ordre de Mission réussie !');
        } else if (response.data.data?.metadata?.fusionError) {
            toast('Document créé, mais la fusion a échoué:\n' + response.data.data.metadata.fusionError, { icon: '⚠️' });
        } else {
            toast('Document généré et sauvegardé avec succès !');
        }

        clearDraft();
        navigate('/documents');

    } catch (err) {
        setError("Erreur lors de l'upload final.");
        console.error('❌ Erreur détaillée d\'Upload:', err);
    } finally {
        setLoading(false);
        setGenStep('');
    }
};

    // Rendu conditionnel du template
    const renderTemplate = () => {
        // Étape 1 (ordre de mission) : choisir le type avant le formulaire.
        // Le circuit de validation en dépend (paramédical / administratif / stratégie).
        if (isOrdreMission && !formData.type_mission) {
            return (
                <div style={{ background: 'var(--surface)', padding: 40, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', margin: '0 auto', maxWidth: 720, borderRadius: 12 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>Type d'ordre de mission</h2>
                    <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 24 }}>
                        Choisissez le type — il détermine le circuit de validation.
                    </p>
                    <div style={{ display: 'grid', gap: 12 }}>
                        {omTypes.map(t => (
                            <button
                                key={t.code}
                                onClick={() => setFormData(prev => ({ ...prev, type_mission: t.code }))}
                                style={{
                                    textAlign: 'left', padding: '16px 18px', borderRadius: 10,
                                    border: '1px solid var(--border)', background: 'var(--surface-2)',
                                    cursor: 'pointer', transition: 'border-color .15s, background .15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                            >
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{t.label}</div>
                                <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>
                                    Circuit : service demandeur → {(t.posteChain || []).join(' → ')}
                                </div>
                            </button>
                        ))}
                        {omTypes.length === 0 && (
                            <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Chargement des types…</div>
                        )}
                    </div>
                </div>
            );
        }

        if (template.type === "dynamic") {
            if (loadingConfig) {
                return (
                    <div className="flex items-center justify-center" style={{ background: 'var(--surface)', padding: 48, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', margin: '0 auto', width: '210mm', minHeight: '297mm' }}>
                        <div className="text-center">
                            <Loader className="animate-spin w-8 h-8 mx-auto mb-4" style={{ color: 'var(--brand)' }} />
                            <p style={{ color: 'var(--fg-muted)' }}>Chargement du template...</p>
                        </div>
                    </div>
                );
            }

            if (!templateConfig) {
                return (
                    <div className="flex items-center justify-center" style={{ background: 'var(--surface)', padding: 48, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', margin: '0 auto', width: '210mm', minHeight: '297mm' }}>
                        <div className="text-center" style={{ color: 'var(--danger)' }}>
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
        <div className="max-w-4xl mx-auto p-8" style={{ background: 'var(--surface-2)' }}>
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--fg)' }}>
                Créer : {templateName}
                {template.type === "dynamic" && (
                    <span className="ml-2 text-sm px-2 py-1 rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                        Dynamique
                    </span>
                )}
            </h1>
            <p className="mb-4" style={{ color: 'var(--fg-muted)' }}>
                Remplissez les champs pour générer le document PDF.
            </p>
            {isOrdreMission && formData.type_mission && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '8px 14px', background: 'var(--brand-soft, var(--surface))', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--fg-muted)' }}>Type :</span>
                    <strong style={{ color: 'var(--fg)' }}>{omTypes.find(t => t.code === formData.type_mission)?.label || formData.type_mission}</strong>
                    <button
                        onClick={() => setFormData(prev => ({ ...prev, type_mission: '' }))}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                    >
                        Changer le type
                    </button>
                </div>
            )}

            {/* Bannière de restauration de brouillon */}
            {hasDraft && (
                <div className="mb-4 p-4 rounded-xl flex items-center justify-between gap-4 animate-fadeIn" style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--warning-soft)' }}>
                            <Save className="w-5 h-5" style={{ color: 'var(--warning)' }} />
                        </div>
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--warning)' }}>
                                Brouillon trouve
                            </p>
                            <p className="text-xs" style={{ color: 'var(--warning)' }}>
                                {getDraftAge()} — Voulez-vous le restaurer ?
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={dismissDraft}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1"
                            style={{ color: 'var(--warning)', background: 'var(--warning-soft)', border: '1px solid var(--warning)' }}
                        >
                            <X className="w-3.5 h-3.5" />
                            Ignorer
                        </button>
                        <button
                            onClick={restoreDraft}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1"
                            style={{ color: '#fff', background: 'var(--warning)', border: 'none' }}
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restaurer
                        </button>
                    </div>
                </div>
            )}

            {/* Rendu du template (manuel ou dynamique) */}
            {renderTemplate()}

            {error && (
                <div className="mt-4 p-4 rounded-lg text-center" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                    {error}
                </div>
            )}

            <div className="text-center mt-8" style={{ display: (isOrdreMission && !formData.type_mission) ? 'none' : undefined }}>
                <button
                    onClick={handleSubmit}
                    disabled={loading || (template.type === "dynamic" && loadingConfig)}
                    className="px-8 py-3 font-semibold rounded-lg flex items-center justify-center gap-2 mx-auto transition-all"
                    style={{
                        background: (loading || (template.type === "dynamic" && loadingConfig)) ? 'var(--fg-subtle)' : 'var(--brand)',
                        color: '#fff',
                        border: 'none',
                        boxShadow: 'var(--shadow-2)',
                        cursor: (loading || (template.type === "dynamic" && loadingConfig)) ? 'not-allowed' : 'pointer',
                        opacity: (loading || (template.type === "dynamic" && loadingConfig)) ? 0.6 : 1,
                    }}
                >
                    {loading ? (
                        <>
                            <Loader className="animate-spin w-5 h-5" />
                            {genStep || 'Génération en cours…'}
                        </>
                    ) : (
                        <>
                            <Send size={18}/>
                            Générer et Sauvegarder
                        </>
                    )}
                </button>
                {/* Indicateur de sauvegarde automatique */}
                {draftStatus === 'saved' && (
                    <p className="mt-2 text-xs flex items-center justify-center gap-1 animate-fadeIn" style={{ color: 'var(--success)' }}>
                        <Save className="w-3.5 h-3.5" />
                        Brouillon sauvegarde
                    </p>
                )}
                {draftStatus === 'restored' && (
                    <p className="mt-2 text-xs flex items-center justify-center gap-1 animate-fadeIn" style={{ color: 'var(--brand)' }}>
                        <RotateCcw className="w-3.5 h-3.5" />
                        Brouillon restaure
                    </p>
                )}
            </div>

            {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 p-4 rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <h3 className="font-semibold mb-2" style={{ color: 'var(--fg)' }}>🔧 Debug Info</h3>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        Template: {templateName} ({template.type})
                    </p>
                    <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>
                        Config: {template.type === "dynamic" ? template.configFile : "Manuel"}
                    </p>
                    <details className="mt-2" style={{ color: 'var(--fg)' }}>
                        <summary className="text-sm font-medium cursor-pointer">Voir FormData complet</summary>
                        <pre className="text-xs p-2 rounded mt-2 overflow-auto max-h-40" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
                            {JSON.stringify(formData, null, 2)}
                        </pre>
                    </details>
                </div>
            )}
        </div>
    );
};

export default CreateFromTemplate;
