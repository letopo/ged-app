// frontend/src/pages/templates/DemandePermission.jsx
// Formulaire « Demande de permission d'absence », présenté comme la lettre
// finale. Le PDF n'est PAS une capture de cet écran : il est dessiné à part
// (pdf-templates/PermissionPdf.jsx) à partir des mêmes données.
//
// Mise en page en colonne : les cadres de signature suivent le contenu (ils
// étaient fixés en bas de page et recouvraient le choix du type de permission
// dès que la lettre s'allongeait, rendant la liste inutilisable).
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usersAPI, servicesAPI } from '../../services/api';
import logo from '../../assets/logo-ordre-malte.png';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Trash2, Calendar, AlertTriangle, Check } from 'lucide-react';

export const calculateBusinessDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (start > end) return 0;
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) count++;
        current.setDate(current.getDate() + 1);
    }
    return count;
};

// Types de permission (valeur enregistrée → libellé affiché)
export const PERMISSION_TYPES = [
    { value: 'Personnel', label: 'Personnel', hint: 'Convenance personnelle' },
    { value: 'Journée Directeur', label: 'Journée Directeur', hint: 'Accordée par la Direction' },
    { value: 'Journée Major', label: 'Journée Major', hint: 'Accordée par le Major' },
    { value: "Permission d'Urgence", label: "Permission d'Urgence", hint: 'Événement imprévu' },
    { value: 'Exceptionnel', label: 'Permission exceptionnelle', hint: 'Événement familial ou distinction' },
];

// Événements ouvrant droit à une permission exceptionnelle (durée prévue)
export const EXCEPTIONAL_REASONS = [
    { value: 'mariage du travailleur (5 jours)', days: 5 },
    { value: "accouchement de l'épouse du travailleur (3 jours)", days: 3 },
    { value: "mariage d'un enfant du travailleur (2 jours)", days: 2 },
    { value: 'décès du conjoint du travailleur (5 jours)', days: 5 },
    { value: 'décès du père ou de la mère du travailleur (5 jours)', days: 5 },
    { value: "décès d'un frère ou d'une sœur (2 jour)", days: 2 },
    { value: "médaille d'honneur du travail (2 jours)", days: 2 },
];

// Délai de prévenance : une permission se demande au moins 2 jours OUVRABLES à
// l'avance (le week-end ne compte pas : vendredi → mardi) ; les administrateurs
// peuvent y déroger (urgences). Même règle côté serveur.
export const PERMISSION_NOTICE_DAYS = 2;
export const isPermissionAdmin = (user) => ['admin', 'superadmin'].includes(user?.role);
export function permissionEarliestStart() {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Douala' }); // AAAA-MM-JJ
    const d = new Date(`${today}T12:00:00Z`);
    let added = 0;
    while (added < PERMISSION_NOTICE_DAYS) {
        d.setUTCDate(d.getUTCDate() + 1);
        const wd = d.getUTCDay();
        if (wd !== 0 && wd !== 6) added++;
    }
    return d.toISOString().slice(0, 10);
}
const frDate = (iso) => iso.split('-').reverse().join('/');

const INK = '#111827';
const MUTED = '#6b7280';
const BRAND = '#1B3A6B';

