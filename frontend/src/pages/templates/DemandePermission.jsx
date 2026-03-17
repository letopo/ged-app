// frontend/src/pages/templates/DemandePermission.jsx

import React, { useState, useEffect, useRef } from 'react';
import { usersAPI, servicesAPI } from '../../services/api';
import logo from '../../assets/logo-ordre-malte.png';
import { Plus, Trash2, Calendar } from 'lucide-react';

// Fonction utilitaire pour exclure les week-ends
const calculateBusinessDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);

    if (start > end) return 0;

    let count = 0;
    let current = new Date(start);

    while (current <= end) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    return count;
};

const DemandePermission = ({ formData, setFormData, pdfContainerRef }) => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const interimRef = useRef(null); 

    const exceptionalReasons = [
        "mariage du travailleur (5 jours)",
        "accouchement de l'épouse du travailleur (3 jours)",
        "mariage d'un enfant du travailleur (2 jours)",
        "décès du conjoint du travailleur (5 jours)",
        "décès du père ou de la mère du travailleur (5 jours)",
        "décès d'un frère ou d'une sœur (2 jour)",
        "médaille d'honneur du travail (2 jours)"
    ];
    
    // Initialisation des données
    useEffect(() => {
        const initData = async () => {
            try {
                if (!formData.periods || formData.periods.length === 0) {
                    setFormData(prev => ({
                        ...prev,
                        periods: [{ startDate: '', endDate: '' }],
                        totalDays: 0,
                        motif: 'Personnel', 
                        remplacant: ''
                    }));
                }

                const servicesRes = await servicesAPI.getAll();
                setServices(servicesRes.data.data || []);
                
                const userRes = await usersAPI.getMyService();
                if (userRes.data.success && userRes.data.service) {
                    setFormData(prev => ({ ...prev, service: userRes.data.service.name }));
                }
            } catch (error) {
                console.error("Erreur chargement", error);
            } finally {
                setLoading(false);
            }
        };
        initData();
    }, []);

    // Calcul automatique des jours
    useEffect(() => {
        if (formData.periods) {
            const total = formData.periods.reduce((acc, period) => {
                return acc + calculateBusinessDays(period.startDate, period.endDate);
            }, 0);
            
            if (formData.totalDays !== total) {
                setFormData(prev => ({ ...prev, totalDays: total }));
            }
        }
    }, [formData.periods, setFormData]);

    // 🎯 CALCUL AUTOMATIQUE DE LA POSITION (avec ancrage sur span)
    useEffect(() => {
        // Gardez cette logique seulement pour le positionnement visuel
        // mais ne forcez pas la saisie
        if (interimRef.current && pdfContainerRef.current) {
            const timer = setTimeout(() => {
                const container = pdfContainerRef.current;
                const interimBox = interimRef.current;
                
                if (!container || !interimBox) return;
                
                // Trouver le span avec l'ID "interim-anchor"
                const anchorSpan = interimBox.querySelector('#interim-anchor');
                
                if (anchorSpan) {
                    const containerHeight = container.offsetHeight;
                    const spanRect = anchorSpan.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    
                    const relativeTop = spanRect.top - containerRect.top;
                    const targetY = relativeTop + (spanRect.height / 2);
                    const ratio = targetY / containerHeight;
                    
                    // Mettre à jour le ratio mais seulement pour le positionnement
                    setFormData(prev => ({
                        ...prev,
                        interimYRatio: ratio,
                        interimSpanHeight: spanRect.height
                    }));
                }
            }, 1000);
            
            return () => clearTimeout(timer);
        }
    }, [formData.periods, formData.motif, pdfContainerRef, setFormData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePeriodChange = (index, field, value) => {
        const newPeriods = [...(formData.periods || [])];
        newPeriods[index][field] = value;
        
        const firstDate = newPeriods[0].startDate;
        const lastDate = newPeriods[newPeriods.length - 1].endDate;

        setFormData(prev => ({ 
            ...prev, 
            periods: newPeriods,
            date_debut: firstDate,
            date_fin: lastDate
        }));
    };

    const addPeriod = () => {
        setFormData(prev => ({
            ...prev,
            periods: [...prev.periods, { startDate: '', endDate: '' }]
        }));
    };

    const removePeriod = (index) => {
        const newPeriods = formData.periods.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, periods: newPeriods }));
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '...';
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const inputStyle = "w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600";
    const selectStyle = "w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 appearance-none";
    const staticFieldStyle = {
        borderBottom: '2px dotted #9CA3AF',
        padding: '4px',
        fontWeight: '600',
        color: '#000000',
        display: 'inline-block',
        minWidth: '200px'
    };

    return (
        <div 
            ref={pdfContainerRef} 
            className="bg-white p-12 shadow-lg mx-auto relative" 
            style={{ 
                width: '210mm', 
                minHeight: '297mm', 
                fontFamily: 'Arial, sans-serif',
                fontSize: '15px',
                color: '#000000'
            }}
        >
            {/* EN-TÊTE */}
            <header className="flex items-center justify-between mb-8">
                <img src={logo} alt="Logo" style={{ width: '80px' }} />
                <div className="text-center">
                    <span style={{ fontSize: '20px', fontWeight: 'bold', display: 'block' }}>ORDRE DE MALTE</span>
                    <span style={{ fontSize: '18px', color: '#DC2626' }}>HÔPITAL SAINT JEAN DE MALTE</span>
                </div>
            </header>

            {/* CHAMPS SUPÉRIEURS */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                    <label className="font-semibold block mb-1">NOMS et Prénom(s) :</label>
                    <input name="noms_prenoms" value={formData.noms_prenoms || ''} onChange={handleChange} className={`not-printable ${inputStyle}`}/>
                    <div className="print-only" style={staticFieldStyle}>{formData.noms_prenoms || ''}</div>

                    <label className="font-semibold block mt-4 mb-1">Service :</label>
                    <select name="service" value={formData.service || ''} onChange={handleChange} className={`not-printable ${selectStyle}`}>
                        <option value="">-- Sélectionner --</option>
                        {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <div className="print-only" style={staticFieldStyle}>{formData.service || ''}</div>
                </div>

                <div className="text-right">
                    <div className="mb-4">
                        <input name="date_lieu" value={formData.date_lieu || ''} onChange={handleChange} placeholder="Njombé, le ..." className={`not-printable text-right ${inputStyle}`}/>
                        <div className="print-only text-right font-bold">{formData.date_lieu}</div>
                    </div>
                    <p className="font-bold mt-8">A Monsieur le Directeur Général</p>
                    <p>De l'Hôpital Saint Jean de Malte de Njombé</p>
                </div>
            </div>

            {/* OBJET */}
            <div className="mb-6">
                <span className="font-bold">Objet : </span>
                <input name="objet" value={formData.objet || 'Demande de permission d\'absence'} onChange={handleChange} className={`not-printable w-full mt-1 ${inputStyle}`}/>
                <span className="print-only font-bold underline">{formData.objet}</span>
            </div>

            {/* CORPS DE LA LETTRE */}
            <div className="mb-8 leading-relaxed">
                <p className="mb-4">Monsieur,</p>
                <p>Je viens par cette demande solliciter une permission de <span className="font-bold">« {formData.totalDays} jour(s) ouvrable(s) »</span>.</p>
                
                {/* INTERFACE DE SAISIE DES PÉRIODES */}
                <div className="not-printable my-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg">
                    <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                        <Calendar size={18}/> Périodes (Week-ends exclus automatiquement)
                    </h4>
                    {formData.periods?.map((period, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                            <input type="date" className={`p-2 border rounded dark:bg-gray-700 dark:text-white`} value={period.startDate} onChange={(e) => handlePeriodChange(index, 'startDate', e.target.value)} />
                            <span>au</span>
                            <input type="date" className={`p-2 border rounded dark:bg-gray-700 dark:text-white`} value={period.endDate} onChange={(e) => handlePeriodChange(index, 'endDate', e.target.value)} />
                            <span className="text-sm font-bold ml-2 text-gray-600 dark:text-gray-400 min-w-[80px]">
                                {calculateBusinessDays(period.startDate, period.endDate)}j ouvr.
                            </span>
                            {formData.periods.length > 1 && (
                                <button onClick={() => removePeriod(index)} className="p-2 text-red-500 hover:bg-red-100 rounded"><Trash2 size={16}/></button>
                            )}
                        </div>
                    ))}
                    <button onClick={addPeriod} className="text-sm text-blue-600 flex items-center gap-1 font-medium mt-2"><Plus size={16}/> Ajouter une période</button>
                </div>

                {/* AFFICHAGE DES PÉRIODES SUR LE PDF */}
                <div className="print-only my-4 pl-4 border-l-4 border-gray-300">
                    <p className="font-bold underline mb-1">Détail des périodes :</p>
                    {formData.periods?.map((period, index) => (
                        <p key={index}>
                            - Du <span className="font-bold">{formatDate(period.startDate)}</span> au <span className="font-bold">{formatDate(period.endDate)}</span> 
                            <span className="italic text-sm"> ({calculateBusinessDays(period.startDate, period.endDate)} jours ouvrables)</span>
                        </p>
                    ))}
                </div>

                {/* LISTE DÉROULANTE DES MOTIFS */}
                <div className="not-printable my-6">
                    <label className="block mb-2 font-semibold text-blue-900 dark:text-blue-300">📝 Type de permission :</label>
                    <select name="motif" value={formData.motif || 'Personnel'} onChange={handleChange} className={selectStyle}>
                        <option value="Personnel">Personnel</option>
                        <option value="Journée Directeur">Journée Directeur</option>
                        <option value="Journée Major">Journée Major</option>
                        <option value="Permission d'Urgence">Permission d'Urgence</option>
                        <option value="Exceptionnel">Permission exceptionnel</option>
                    </select>

                    {formData.motif === 'Exceptionnel' && (
                        <div className="mt-2">
                            <label className="block mb-1 font-semibold text-red-700 dark:text-red-400">Préciser l'événement :</label>
                            <select name="motif_exceptionnel" value={formData.motif_exceptionnel || ''} onChange={handleChange} className={`border-red-300 ${selectStyle}`}>
                                <option value="">-- Choisir le motif --</option>
                                {exceptionalReasons.map(reason => (<option key={reason} value={reason}>{reason}</option>))}
                            </select>
                        </div>
                    )}
                </div>

                {/* AFFICHAGE MOTIF PDF */}
                <p className="print-only mt-4">
                    Pour le motif suivant : <span className="font-bold italic">{formData.motif}</span>
                    {formData.motif === 'Exceptionnel' && formData.motif_exceptionnel && (
                        <span> : <span className="underline">{formData.motif_exceptionnel}</span></span>
                    )}.
                </p>

                {/* 🎯 ZONE REMPLAÇANT AVEC ANCRAGE AUTOMATIQUE */}
                <div 
                    ref={interimRef}
                    className="mt-6 p-2 border border-dotted border-gray-400 bg-gray-50 print-only"
                >
                    <p className="font-bold">
                        Intérim assuré par : 
                        <span 
                            id="interim-anchor" 
                            data-anchor="true" 
                            style={{ position: 'relative' }}
                        >
                            __________________________________________________
                        </span>
                    </p>
                    <p className="text-[10px] italic text-gray-500 text-right">(A remplir par le validateur / Chef de service)</p>
                </div>

                <p className="mt-8">
                    Dans l'attente d'une suite favorable, veuillez agréer Monsieur l'expression de mon plus profond respect.
                </p>
            </div>

            {/* PIED DE PAGE SIGNATURES */}
            <div className="absolute bottom-24 left-12 right-12 grid grid-cols-3 gap-8 text-center pt-8 border-t border-gray-300">
                <div>
                    <p className="font-bold mb-2">Le Demandeur</p>
                    <div data-sig-zone={1} className="h-28"></div>
                </div>
                <div>
                    <p className="font-bold mb-2">Chef de Service / RH</p>
                    <div data-sig-zone={2} className="h-28"></div>
                </div>
                <div>
                    <p className="font-bold mb-2">Le Directeur Général</p>
                    <div data-sig-zone={3} className="h-28"></div>
                </div>
            </div>
        </div>
    );
};

export default DemandePermission;