// frontend/src/components/php/PHPPatientRegistration.jsx
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, UserPlus, AlertCircle, CheckCircle, FileText,
  Loader, Stethoscope, UserCheck, RefreshCw, Search
} from 'lucide-react';
import { phpPatientAPI, phpReferenceAPI } from '../../services/phpService';
import PHPConsultationForm from './PHPConsultationForm';

const inputStyle = (extra = {}) => ({
  width: '100%', padding: '8px 12px', fontSize: 13,
  border: '1.5px solid var(--border)', borderRadius: 'var(--radius-2)',
  background: 'var(--surface)', color: 'var(--fg)', outline: 'none', boxSizing: 'border-box',
  ...extra,
});
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 4 };
const sectionTitle = { fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 };

export default function PHPPatientRegistration({ onClose, onSuccess }) {
  const { t } = useTranslation();
  const [searchStatus, setSearchStatus] = useState('idle');
  const [patientTrouve, setPatientTrouve]   = useState(null);
  const [searchError,   setSearchError]     = useState(null);
  const debounceRef = useRef(null);
  const searchSeq = useRef(0); // ignore les réponses d'une recherche dépassée

  const [secteurs,    setSecteurs]    = useState([]);
  const [servicesMed, setServicesMed] = useState([]);

  const [form, setForm] = useState({
    matricule: '', nom: '', prenom: '', genre: '', dateNaissance: '',
    secteurId: '', telephone: '', genererBon: true,
    serviceDestination: 'Consultation Médicale', motifVisite: '',
  });
  const [infirmerieMapped, setInfirmerieMapped] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [formError, setFormError] = useState(null);
  const [modeConsult, setModeConsult] = useState(false);
  const [patientPourConsult, setPatientPourConsult] = useState(null);

  useEffect(() => {
    Promise.all([phpReferenceAPI.getSecteurs(), phpReferenceAPI.getServicesMedicaux()])
      .then(([secRes, svcRes]) => {
        setSecteurs(secRes.data.data || []);
        setServicesMed(svcRes.data.data || []);
      }).catch(console.error);
  }, []);

  // Recherche du matricule dans la liste des patients : remplit la fiche si trouvé
  const runSearch = async (v) => {
    clearTimeout(debounceRef.current);
    if (!v) return;
    const seq = ++searchSeq.current;
    setSearchStatus('searching');
    setSearchError(null);
    try {
      const res = await phpPatientAPI.searchByMatricule(encodeURIComponent(v));
      if (seq !== searchSeq.current) return;
      const patient = res.data.data;
      if (patient) { setPatientTrouve(patient); setSearchStatus('found'); autoFillForm(patient); }
      else { setPatientTrouve(null); setSearchStatus('not_found'); }
    } catch (err) {
      if (seq !== searchSeq.current) return;
      if (err.response?.status === 404) { setPatientTrouve(null); setSearchStatus('not_found'); }
      else { setSearchStatus('idle'); setSearchError(err.response?.data?.message || t('Erreur réseau lors de la recherche')); }
    }
  };

  const handleMatriculeChange = (val) => {
    const v = val.toUpperCase().replace(/\s+/g, '');
    setForm(f => ({ ...f, matricule: v }));
    setSearchError(null);
    clearTimeout(debounceRef.current);
    searchSeq.current++;
    if (patientTrouve) { setPatientTrouve(null); resetForm(v); }
    if (!v) { setSearchStatus('idle'); return; }
    if (v.length < 3) { setSearchStatus('idle'); return; }
    setSearchStatus('typing');
    debounceRef.current = setTimeout(() => runSearch(v), 800);
  };

  const autoFillForm = (p) => {
    setForm(f => ({ ...f, nom: p.nom||'', prenom: p.prenom||'', genre: p.genre||'', dateNaissance: p.dateNaissance||'', secteurId: p.secteur?.id||p.secteurId||'', telephone: p.telephone||'' }));
    if (p.infirmerie) setInfirmerieMapped(p.infirmerie);
  };

  const resetForm = (matricule = '') => {
    setForm({ matricule, nom:'', prenom:'', genre:'', dateNaissance:'', secteurId:'', telephone:'', genererBon:true, serviceDestination:'Consultation Médicale', motifVisite:'' });
    setInfirmerieMapped(null);
  };

  const handleSecteurChange = (id) => {
    setForm(f => ({ ...f, secteurId: id }));
    const s = secteurs.find(x => x.id === id);
    setInfirmerieMapped(s?.infirmerie || null);
  };

  const handleSubmit = async (e, goConsult = false) => {
    e.preventDefault();
    if (!form.matricule || !form.nom) { setFormError(t('Matricule et nom sont obligatoires')); return; }
    setLoading(true); setFormError(null);
    try {
      const res = await phpPatientAPI.create(form);
      const patient = res.data.data;
      const bon     = res.data.bon;
      setSearchStatus('saved'); setPatientTrouve(patient);
      if (goConsult) { setPatientPourConsult(patient); setModeConsult(true); }
      else { onSuccess(patient, bon); }
    } catch (err) {
      if (err.response?.status === 409) setFormError(t('Ce matricule est déjà enregistré — cherchez-le ci-dessus'));
      else setFormError(err.response?.data?.message || t("Erreur lors de l'enregistrement"));
    } finally { setLoading(false); }
  };

  if (modeConsult && patientPourConsult) {
    return <PHPConsultationForm patient={patientPourConsult} onClose={() => setModeConsult(false)} onSuccess={() => { setModeConsult(false); onSuccess(patientPourConsult, null); }} />;
  }

  const isFound    = searchStatus === 'found';
  const isNotFound = searchStatus === 'not_found';
  const isSearching= searchStatus === 'searching' || searchStatus === 'typing';
  const readOnly   = isFound;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 672, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isFound
              ? <UserCheck size={20} style={{ color: 'var(--success)' }} />
              : <UserPlus  size={20} style={{ color: 'var(--brand)' }} />
            }
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>
              {isFound ? t('Patient trouvé — action rapide') : t('Enregistrer un patient PHP')}
            </h2>
          </div>
          <button onClick={onClose} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', borderRadius: 'var(--radius-2)', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Champ matricule */}
          <div>
            <label style={labelStyle}>{t('Matricule')} <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                inputMode="numeric"
                value={form.matricule}
                onChange={e => handleMatriculeChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(form.matricule); } }}
                placeholder={t('Ex: 100049')}
                autoFocus
                style={{ ...inputStyle({ fontFamily: 'var(--font-mono)', paddingRight: 36, border: `1.5px solid ${isFound ? 'var(--success)' : isNotFound ? 'var(--brand)' : 'var(--border)'}`, background: isFound ? 'var(--success-soft)' : 'var(--surface)' }) }}
              />
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                {isSearching && <Loader size={15} style={{ color: 'var(--fg-muted)' }} className="animate-spin" />}
                {isFound     && <CheckCircle size={15} style={{ color: 'var(--success)' }} />}
                {isNotFound  && <UserPlus   size={15} style={{ color: 'var(--brand)' }} />}
              </div>
            </div>
            <button type="button" onClick={() => runSearch(form.matricule)} disabled={!form.matricule || isSearching}
              title={t('Rechercher ce matricule dans la liste des patients')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', fontSize: 13, fontWeight: 600, background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-2)', cursor: !form.matricule || isSearching ? 'not-allowed' : 'pointer', opacity: !form.matricule || isSearching ? 0.5 : 1, flexShrink: 0 }}
            >
              {isSearching ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
              {t('Rechercher')}
            </button>
            </div>
            {searchError && (
              <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={11} /> {searchError}
              </p>
            )}
          </div>

          {/* Bannière patient trouvé */}
          {isFound && patientTrouve && (
            <div style={{ borderRadius: 'var(--radius-3)', border: '2px solid var(--success)', background: 'var(--success-soft)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                    {patientTrouve.nom?.[0] || '?'}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--fg)', fontSize: 14, margin: '0 0 2px' }}>
                      {patientTrouve.nom} {patientTrouve.prenom || ''}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 4px' }}>
                      {t('Matricule')} : <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{patientTrouve.matricule}</span>
                      {patientTrouve.infirmerie && <> · {patientTrouve.infirmerie.nom}</>}
                      {patientTrouve.secteur && <> · {t('Secteur {{name}}', { name: patientTrouve.secteur.nom })}</>}
                    </p>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(16,185,129,0.2)', color: 'var(--success)', fontWeight: 500 }}>
                      ✓ {t('Patient existant')}
                    </span>
                  </div>
                </div>
                <button type="button"
                  onClick={() => { setSearchStatus('idle'); setPatientTrouve(null); resetForm(''); }}
                  title={t('Effacer et rechercher un autre patient')}
                  style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)', borderRadius: 'var(--radius-2)', display: 'flex' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              {/* Informations déjà connues du patient */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12, padding: 10, background: 'var(--surface)', borderRadius: 'var(--radius-2)' }}>
                {[
                  [t('Genre'), patientTrouve.genre === 'M' ? t('Masculin') : patientTrouve.genre === 'F' ? t('Féminin') : null],
                  [t('Date de naissance'), patientTrouve.dateNaissance ? patientTrouve.dateNaissance.slice(0, 10).split('-').reverse().join('/') : null],
                  [t('Téléphone'), patientTrouve.telephone],
                  [t('Secteur de travail'), patientTrouve.secteur?.nom],
                  [t('Infirmerie'), patientTrouve.infirmerie?.nom],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: value ? 'var(--fg)' : 'var(--fg-subtle)', margin: 0 }}>{value || '—'}</p>
                  </div>
                ))}
              </div>

              <button type="button" onClick={() => { setPatientPourConsult(patientTrouve); setModeConsult(true); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-3)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <Stethoscope size={18} />
                {t('Mettre en consultation directement')}
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <button type="button" disabled={loading}
                  onClick={async () => {
                    try { setLoading(true); const res = await phpPatientAPI.genererBon(patientTrouve.id, { serviceDestination: form.serviceDestination, motifVisite: form.motifVisite }); onSuccess(patientTrouve, res.data.data); }
                    catch (err) { setFormError(err.response?.data?.message || t('Erreur bon')); }
                    finally { setLoading(false); }
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', fontSize: 12, background: 'var(--surface)', color: 'var(--brand)', border: '1px solid var(--brand)', borderRadius: 'var(--radius-2)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
                >
                  <FileText size={13} />
                  {loading ? t('Génération...') : t('Nouveau bon seulement')}
                </button>
                <button type="button" onClick={onClose}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', fontSize: 12, background: 'var(--surface)', color: 'var(--fg-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', cursor: 'pointer' }}
                >
                  <X size={13} />
                  {t('Fermer')}
                </button>
              </div>
            </div>
          )}

          {/* Bannière nouveau patient */}
          {isNotFound && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--brand-soft)', border: '1px solid var(--brand)', borderRadius: 'var(--radius-2)' }}>
              <UserPlus size={15} style={{ color: 'var(--brand)', flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: 'var(--brand)', margin: 0 }}>
                <strong>{t('Nouveau patient')}</strong> — {t("Ce matricule n'existe pas encore. Remplissez le formulaire ci-dessous.")}
              </p>
            </div>
          )}

          {/* Formulaire nouveau patient */}
          {!isFound && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-2)', color: 'var(--danger)', fontSize: 13 }}>
                  <AlertCircle size={15} /> {formError}
                </div>
              )}

              {/* Identité */}
              <div>
                <p style={sectionTitle}>{t('Identité du patient')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>{t('Nom')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value.toUpperCase() }))} placeholder={t('NOM DE FAMILLE')} required readOnly={readOnly} style={inputStyle(readOnly ? { opacity: 0.7, cursor: 'not-allowed' } : {})} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('Prénom(s)')}</label>
                    <input type="text" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} placeholder={t('Prénom(s)')} readOnly={readOnly} style={inputStyle(readOnly ? { opacity: 0.7, cursor: 'not-allowed' } : {})} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('Genre')}</label>
                    <select value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))} disabled={readOnly} style={inputStyle(readOnly ? { opacity: 0.7, cursor: 'not-allowed' } : {})}>
                      <option value="">{t('-- Sélectionner --')}</option>
                      <option value="M">{t('Masculin')}</option>
                      <option value="F">{t('Féminin')}</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('Date de naissance')}</label>
                    <input type="date" value={form.dateNaissance} onChange={e => setForm(f => ({ ...f, dateNaissance: e.target.value }))} readOnly={readOnly} style={inputStyle(readOnly ? { opacity: 0.7, cursor: 'not-allowed' } : {})} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('Téléphone')}</label>
                    <input type="tel" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder={t('Ex: 6XXXXXXXX')} readOnly={readOnly} style={inputStyle(readOnly ? { opacity: 0.7, cursor: 'not-allowed' } : {})} />
                  </div>
                </div>
              </div>

              {/* Affectation */}
              <div>
                <p style={sectionTitle}>{t('Affectation (secteur → infirmerie auto)')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>{t('Secteur de travail')}</label>
                    <select value={form.secteurId} onChange={e => handleSecteurChange(e.target.value)} disabled={readOnly} style={inputStyle(readOnly ? { opacity: 0.7, cursor: 'not-allowed' } : {})}>
                      <option value="">{t('-- Sélectionner un secteur --')}</option>
                      {secteurs.map(s => (
                        <option key={s.id} value={s.id}>{s.nom} {s.infirmerie ? `(${s.infirmerie.nom})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('Infirmerie (auto-mappée)')}</label>
                    <div style={{ ...inputStyle(infirmerieMapped ? { border: '1.5px solid var(--success)', background: 'var(--success-soft)', opacity: 1 } : { opacity: 0.6 }), display: 'flex', alignItems: 'center' }}>
                      {infirmerieMapped ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontSize: 13 }}>
                          <CheckCircle size={13} /> {infirmerieMapped.nom}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--fg-subtle)', fontSize: 12 }}>{t("Sélectionner un secteur d'abord")}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bon de prise en charge */}
              <div style={{ border: '1px solid var(--brand)', background: 'var(--brand-soft)', borderRadius: 'var(--radius-3)', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <FileText size={15} style={{ color: 'var(--brand)' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)', margin: 0 }}>{t('Bon de prise en charge')}</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12 }}>
                  <input type="checkbox" checked={form.genererBon} onChange={e => setForm(f => ({ ...f, genererBon: e.target.checked }))} style={{ width: 16, height: 16 }} />
                  <span style={{ fontSize: 13, color: 'var(--brand)' }}>{t('Générer automatiquement un bon de prise en charge')}</span>
                </label>
                {form.genererBon && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>{t('Service de destination')}</label>
                      <select value={form.serviceDestination} onChange={e => setForm(f => ({ ...f, serviceDestination: e.target.value }))} style={inputStyle()}>
                        <option value="Consultation Médicale">{t('Consultation Médicale')}</option>
                        {servicesMed.map(s => <option key={s.code||s.nom} value={s.nom}>{s.nom}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>{t('Motif de visite')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="text" value={form.motifVisite} onChange={e => setForm(f => ({ ...f, motifVisite: e.target.value }))} placeholder={t('Ex: Fièvre, douleur...')} required style={inputStyle()} />
                    </div>
                  </div>
                )}
              </div>

              {/* Boutons */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button type="button" onClick={onClose}
                  style={{ flex: 1, padding: '8px 16px', fontSize: 13, border: '1px solid var(--border)', color: 'var(--fg)', background: 'var(--surface-2)', borderRadius: 'var(--radius-2)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
                >
                  {t('Annuler')}
                </button>
                <button type="submit" disabled={loading || searchStatus !== 'not_found'}
                  onClick={e => handleSubmit(e, false)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 16px', fontSize: 13, border: '1px solid var(--brand)', color: 'var(--brand)', background: 'transparent', borderRadius: 'var(--radius-2)', cursor: (loading || searchStatus !== 'not_found') ? 'not-allowed' : 'pointer', opacity: (loading || searchStatus !== 'not_found') ? 0.4 : 1, fontWeight: 500 }}
                >
                  {loading ? <Loader size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  {t('Enregistrer')}
                </button>
                <button type="button" disabled={loading || searchStatus !== 'not_found'}
                  onClick={e => handleSubmit(e, true)}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 16px', fontSize: 13, background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-2)', cursor: (loading || searchStatus !== 'not_found') ? 'not-allowed' : 'pointer', opacity: (loading || searchStatus !== 'not_found') ? 0.4 : 1, fontWeight: 600 }}
                  onMouseEnter={e => { if (!loading && searchStatus === 'not_found') e.currentTarget.style.background = 'var(--brand-active)'; }}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
                >
                  {loading ? <Loader size={14} className="animate-spin" /> : <Stethoscope size={14} />}
                  {t('Enregistrer & Consulter')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
