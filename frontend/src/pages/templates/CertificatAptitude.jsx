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

    const inputCls = {
        width: '100%', padding: '6px 8px', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-2)', background: 'var(--surface)',
        color: 'var(--fg)', fontSize: 13, outline: 'none',
    };
    const selectCls = { ...inputCls, appearance: 'none' };
    const staticFieldStyle = {
        borderBottom: '2px dotted #9CA3AF', padding: '4px 8px',
        fontWeight: '600', color: '#000000', display: 'inline-block', minWidth: '250px'
    };

    return (
        <div ref={pdfContainerRef} style={{ background: '#ffffff', padding: 48, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', margin: '0 auto', position: 'relative', width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#000000' }}>

            {/* EN-TÊTE */}
            <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={logo} alt="Logo Ordre de Malte" style={{ width: '70px' }} />
                    <div>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', display: 'block' }}>ORDRE DE MALTE</span>
                        <span style={{ fontSize: '13px', color: '#DC2626', fontWeight: '600' }}>HÔPITAL SAINT JEAN DE MALTE</span>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <input type="date" name="date_certificat" value={formData.date_certificat || ''} onChange={handleChange} className="not-printable" style={{ ...inputCls, width: 200, textAlign: 'right' }} />
                    <div className="print-only" style={{ fontSize: '15px' }}>
                        Nyombé, le <span style={{ fontWeight: '600' }}>
                            {formData.date_certificat
                                ? new Date(formData.date_certificat).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                : '......................'}
                        </span>
                    </div>
                </div>
            </header>

            {/* TITRE */}
            <div style={{ textAlign: 'center', margin: '48px 0' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '6px', letterSpacing: '1px', margin: 0 }}>
                    CERTIFICAT D'APTITUDE
                </h1>
            </div>

            {/* CORPS */}
            <div style={{ lineHeight: '2.2', fontSize: '16px' }}>
                <p>
                    Je soussigné, Docteur{' '}
                    <input name="nom_docteur" value={formData.nom_docteur || ''} onChange={handleChange} placeholder="Nom du docteur" className="not-printable" style={{ ...inputCls, width: 350, display: 'inline-block' }} />
                    <span className="print-only" style={staticFieldStyle}>{formData.nom_docteur || ''}</span>
                </p>

                <p style={{ marginTop: 16 }}>
                    Certifie avoir examiné ce jour{' '}
                    <input name="nom_employe" value={formData.nom_employe || ''} onChange={handleChange} placeholder="Noms et prénoms de l'employé" className="not-printable" style={{ ...inputCls, width: 350, display: 'inline-block' }} />
                    <span className="print-only" style={staticFieldStyle}>{formData.nom_employe || ''}</span>
                </p>

                <p style={{ marginTop: 16 }}>
                    travaillant au service{' '}
                    <select name="service" value={formData.service || ''} onChange={handleChange} className="not-printable" style={{ ...selectCls, width: 300, display: 'inline-block' }}>
                        <option value="">-- Sélectionner le service --</option>
                        {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <span className="print-only" style={staticFieldStyle}>{formData.service || ''}</span>
                </p>

                <p style={{ marginTop: 32 }}>et le (la) déclare :</p>

                {/* Sélecteur Apte/Inapte - écran */}
                <div className="not-printable" style={{ marginTop: 8, marginBottom: 16, marginLeft: 60 }}>
                    <select name="declaration" value={formData.declaration || ''} onChange={handleChange} style={{ ...selectCls, width: 250 }}>
                        <option value="">-- Choisir --</option>
                        <option value="Apte">✅ Apte</option>
                        <option value="Inapte">❌ Inapte</option>
                    </select>
                </div>

                {/* Cases à cocher PDF */}
                <div className="print-only" style={{ marginLeft: 120, marginTop: 16 }}>
                    {['Apte', 'Inapte'].map((val) => (
                        <div key={val} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, fontSize: '17px' }}>
                            <div style={{ width: 22, height: 22, border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 'bold' }}>
                                {formData.declaration === val ? '✓' : ''}
                            </div>
                            <span style={{ fontWeight: '500' }}>{val}</span>
                        </div>
                    ))}
                </div>

                <p style={{ marginTop: 32, fontSize: '16px' }}>à son poste de travail</p>
            </div>

            {/* SIGNATURE */}
            <div style={{ marginTop: 64, display: 'flex', justifyContent: 'flex-end', marginRight: 40 }}>
                <div style={{ minWidth: 200 }}>
                    <SignatureFrame label="Le Médecin" signatureUrl={getImageUrl(user?.signaturePath)} stampUrl={getImageUrl(user?.stampPath)} zoneIndex={1} />
                </div>
            </div>

            {/* PIED DE PAGE */}
            <div style={{ position: 'absolute', bottom: 32, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: '#333', lineHeight: 1.6 }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 2px' }}>Hôpital Saint-Jean de Malte</p>
                <p style={{ margin: '0 0 2px' }}>BP 56 – Njombé-Cameroun</p>
                <p style={{ margin: '0 0 2px' }}>Tél. : 00 (237) 657 56 91 03 - e-mail : hopitalcameroun@ordredemaltefrance.org</p>
                <p style={{ fontSize: 10, marginTop: 4 }}>Dépendant des Œuvres Hospitalières Françaises de l'Ordre de Malte, association reconnue d'utilité publique</p>
                <p style={{ fontSize: 10 }}>en partenariat avec le Ministère de la Santé Publique, et avec les plantations du groupe PHP</p>
            </div>
        </div>
    );
};

export default CertificatAptitude;