const DemandePermission = ({ formData, setFormData, pdfContainerRef }) => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [services, setServices] = useState([]);

    useEffect(() => {
        const initData = async () => {
            try {
                if (!formData.periods || formData.periods.length === 0) {
                    setFormData(prev => ({ ...prev, periods: [{ startDate: '', endDate: '' }], totalDays: 0, motif: prev.motif || 'Personnel', remplacant: '' }));
                }
                const servicesRes = await servicesAPI.getAll();
                setServices(servicesRes.data.data || []);
                const userRes = await usersAPI.getMyService();
                if (userRes.data.success && userRes.data.service) {
                    setFormData(prev => ({ ...prev, service: prev.service || userRes.data.service.name }));
                }
            } catch (error) {
                console.error('Erreur chargement', error);
            }
        };
        initData();
    }, []);

    // Nom du demandeur pré-rempli avec l'utilisateur connecté
    useEffect(() => {
        if (user && !formData.noms_prenoms) {
            const name = `${user.lastName || ''} ${user.firstName || ''}`.trim();
            if (name) setFormData(prev => ({ ...prev, noms_prenoms: prev.noms_prenoms || name }));
        }
    }, [user]);

    useEffect(() => {
        if (formData.periods) {
            const total = formData.periods.reduce((acc, p) => acc + calculateBusinessDays(p.startDate, p.endDate), 0);
            if (formData.totalDays !== total) setFormData(prev => ({ ...prev, totalDays: total }));
        }
    }, [formData.periods, setFormData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const setPeriods = (periods) => {
        const dated = periods.filter(p => p.startDate || p.endDate);
        setFormData(prev => ({
            ...prev,
            periods,
            date_debut: dated.length ? dated.map(p => p.startDate).filter(Boolean).sort()[0] || '' : '',
            date_fin: dated.length ? dated.map(p => p.endDate).filter(Boolean).sort().slice(-1)[0] || '' : '',
        }));
    };
    const handlePeriodChange = (index, field, value) => {
        const next = (formData.periods || []).map((p, i) => (i === index ? { ...p, [field]: value } : p));
        setPeriods(next);
    };
    const addPeriod = () => setPeriods([...(formData.periods || []), { startDate: '', endDate: '' }]);
    const removePeriod = (index) => setPeriods((formData.periods || []).filter((_, i) => i !== index));

    const setMotif = (value) => setFormData(prev => ({ ...prev, motif: value, motif_exceptionnel: value === 'Exceptionnel' ? prev.motif_exceptionnel || '' : '' }));

    const motif = formData.motif || 'Personnel';
    const motifLabel = PERMISSION_TYPES.find(x => x.value === motif)?.label || motif;
    const exceptional = EXCEPTIONAL_REASONS.find(r => r.value === formData.motif_exceptionnel);
    const totalDays = formData.totalDays || 0;
    const isAdmin = isPermissionAdmin(user);
    const earliest = permissionEarliestStart();

    // Styles (page blanche, même en thème sombre : c'est la lettre)
    const fieldLine = {
        width: '100%', boxSizing: 'border-box', padding: '7px 10px', fontSize: 14, color: INK,
        border: '1px solid #d1d5db', borderRadius: 6, background: '#f9fafb', outline: 'none', fontFamily: 'inherit',
    };
    const label = { display: 'block', fontSize: 12, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 };
    const sectionTitle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: BRAND, marginBottom: 10 };
    const chip = (active) => ({
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, textAlign: 'left', cursor: 'pointer',
        padding: '10px 12px', borderRadius: 8, fontFamily: 'inherit',
        border: `1.5px solid ${active ? BRAND : '#d1d5db'}`, background: active ? '#eef2fb' : '#fff', color: INK,
    });

    return (
        <div ref={pdfContainerRef}
            style={{ background: '#ffffff', padding: '44px 48px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', margin: '0 auto', position: 'relative',
                width: '210mm', maxWidth: '100%', boxSizing: 'border-box', minHeight: '297mm', display: 'flex', flexDirection: 'column',
                fontFamily: 'Arial, sans-serif', fontSize: 15, color: INK }}>

            {/* EN-TÊTE */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingBottom: 14, borderBottom: '2px solid #DC2626', marginBottom: 28 }}>
                <img src={logo} alt="Logo" style={{ width: 96 }} />
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '.5px' }}>{t('ORDRE DE MALTE')}</div>
                    <div style={{ fontSize: 15, color: '#DC2626', fontWeight: 600 }}>{t('HÔPITAL SAINT JEAN DE MALTE')}</div>
                </div>
            </header>

            {/* DEMANDEUR + DESTINATAIRE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, marginBottom: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={label} htmlFor="perm-noms">{t('NOMS et Prénom(s)')}</label>
                        <input id="perm-noms" name="noms_prenoms" value={formData.noms_prenoms || ''} onChange={handleChange} style={fieldLine} placeholder={t('Nom et prénom(s) du demandeur')} />
                    </div>
                    <div>
                        <label style={label} htmlFor="perm-service">{t('Service')}</label>
                        <select id="perm-service" name="service" value={formData.service || ''} onChange={handleChange} style={fieldLine}>
                            <option value="">{t('-- Sélectionner --')}</option>
                            {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            {formData.service && !services.some(s => s.name === formData.service) && <option value={formData.service}>{formData.service}</option>}
                        </select>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14, textAlign: 'right' }}>
                    <div style={{ width: '100%', maxWidth: 280 }}>
                        <label style={{ ...label, textAlign: 'right' }} htmlFor="perm-lieu">{t('Lieu et date')}</label>
                        <input id="perm-lieu" name="date_lieu" value={formData.date_lieu || ''} onChange={handleChange} placeholder={t('Njombé, le ...')} style={{ ...fieldLine, textAlign: 'right' }} />
                    </div>
                    <div style={{ lineHeight: 1.5 }}>
                        <div style={{ fontWeight: 700 }}>{t('A Monsieur le Directeur Général')}</div>
                        <div>{t("De l'Hôpital Saint Jean de Malte de Njombé")}</div>
                    </div>
                </div>
            </div>

            {/* OBJET */}
            <div style={{ marginBottom: 22 }}>
                <label style={label} htmlFor="perm-objet">{t('Objet')}</label>
                <input id="perm-objet" name="objet" value={formData.objet ?? "Demande de permission d'absence"} onChange={handleChange} style={{ ...fieldLine, fontWeight: 700 }} />
            </div>

            {/* CORPS */}
            <p style={{ margin: '0 0 10px' }}>{t('Monsieur,')}</p>
            <p style={{ margin: '0 0 18px', lineHeight: 1.7 }}>
                {t('Je viens par cette demande solliciter une permission de')}{' '}
                <strong>{t('« {{count}} jour(s) ouvrable(s) »', { count: totalDays })}</strong>
                {' '}{t('pour le motif suivant')} : <strong><em>{t(motifLabel)}</em></strong>
                {exceptional && <> — <span style={{ textDecoration: 'underline' }}>{t(exceptional.value)}</span></>}.
            </p>

            {/* PÉRIODES */}
            <section style={{ padding: 16, border: '1px solid #c7d2fe', background: '#f5f7ff', borderRadius: 10, marginBottom: 18 }}>
                <div style={sectionTitle}><Calendar size={16} /> {t('Périodes')} <span style={{ fontWeight: 500, color: MUTED, fontSize: 12 }}>({t('week-ends exclus automatiquement')})</span></div>
                <div style={{ fontSize: 12, color: isAdmin ? '#b45309' : MUTED, margin: '-4px 0 10px' }}>
                    {isAdmin
                        ? t('Délai de 2 jours ouvrables : en tant qu\'administrateur, vous pouvez déroger (urgence).')
                        : t('Une permission se demande au moins 2 jours ouvrables à l\'avance : première date possible le {{date}}.', { date: frDate(earliest) })}
                </div>
                {(formData.periods || []).map((period, index) => {
                    const days = calculateBusinessDays(period.startDate, period.endDate);
                    const inverted = period.startDate && period.endDate && period.endDate < period.startDate;
                    const tooSoon = !isAdmin && period.startDate && period.startDate < earliest;
                    return (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={{ fontSize: 13, color: MUTED, width: 22 }}>{t('Du')}</span>
                            <input type="date" aria-label={t('Date de début')} value={period.startDate} min={isAdmin ? undefined : earliest} onChange={(e) => handlePeriodChange(index, 'startDate', e.target.value)} style={{ ...fieldLine, width: 160, background: '#fff', borderColor: tooSoon ? '#dc2626' : '#d1d5db' }} />
                            <span style={{ fontSize: 13, color: MUTED }}>{t('au')}</span>
                            <input type="date" aria-label={t('Date de fin')} value={period.endDate} min={period.startDate || (isAdmin ? undefined : earliest)} onChange={(e) => handlePeriodChange(index, 'endDate', e.target.value)} style={{ ...fieldLine, width: 160, background: '#fff', borderColor: inverted ? '#dc2626' : '#d1d5db' }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: days ? BRAND : MUTED, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 999, padding: '3px 10px' }}>
                                {t('{{count}} j. ouvrable(s)', { count: days })}
                            </span>
                            {(formData.periods || []).length > 1 && (
                                <button type="button" onClick={() => removePeriod(index)} aria-label={t('Supprimer la période')} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                                    <Trash2 size={16} />
                                </button>
                            )}
                            {inverted && <span style={{ width: '100%', fontSize: 12, color: '#dc2626', paddingLeft: 30 }}>{t('La date de fin est avant la date de début.')}</span>}
                            {tooSoon && <span style={{ width: '100%', fontSize: 12, color: '#dc2626', paddingLeft: 30 }}>{t('Trop tôt : la permission doit commencer au plus tôt le {{date}} (2 jours ouvrables de délai).', { date: frDate(earliest) })}</span>}
                        </div>
                    );
                })}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                    <button type="button" onClick={addPeriod} style={{ fontSize: 13, color: BRAND, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <Plus size={16} /> {t('Ajouter une période')}
                    </button>
                    <span style={{ fontSize: 13, color: INK }}>{t('Total')} : <strong>{t('{{count}} jour(s) ouvrable(s)', { count: totalDays })}</strong></span>
                </div>
            </section>

            {/* TYPE DE PERMISSION */}
            <section style={{ marginBottom: 18 }}>
                <div style={sectionTitle}>{t('Type de permission')}</div>
                <div role="radiogroup" aria-label={t('Type de permission')} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
                    {PERMISSION_TYPES.map(opt => {
                        const active = motif === opt.value;
                        return (
                            <button key={opt.value} type="button" role="radio" aria-checked={active} onClick={() => setMotif(opt.value)} style={chip(active)}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700 }}>
                                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? BRAND : '#9ca3af'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: active ? BRAND : '#fff', flexShrink: 0 }}>
                                        {active && <Check size={10} color="#fff" strokeWidth={3} />}
                                    </span>
                                    {t(opt.label)}
                                </span>
                                <span style={{ fontSize: 12, color: MUTED, paddingLeft: 22 }}>{t(opt.hint)}</span>
                            </button>
                        );
                    })}
                </div>

                {motif === 'Exceptionnel' && (
                    <div style={{ marginTop: 12, padding: 14, border: '1px solid #fecaca', background: '#fff7f7', borderRadius: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c', marginBottom: 8 }}>{t("Préciser l'événement")}</div>
                        <div role="radiogroup" aria-label={t("Préciser l'événement")} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {EXCEPTIONAL_REASONS.map(r => {
                                const active = formData.motif_exceptionnel === r.value;
                                return (
                                    <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', padding: '6px 8px', borderRadius: 6, background: active ? '#fee2e2' : 'transparent' }}>
                                        <input type="radio" name="motif_exceptionnel" value={r.value} checked={active} onChange={handleChange} style={{ accentColor: '#b91c1c' }} />
                                        <span style={{ flex: 1 }}>{t(r.value)}</span>
                                    </label>
                                );
                            })}
                        </div>
                        {exceptional && totalDays > exceptional.days && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: '#b45309' }}>
                                <AlertTriangle size={14} /> {t('Les périodes ({{total}} j.) dépassent la durée prévue pour cet événement ({{days}} j.).', { total: totalDays, days: exceptional.days })}
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* INTÉRIM (rempli par le validateur à l'approbation) */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', padding: '10px 12px', border: '1px dashed #d1d5db', borderRadius: 8, background: '#fafafa', marginBottom: 18 }}>
                <strong style={{ fontSize: 14 }}>{t('Intérim assuré par')} :</strong>
                <span style={{ flex: 1, minWidth: 120, borderBottom: '1px dotted #9ca3af', height: 16 }} />
                <span style={{ fontSize: 11, fontStyle: 'italic', color: MUTED }}>{t('(A remplir par le validateur / Chef de service)')}</span>
            </div>

            <p style={{ margin: '0 0 28px', lineHeight: 1.7 }}>{t("Dans l'attente d'une suite favorable, veuillez agréer Monsieur l'expression de mon plus profond respect.")}</p>

            {/* SIGNATURES : à la suite du contenu, jamais par-dessus */}
            <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
                <SignatureFrame fixedLabel label={t('Le Demandeur')} signatureUrl={getImageUrl(user?.signaturePath)} stampUrl={getImageUrl(user?.stampPath)} zoneIndex={1} />
                <SignatureFrame label={t('Chef de Service / RH')} signatureUrl={null} stampUrl={null} zoneIndex={2} />
                <SignatureFrame label={t('Le Directeur Général')} signatureUrl={null} stampUrl={null} zoneIndex={3} />
            </div>
        </div>
    );
};

export default DemandePermission;
