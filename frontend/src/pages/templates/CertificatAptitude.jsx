// frontend/src/pages/templates/CertificatAptitude.jsx

import React, { useState, useEffect } from 'react';
import { usersAPI, servicesAPI } from '../../services/api';
import logo from '../../assets/logo-ordre-malte.png';
import { useAuth } from '../../contexts/AuthContext';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';

const CertificatAptitude = ({ formData, setFormData, pdfContainerRef }) => {
    const { user } = useAuth();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initialisation des données
    useEffect(() => {
        const initData = async () => {
            try {
                const servicesRes = await servicesAPI.getAll();
                setServices(servicesRes.data.data || []);
            } catch (error) {
                console.error("Erreur chargement services:", error);
            } finally {
                setLoading(false);
            }
        };
        initData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const inputStyle = "w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600";
    const selectStyle = "w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 appearance-none";
    const staticFieldStyle = {
        borderBottom: '2px dotted #9CA3AF',
        padding: '4px 8px',
        fontWeight: '600',
        color: '#000000',
        display: 'inline-block',
        minWidth: '250px'
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
            {/* ============ EN-TÊTE ============ */}
            <header className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <img src={logo} alt="Logo Ordre de Malte" style={{ width: '70px' }} />
                    <div>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', display: 'block' }}>ORDRE DE MALTE</span>
                        <span style={{ fontSize: '13px', color: '#DC2626', fontWeight: '600' }}>HÔPITAL SAINT JEAN DE MALTE</span>
                    </div>
                </div>
                <div className="text-right">
                    <input 
                        type="date" 
                        name="date_certificat" 
                        value={formData.date_certificat || ''} 
                        onChange={handleChange} 
                        className={`not-printable ${inputStyle}`}
                        style={{ width: '200px', textAlign: 'right' }}
                    />
                    <div className="print-only" style={{ fontSize: '15px' }}>
                        Nyombé, le <span style={{ fontWeight: '600' }}>
                            {formData.date_certificat 
                                ? new Date(formData.date_certificat).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                : '......................'}
                        </span>
                    </div>
                </div>
            </header>

            {/* ============ TITRE ============ */}
            <div className="text-center my-12">
                <h1 style={{ 
                    fontSize: '28px', 
                    fontWeight: 'bold', 
                    textDecoration: 'underline', 
                    textUnderlineOffset: '6px',
                    letterSpacing: '1px'
                }}>
                    CERTIFICAT D'APTITUDE
                </h1>
            </div>

            {/* ============ CORPS DU CERTIFICAT ============ */}
            <div style={{ lineHeight: '2.2', fontSize: '16px' }}>
                
                {/* Ligne Docteur */}
                <p>
                    Je soussigné, Docteur{' '}
                    <input 
                        name="nom_docteur" 
                        value={formData.nom_docteur || ''} 
                        onChange={handleChange} 
                        placeholder="Nom du docteur" 
                        className={`not-printable ${inputStyle}`}
                        style={{ width: '350px', display: 'inline-block' }}
                    />
                    <span className="print-only" style={staticFieldStyle}>{formData.nom_docteur || ''}</span>
                </p>

                {/* Ligne Employé examiné */}
                <p className="mt-4">
                    Certifie avoir examiné ce jour{' '}
                    <input 
                        name="nom_employe" 
                        value={formData.nom_employe || ''} 
                        onChange={handleChange} 
                        placeholder="Noms et prénoms de l'employé" 
                        className={`not-printable ${inputStyle}`}
                        style={{ width: '350px', display: 'inline-block' }}
                    />
                    <span className="print-only" style={staticFieldStyle}>{formData.nom_employe || ''}</span>
                </p>

                {/* Ligne Service */}
                <p className="mt-4">
                    travaillant au service{' '}
                    <select 
                        name="service" 
                        value={formData.service || ''} 
                        onChange={handleChange} 
                        className={`not-printable ${selectStyle}`}
                        style={{ width: '300px', display: 'inline-block' }}
                    >
                        <option value="">-- Sélectionner le service --</option>
                        {services.map(s => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                    </select>
                    <span className="print-only" style={staticFieldStyle}>{formData.service || ''}</span>
                </p>

                {/* Déclaration */}
                <p className="mt-8">et le (la) déclare :</p>

                {/* Sélecteur Apte/Inapte - saisie */}
                <div className="not-printable mt-2 mb-4" style={{ marginLeft: '60px' }}>
                    <select 
                        name="declaration" 
                        value={formData.declaration || ''} 
                        onChange={handleChange} 
                        className={selectStyle}
                        style={{ width: '250px' }}
                    >
                        <option value="">-- Choisir --</option>
                        <option value="Apte">✅ Apte</option>
                        <option value="Inapte">❌ Inapte</option>
                    </select>
                </div>

                {/* Cases à cocher Apte / Inapte - affichage PDF */}
                <div className="print-only" style={{ marginLeft: '120px', marginTop: '16px' }}>
                    <div className="flex items-center gap-3 mb-3" style={{ fontSize: '17px' }}>
                        <div style={{ 
                            width: '22px', 
                            height: '22px', 
                            border: '2px solid #000', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}>
                            {formData.declaration === 'Apte' ? '✓' : ''}
                        </div>
                        <span style={{ fontWeight: '500' }}>Apte</span>
                    </div>
                    <div className="flex items-center gap-3" style={{ fontSize: '17px' }}>
                        <div style={{ 
                            width: '22px', 
                            height: '22px', 
                            border: '2px solid #000', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}>
                            {formData.declaration === 'Inapte' ? '✓' : ''}
                        </div>
                        <span style={{ fontWeight: '500' }}>Inapte</span>
                    </div>
                </div>

                <p className="mt-8" style={{ fontSize: '16px' }}>à son poste de travail</p>
            </div>

            {/* ============ ZONE SIGNATURE ============ */}
            <div className="mt-16 flex justify-end" style={{ marginRight: '40px' }}>
                <div style={{ minWidth: '200px' }}>
                    <SignatureFrame label="Le Médecin" signatureUrl={getImageUrl(user?.signaturePath)} stampUrl={getImageUrl(user?.stampPath)} zoneIndex={1} />
                </div>
            </div>

            {/* ============ PIED DE PAGE ============ */}
            <div className="absolute bottom-8 left-0 right-0 text-center" style={{ fontSize: '11px', color: '#333', lineHeight: '1.6' }}>
                <p style={{ fontWeight: 'bold' }}>Hôpital Saint-Jean de Malte</p>
                <p>BP 56 – Njombé-Cameroun</p>
                <p>Tél. : 00 (237) 657 56 91 03 - e-mail : hopitalcameroun@ordredemaltefrance.org</p>
                <p style={{ fontSize: '10px', marginTop: '4px' }}>
                    Dépendant des Œuvres Hospitalières Françaises de l'Ordre de Malte, association reconnue d'utilité publique
                </p>
                <p style={{ fontSize: '10px' }}>
                    en partenariat avec le Ministère de la Santé Publique, et avec les plantations du groupe PHP
                </p>
            </div>
        </div>
    );
};

export default CertificatAptitude;