// frontend/src/pages/CreateFromTemplate.jsx - VERSION COMPLÈTE CORRIGÉE
import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { documentsAPI } from '../services/api';
import { Loader, Send } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Importer les composants de modèle
import DemandePermission from './templates/DemandePermission';
import PieceDeCaisse from './templates/PieceDeCaisse';
import DemandeTravaux from './templates/DemandeTravaux'; // IMPORT CORRIGÉ

// Définir les modèles disponibles
const templates = {
    "Demande de permission": {
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
        component: PieceDeCaisse,
        initialState: {
            nom: '', 
            date: new Date().toLocaleDateString('fr-FR'), 
            concerne: '',
            lines: [{ refCompta: '', libelle: '', refGage: '', entrees: '', sorties: '' }],
            totalEnLettres: ''
        }
    },
    // AJOUT DE LA DEMANDE DE TRAVAUX
    "Demande de travaux": {
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
    }
};

const CreateFromTemplate = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const templateName = location.state?.templateName || "Demande de permission";
    
    const template = templates[templateName] || templates["Demande de permission"];
    const [formData, setFormData] = useState(template.initialState);
    const pdfContainerRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const TemplateComponent = template.component;

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        
        const nonPrintable = pdfContainerRef.current?.querySelector('.not-printable');
        if (nonPrintable) nonPrintable.style.display = 'none';

        try {
            const canvas = await html2canvas(pdfContainerRef.current, { scale: 2, useCORS: true });
            if (nonPrintable) nonPrintable.style.display = 'block';

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            const pdfBlob = pdf.output('blob');

            const uploadData = new FormData();
            const fileName = `${templateName.replace(/\s/g, '_')}_${Date.now()}.pdf`;
            uploadData.append('file', pdfBlob, fileName);
            
            // Gestion du titre selon le type de template
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
            
            // Ajout des dates spécifiques selon le template
            if (formData.date_debut && formData.date_fin) {
                uploadData.append('date_debut', formData.date_debut);
                uploadData.append('date_fin', formData.date_fin);
            }
            
            if (formData.date_demande) {
                uploadData.append('date_demande', formData.date_demande);
            }

            await documentsAPI.upload(uploadData);
            alert('Document généré et sauvegardé avec succès !');
            navigate('/documents');

        } catch (err) {
            setError("Erreur lors de la génération ou de l'upload du document.");
            console.error(err);
            if (nonPrintable) nonPrintable.style.display = 'block';
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 bg-gray-100">
            <h1 className="text-3xl font-bold mb-2">Créer : {templateName}</h1>
            <p className="text-gray-600 mb-8">Remplissez les champs pour générer le document PDF.</p>
            
            <TemplateComponent formData={formData} setFormData={setFormData} pdfContainerRef={pdfContainerRef} />

            {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
            <div className="text-center mt-8">
                <button onClick={handleSubmit} disabled={loading} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 mx-auto">
                    {loading ? <><Loader className="animate-spin w-5 h-5" /> Génération...</> : <><Send size={18}/> Générer et Sauvegarder</>}
                </button>
            </div>
        </div>
    );
};

export default CreateFromTemplate;