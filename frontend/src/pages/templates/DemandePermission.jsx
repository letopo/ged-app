// frontend/src/pages/templates/DemandePermission.jsx
import React, { useState, useEffect, useRef } from 'react';
import { usersAPI, servicesAPI } from '../../services/api';
import logo from '../../assets/logo-ordre-malte.png';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Trash2, Calendar } from 'lucide-react';

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
        if (day !== 0 && day !== 6) count++;
        current.setDate(current.getDate() + 1);
    }
    return count;
};

const DemandePermission = ({ formData, setFormData, pdfContainerRef }) => {
    const { user } = useAuth();
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

    useEffect(() => {
        const initData = async () => {
            try {
                if (!formData.periods || formData.periods.length === 0) {
                    setFormData(prev => ({ ...prev, periods: [{ startDate: '', endDate: '' }], totalDays: 0, motif: 'Personnel', remplacant: '' }));
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

    useEffect(() => {
        if (formData.periods) {
            const total = formData.periods.reduce((acc, period) => acc + calculateBusinessDays(period.startDate, period.endDate), 0);
            if (formData.totalDays !== total) setFormData(prev => ({ ...prev, totalDays: total }));
        }
    }, [formData.periods, setFormData]);

    useEffect(() => {
        if (interimRef.current && pdfContainerRef.current) {
            const timer = setTimeout(() => {
                const container = pdfContainerRef.current;
                const interimBox = interimRef.current;
                if (!container || !interimBox) return;
                const anchorSpan = interimBox.querySelector('#interim-anchor');
                if (anchorSpan) {
                    const containerHeight = container.offsetHeight;
                    const spanRect = anchorSpan.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    const relativeTop = spanRect.top - containerRect.top;
                    const targetY = relativeTop + (spanRect.height / 2);
                    const ratio = targetY / containerHeight;
                    setFormData(prev => ({ ...prev, interimYRatio: ratio, interimSpanHeight: spanRect.height }));
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
        setFormData(prev => ({ ...prev, periods: newPeriods, date_debut: firstDate, date_fin: lastDate }));
    };

    const addPeriod = () => setFormData(prev => ({ ...prev, periods: [...prev.periods, { startDate: '', endDate: '' }] }));

    const removePeriod = (index) => setFormData(prev => ({ ...prev, periods: prev.periods.filter((_, i) => i !== index) }));

    const formatDate = (dateStr) => {
        if (!dateStr) return '...';
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const inputCls = { width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none' };
    const selectCls = { ...inputCls, appearance: 'none' };
    const staticFieldStyle = { borderBottom: '2px dotted #9CA3AF', padding: '4px', fontWeight: '600', color: '#000000', display: 'inline-block', minWidth: '200px' };

    return (
        <div ref={pdfContainerRef} style={{ background: '#ffffff', padding: 48, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', margin: '0 auto', position: 'relative', width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#000000' }}>

            {/* EN-TÊTE */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                <img src={logo} alt="Logo" style={{ width: '80px' }} />
                <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '20px', fontWeight: 'bold', display: 'block' }}>ORDRE DE MALTE</span>
                    <span style={{ fontSize: '18px', color: '#DC2626' }}>HÔPITAL SAINT JEAN DE MALTE</span>
                </div>
            </header>

            {/* CHAMPS SUPÉRIEURS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
                <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>NOMS et Prénom(s) :</label>
                    <input name="noms_prenoms" value={formData.noms_prenoms || ''} onChange={handleChange} className="not-printable" style={inputCls} />
                    <div className="print-only" style={staticFieldStyle}>{formData.noms_prenoms || ''}</div>

                    <label style={{ fontWeight: 600, display: 'block', marginTop: 16, marginBottom: 4 }}>Service :</label>
                    <select name="service" value={formData.service || ''} onChange={handleChange} className="not-printable" style={selectCls}>
                        <option value="">-- Sélectionner --</option>
                        {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <div className="print-only" style={staticFieldStyle}>{formData.service || ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ marginBottom: 16 }}>
                        <input name="date_lieu" value={formData.date_lieu || ''} onChange={handleChange} placeholder="Njombé, le ..." className="not-printable" style={{ ...inputCls, textAlign: 'right' }} />
                        <div className="print-only" style={{ textAlign: 'right', fontWeight: 700 }}>{formData.date_lieu}</div>
                    </div>
                    <p style={{ fontWeight: 700, marginTop: 32 }}>A Monsieur le Directeur Général</p>
                    <p>De l'Hôpital Saint Jean de Malte de Njombé</p>
                </div>
            </div>

            {/* OBJET */}
            <div style={{ marginBottom: 24 }}>
                <span style={{ fontWeight: 700 }}>Objet : </span>
                <input name="objet" value={formData.objet || "Demande de permission d'absence"} onChange={handleChange} className="not-printable" style={{ ...inputCls, width: '100%', marginTop: 4 }} />
                <span className="print-only" style={{ fontWeight: 700, textDecoration: 'underline' }}>{formData.objet}</span>
            </div>

            {/* CORPS */}
            <div style={{ marginBottom: 32, lineHeight: 1.8 }}>
                <p style={{ marginBottom: 16 }}>Monsieur,</p>
                <p>Je viens par cette demande solliciter une permission de <span style={{ fontWeight: 700 }}>« {formData.totalDays} jour(s) ouvrable(s) »</span>.</p>

                {/* INTERFACE PÉRIODES */}
                <div className="not-printable" style={{ margin: '16px 0', padding: 16, background: 'var(--brand-soft)', border: '1px solid var(--brand)', borderRadius: 'var(--radius-3)' }}>
                    <h4 style={{ fontWeight: 700, color: 'var(--brand)', marginBottom: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={16}/> Périodes (Week-ends exclus automatiquement)
                    </h4>
                    {formData.periods?.map((period, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <input type="date" style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', outline: 'none', fontSize: 13 }} value={period.startDate} onChange={(e) => handlePeriodChange(index, 'startDate', e.target.value)} />
                            <span>au</span>
                            <input type="date" style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', outline: 'none', fontSize: 13 }} value={period.endDate} onChange={(e) => handlePeriodChange(index, 'endDate', e.target.value)} />
                            <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 8, color: 'var(--fg-muted)', minWidth: 80 }}>
                                {calculateBusinessDays(period.startDate, period.endDate)}j ouvr.
                            </span>
                            {formData.periods.length > 1 && (
                                <button onClick={() => removePeriod(index)} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', borderRadius: 'var(--radius-2)' }}>
                                    <Trash2 size={16}/>
                                </button>
                            )}
                        </div>
                    ))}
                    <button onClick={addPeriod} style={{ fontSize: 12, color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500, marginTop: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Plus size={16}/> Ajouter une période
                    </button>
                </div>

                {/* PÉRIODES PDF */}
                <div className="print-only" style={{ margin: '16px 0', paddingLeft: 16, borderLeft: '4px solid #d1d5db' }}>
                    <p style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: 4 }}>Détail des périodes :</p>
                    {formData.periods?.map((period, index) => (
                        <p key={index}>
                            - Du <span style={{ fontWeight: 700 }}>{formatDate(period.startDate)}</span> au <span style={{ fontWeight: 700 }}>{formatDate(period.endDate)}</span>
                            <span style={{ fontStyle: 'italic', fontSize: 13 }}> ({calculateBusinessDays(period.startDate, period.endDate)} jours ouvrables)</span>
                        </p>
                    ))}
                </div>

                {/* MOTIF - écran */}
                <div className="not-printable" style={{ margin: '24px 0' }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--fg)', fontSize: 13 }}>📝 Type de permission :</label>
                    <select name="motif" value={formData.motif || 'Personnel'} onChange={handleChange} style={selectCls}>
                        <option value="Personnel">Personnel</option>
                        <option value="Journée Directeur">Journée Directeur</option>
                        <option value="Journée Major">Journée Major</option>
                        <option value="Permission d'Urgence">Permission d'Urgence</option>
                        <option value="Exceptionnel">Permission exceptionnel</option>
                    </select>
                    {formData.motif === 'Exceptionnel' && (
                        <div style={{ marginTop: 8 }}>
                            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, color: 'var(--danger)', fontSize: 13 }}>Préciser l'événement :</label>
                            <select name="motif_exceptionnel" value={formData.motif_exceptionnel || ''} onChange={handleChange} style={{ ...selectCls, borderColor: 'var(--danger)' }}>
                                <option value="">-- Choisir le motif --</option>
                                {exceptionalReasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {/* MOTIF PDF */}
                <p className="print-only" style={{ marginTop: 16 }}>
                    Pour le motif suivant : <span style={{ fontWeight: 700, fontStyle: 'italic' }}>{formData.motif}</span>
                    {formData.motif === 'Exceptionnel' && formData.motif_exceptionnel && (
                        <span> : <span style={{ textDecoration: 'underline' }}>{formData.motif_exceptionnel}</span></span>
                    )}.
                </p>

                {/* ZONE REMPLAÇANT */}
                <div ref={interimRef} style={{ marginTop: 24, padding: 8, border: '1px dotted #9ca3af', background: '#f9fafb' }} className="print-only">
                    <p style={{ fontWeight: 700 }}>
                        Intérim assuré par :
                        <span id="interim-anchor" data-anchor="true" style={{ position: 'relative' }}>
                            __________________________________________________
                        </span>
                    </p>
                    <p style={{ fontSize: 10, fontStyle: 'italic', color: '#6b7280', textAlign: 'right' }}>(A remplir par le validateur / Chef de service)</p>
                </div>

                <p style={{ marginTop: 32 }}>Dans l'attente d'une suite favorable, veuillez agréer Monsieur l'expression de mon plus profond respect.</p>
            </div>

            {/* SIGNATURES */}
            <div style={{ position: 'absolute', bottom: 96, left: 48, right: 48, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, paddingTop: 32, borderTop: '1px solid #d1d5db' }}>
                <SignatureFrame label="Le Demandeur" signatureUrl={getImageUrl(user?.signaturePath)} stampUrl={getImageUrl(user?.stampPath)} zoneIndex={1} />
                <SignatureFrame label="Chef de Service / RH" signatureUrl={null} stampUrl={null} zoneIndex={2} />
                <SignatureFrame label="Le Directeur Général" signatureUrl={null} stampUrl={null} zoneIndex={3} />
            </div>
        </div>
    );
};

export default DemandePermission;
