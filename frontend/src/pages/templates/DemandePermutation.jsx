// frontend/src/pages/templates/DemandePermutation.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usersAPI, servicesAPI } from '../../services/api';
import logo from '../../assets/logo-ordre-malte.png';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';

const DemandePermutation = ({ formData, setFormData, pdfContainerRef }) => {
    const { user } = useAuth();
    const [services, setServices] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) { setLoadingData(false); return; }
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
                ? userServiceResponse.data.service.name : '';
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

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (formData.demandeur_noms_prenoms || formData.permute_noms_prenoms) {
            setFormData(prev => ({
                ...prev,
                signatureZones: [
                    { role: 'requester', label: 'Le Demandeur', x: 40, y: 200, width: 60, height: 20, page: 1 },
                    { role: 'substitute', label: 'Le Remplaçant', x: 110, y: 200, width: 60, height: 20, page: 1 }
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
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

    const inputCls = {
        width: '100%',
        borderBottom: '2px solid #9ca3af',
        background: 'transparent',
        outline: 'none',
        fontSize: '15px',
        fontWeight: '600',
        padding: '2px 4px',
    };

    if (loadingData) {
        return <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>Chargement des données...</div>;
    }

    return (
        <div ref={pdfContainerRef} style={{ background: '#ffffff', padding: 48, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', margin: '0 auto', position: 'relative', width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif', fontSize: '15px' }}>

            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={logo} alt="Logo" style={{ width: '80px' }} />
                    <h1 style={{ textAlign: 'left', margin: 0 }}>
                        <span style={{ fontSize: '20px', fontWeight: 'bold', display: 'block' }}>ORDRE DE MALTE</span>
                        <span style={{ fontSize: '18px', color: '#DC2626' }}>HÔPITAL SAINT JEAN DE MALTE</span>
                    </h1>
                </div>
            </header>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
                <div style={{ width: '50%' }}>
                    <p style={{ fontWeight: 600, display: 'block', marginBottom: 8, fontSize: '15px' }}>NOMS et prénom(s) du demandeur</p>
                    <input name="demandeur_noms_prenoms" value={formData.demandeur_noms_prenoms || ''} onChange={handleChange} className="not-printable" style={inputCls} />
                    <div className="print-only" style={{ ...staticFieldStyle, display: 'none', borderBottom: 'none' }}>{formData.demandeur_noms_prenoms || ' '}</div>

                    <p style={{ fontWeight: 600, display: 'block', marginBottom: 8, marginTop: 24, fontSize: '15px' }}>Service</p>
                    <input name="service" value={formData.service || ''} onChange={handleChange} className="not-printable" style={inputCls} />
                    <div className="print-only" style={{ ...staticFieldStyle, display: 'none', borderBottom: 'none' }}>{formData.service || ' '}</div>
                </div>
                <div style={{ width: '35%', textAlign: 'right' }}>
                    <p>
                        Njombé le <span className="print-only" style={{ fontWeight: 700, textDecoration: 'underline', display: 'inline' }}>
                            {formatDate(new Date())}
                        </span>
                    </p>
                    <p style={{ fontWeight: 600, marginTop: 24 }}>A Monsieur le Directeur Général</p>
                    <p>De l'Hôpital Saint Jean de Malte de Njombé</p>
                </div>
            </div>

            <div style={{ marginBottom: 24 }}>
                <label style={{ fontWeight: 700, fontSize: '15px' }}>Objet :</label>
                <div style={{ display: 'inline-block', fontWeight: 700, marginLeft: 8 }}>Demande de permutation</div>
            </div>

            <div style={{ marginBottom: 16 }}>
                <p style={{ marginBottom: 24, fontWeight: 700, fontSize: '15px' }}>Monsieur,</p>

                {/* Sélecteur personne (écran seulement) */}
                <div className="not-printable" style={{ marginBottom: 16, padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--fg)', fontSize: 14 }}>
                        Personne avec qui permuter :
                    </label>
                    <input
                        name="permute_noms_prenoms"
                        value={formData.permute_noms_prenoms || ''}
                        onChange={handleChange}
                        style={{ width: '100%', borderBottom: '2px solid var(--border)', background: 'transparent', outline: 'none', fontSize: '15px', fontWeight: '600', padding: '2px 4px' }}
                        placeholder="Saisir le nom et prénom"
                    />
                </div>

                {/* Corps de la lettre */}
                <div style={{ fontSize: '15px', lineHeight: '2.5', textAlign: 'justify' }}>
                    <span>
                        Je viens par la présente vous solliciter respectueusement pour une permutation entre
                        <span style={{ fontWeight: 700, textDecoration: 'underline', margin: '0 4px' }}>{formData.permute_noms_prenoms || '______________________'}</span>
                        et
                        <span style={{ fontWeight: 700, textDecoration: 'underline', margin: '0 4px' }}>{formData.demandeur_noms_prenoms}</span>
                        en date du
                        <span style={{ display: 'inline-block', margin: '0 4px' }}>
                            <input type="date" name="date_permutation" value={formData.date_permutation || ''} onChange={handleChange} className="not-printable" style={{ borderBottom: '1px solid #9ca3af', background: 'transparent', outline: 'none', fontWeight: 700, width: 130, display: 'inline-block' }} />
                            <span className="print-only" style={{ fontWeight: 700, textDecoration: 'underline', display: 'none' }}>{formatDate(formData.date_permutation)}</span>
                        </span>
                        au
                        <span style={{ display: 'inline-block', margin: '0 4px' }}>
                            <input type="date" name="date_permutation_fin" value={formData.date_permutation_fin || ''} onChange={handleChange} className="not-printable" style={{ borderBottom: '1px solid #9ca3af', background: 'transparent', outline: 'none', fontWeight: 700, width: 130, display: 'inline-block' }} />
                            <span className="print-only" style={{ fontWeight: 700, textDecoration: 'underline', display: 'none' }}>{formatDate(formData.date_permutation_fin)}</span>
                        </span>.
                    </span>

                    <br />

                    <span style={{ display: 'inline-block', marginTop: 10 }}>
                        En effet,
                        <span style={{ fontWeight: 700, textDecoration: 'underline', margin: '0 4px' }}>{formData.permute_noms_prenoms || '______________________'}</span>
                        assurera ma plage horaire ce jour-là, de
                        <span style={{ display: 'inline-block', margin: '0 4px' }}>
                            <input type="time" name="plage_horaire_debut" value={formData.plage_horaire_debut || ''} onChange={handleChange} className="not-printable" style={{ borderBottom: '1px solid #9ca3af', background: 'transparent', outline: 'none', textAlign: 'center', fontWeight: 700, width: 100, display: 'inline-block', cursor: 'pointer' }} />
                            <span className="print-only" style={{ fontWeight: 700, display: 'none' }}>{formData.plage_horaire_debut || '______'}</span>
                        </span>
                        à
                        <span style={{ display: 'inline-block', margin: '0 4px' }}>
                            <input type="time" name="plage_horaire_fin" value={formData.plage_horaire_fin || ''} onChange={handleChange} className="not-printable" style={{ borderBottom: '1px solid #9ca3af', background: 'transparent', outline: 'none', textAlign: 'center', fontWeight: 700, width: 100, display: 'inline-block', cursor: 'pointer' }} />
                            <span className="print-only" style={{ fontWeight: 700, display: 'none' }}>{formData.plage_horaire_fin || '______'}</span>
                        </span>,
                        laquelle sera remboursée ultérieurement, pour des raisons personnelles.
                    </span>
                </div>
            </div>

            <p style={{ marginTop: 24, marginBottom: 32, fontSize: '15px', lineHeight: 1.6 }}>
                Dans l'attente d'une suite favorable, veuillez agréer, Monsieur, l'expression de ma considération distinguée.
            </p>

            {/* Signatures Demandeur / Remplaçant */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 16px', marginBottom: 80 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div id="signature-zone-requester" style={{ border: '1px solid transparent', borderRadius: 6, width: 200, height: 50, marginBottom: 5, backgroundColor: 'transparent' }}></div>
                    <p style={{ fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{formData.demandeur_noms_prenoms || 'Le Demandeur'}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div id="signature-zone-substitute" style={{ border: '1px solid transparent', borderRadius: 6, width: 200, height: 50, marginBottom: 5, backgroundColor: 'transparent' }}></div>
                    <p style={{ fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{formData.permute_noms_prenoms || 'Le Remplaçant'}</p>
                </div>
            </div>

            {/* Signatures administratives */}
            <div style={{ position: 'absolute', bottom: 64, left: 48, right: 48, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
                <SignatureFrame label="Signature du Major" signatureUrl={null} stampUrl={null} zoneIndex={1} />
                <SignatureFrame label="Chef de service" signatureUrl={null} stampUrl={null} zoneIndex={2} />
                <SignatureFrame label="La Directrice Des Soins" signatureUrl={null} stampUrl={null} zoneIndex={3} />
            </div>
        </div>
    );
};

export default DemandePermutation;
