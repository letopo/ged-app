import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { documentsAPI, postesAPI, servicesAPI, missionMealAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';
import PersonAutocomplete from '../../components/PersonAutocomplete';
import { getMissionnaires } from '../../utils/omMissionnaires';
import { useFeatureNote } from '../../components/ReleaseNotes';

// Aperçu (lecture seule) des indemnités de repas calculées pour le missionnaire et
// le conducteur — sert de référence à la comptable pour la pièce de caisse.
function MissionMealsPreview({ formData }) {
  const { t } = useTranslation();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const missionnaires = getMissionnaires(formData).map(({ nom, id, source }) => ({ nom, id, source }));
  const missionnairesKey = JSON.stringify(missionnaires);

  useEffect(() => {
    const ready = formData.heure_depart && formData.heure_retour && (missionnaires.length || formData.conducteur_id);
    if (!ready) { setResult(null); return undefined; }
    setLoading(true);
    const timer = setTimeout(() => {
      missionMealAPI.calculate({
        missionnaires,
        conducteurId: formData.conducteur_id, conducteurSource: formData.conducteur_source,
        heureDepart: formData.heure_depart, heureRetour: formData.heure_retour,
        dateDepart: formData.date_depart, dateRetour: formData.date_retour,
      }).then(r => setResult(r.data.data)).catch(() => setResult(null)).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [missionnairesKey, formData.conducteur_id, formData.heure_depart, formData.heure_retour, formData.date_depart, formData.date_retour]);

  if (!formData.heure_depart || !formData.heure_retour) return null;

  const Row = ({ label, data }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
      <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
      {!data || data.categorieInconnue ? (
        <span style={{ color: 'var(--fg-subtle)' }}>{t('Catégorie inconnue — pas de calcul')}</span>
      ) : (
        <span style={{ color: 'var(--fg)' }}>
          {data.petitDejeuner && t('Petit-déj ')}{data.dejeuner && t('Déjeuner ')}{data.diner && t('Dîner ')}
          {!data.petitDejeuner && !data.dejeuner && !data.diner && '—'}
          {' · '}<strong>{Number(data.total).toLocaleString('fr-FR')} FCFA</strong>
        </span>
      )}
    </div>
  );

  return (
    <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 'var(--radius-2)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 4 }}>
        {t('Indemnités estimées (référence pour la pièce de caisse)')}
      </div>
      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('Calcul…')}</div>
      ) : !result ? (
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('Sélectionnez le missionnaire et/ou le conducteur pour voir le calcul.')}</div>
      ) : (
        <>
          {(result.missionnaires || [result.missionnaire]).map((m, i) => (
            <Row key={i} label={m?.nom ? t('Missionnaire — {{nom}}', { nom: m.nom }) : t('Missionnaire')} data={m} />
          ))}
          <Row label={t('Conducteur')} data={result.conducteur} />
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
            <span>{t('Total')}</span><span>{Number(result.total).toLocaleString('fr-FR')} FCFA</span>
          </div>
        </>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-2)',
  border: '1.5px solid var(--border)', background: 'var(--surface)',
  color: 'var(--fg)', fontSize: 13, outline: 'none',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 4 };

// Espaces de validation (signature) du PDF selon le type d'ordre de mission.
// La 1re zone (Service Demandeur) est en général toujours présente ; suivent
// les postes du circuit puis le Directeur Général. Doit rester cohérent avec
// ordre_mission_types.
// Exception RO SAU : la cheffe de pôle RO SAU est elle-même toujours la
// personne qui soumet ces OM, donc la zone "Service Demandeur" (qui ne
// ferait que redupliquer sa propre signature) est supprimée — il ne reste
// que ses deux vrais signataires (elle-même comme chef de pôle, puis le DG).
const VALIDATION_ZONES = {
  paramedical:   ['Service Demandeur', 'D.D.S', 'D.S', 'Directeur Général'],
  administratif: ['Service Demandeur', 'Chef de pôle', 'Directeur Général'],
  strategie:     ['Service Demandeur', 'Médecin Chef', 'Directeur Général'],
  ro_sau:        ['Chef de pôle RO SAU', 'Directeur Général'],
};

const OrdreDeMission = ({ formData, setFormData, pdfContainerRef }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  useFeatureNote('ordre-de-mission');
  const [missionServiceId, setMissionServiceId] = useState(null);
  const [chauffeursServiceId, setChauffeursServiceId] = useState(null);

  const zones = VALIDATION_ZONES[formData.type_mission] || VALIDATION_ZONES.paramedical;
  // 4 signataires : cadres sur 2 lignes de 2 (cachets à taille réelle) et mise
  // en page resserrée pour que l'OM tienne toujours sur une page A4
  const compact = zones.length === 4;

  useEffect(() => {
    if (formData.numero_ordre) return;
    documentsAPI.getNextNumero('Ordre de mission')
      .then(res => setFormData(prev => ({ ...prev, numero_ordre: res.data.numero })))
      .catch(err => console.error('Erreur récupération numéro OM:', err));
  }, []);

  // Pôle lié au type d'OM choisi (ex: RO SAU) — restreint la liste de missionnaires proposée.
  useEffect(() => {
    postesAPI.getOrdreMissionTypes()
      .then(res => {
        const types = res.data?.data || [];
        const match = types.find(om => om.code === formData.type_mission);
        setMissionServiceId(match?.serviceId || null);
      })
      .catch(() => setMissionServiceId(null));
  }, [formData.type_mission]);

  // Pôle "Chauffeurs" — restreint la liste de conducteurs proposée, quel que soit le type d'OM.
  useEffect(() => {
    servicesAPI.getAll()
      .then(res => {
        const list = res.data?.data || res.data || [];
        const chauffeurs = list.find(s => (s.name || '').trim().toLowerCase() === 'chauffeurs');
        setChauffeursServiceId(chauffeurs?.id || null);
      })
      .catch(() => setChauffeursServiceId(null));
  }, []);

  // Aligne le nombre de signataires (placement des signatures à la validation)
  // sur le nombre d'espaces de validation du type choisi.
  useEffect(() => {
    setFormData(prev => prev.nbSignataires === zones.length ? prev : { ...prev, nbSignataires: zones.length });
  }, [formData.type_mission]);

  // Missionnaires saisis (au moins une ligne). nom_missionnaire / missionnaire_id
  // restent renseignés (liste des noms, 1er missionnaire) pour le titre et le PDF.
  const missionnaireRows = (() => {
    if (Array.isArray(formData.missionnaires) && formData.missionnaires.length) return formData.missionnaires;
    const list = getMissionnaires(formData);
    return list.length ? list : [{ nom: '', id: null, source: null }];
  })();
  const setMissionnaires = (rows) => setFormData(prev => ({
    ...prev,
    missionnaires: rows,
    nom_missionnaire: rows.map(r => (r.nom || '').trim()).filter(Boolean).join(', '),
    missionnaire_id: rows[0]?.id || null,
    missionnaire_source: rows[0]?.source || null,
  }));
  const nbMissionnaires = missionnaireRows.filter(r => (r.nom || '').trim()).length;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Formulaire de saisie */}
      <div className="not-printable" style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-3)', padding: 24, marginBottom: 24,
        boxShadow: 'var(--shadow-1)',
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 16, marginTop: 0 }}>
          {t('Remplir les informations')}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>📅 {t('Date de Départ')} *</label>
            <input type="date" name="date_depart" value={formData.date_depart || ''} onChange={handleChange} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>📅 {t('Date de Retour')} *</label>
            <input type="date" name="date_retour" value={formData.date_retour || ''} onChange={handleChange} min={formData.date_depart || ''} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>🕐 {t('Heure de Départ')} *</label>
            <input type="time" name="heure_depart" value={formData.heure_depart || ''} onChange={handleChange} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>🕐 {t('Heure de Retour')} *</label>
            <input type="time" name="heure_retour" value={formData.heure_retour || ''} onChange={handleChange} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>🏢 {t('Service Demandeur')} *</label>
            <input type="text" name="service_demandeur" value={formData.service_demandeur || ''} onChange={handleChange} placeholder={t('Ex: Direction')} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>📋 {t("Numéro d'Ordre")}</label>
            <input type="text" name="numero_ordre" value={formData.numero_ordre || t('Génération en cours...')} readOnly style={{ ...inputStyle, background: 'var(--surface-2)', color: 'var(--fg-muted)', cursor: 'not-allowed' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>📝 {t('Objet de la Mission')} *</label>
            <textarea name="objet_mission" value={formData.objet_mission || ''} onChange={handleChange} placeholder={t("Décrivez l'objet de la mission...")} rows={3} style={{ ...inputStyle, resize: 'vertical' }} required />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>👤 {t('Missionnaire(s)')} *</label>
            {missionnaireRows.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <PersonAutocomplete
                    value={m.nom || ''}
                    serviceId={missionServiceId}
                    placeholder={t('Rechercher un nom...')}
                    required={i === 0}
                    onSelect={(c) => setMissionnaires(missionnaireRows.map((x, j) => (j === i ? { nom: c.label, id: c.id, source: c.source } : x)))}
                  />
                </div>
                {missionnaireRows.length > 1 && (
                  <button type="button" onClick={() => setMissionnaires(missionnaireRows.filter((_, j) => j !== i))}
                    title={t('Retirer ce missionnaire')}
                    style={{ padding: '0 10px', borderRadius: 'var(--radius-2)', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--fg-muted)', cursor: 'pointer' }}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setMissionnaires([...missionnaireRows, { nom: '', id: null, source: null }])}
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent, #2563eb)', background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer' }}>
              + {t('Ajouter un missionnaire')}
            </button>
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>
              {t('Une personne par ligne : la comptable fera une pièce de caisse pour chacune.')}
            </div>
          </div>
          <div>
            <label style={labelStyle}>🚗 {t('Nom du Conducteur')} *</label>
            <PersonAutocomplete
              value={formData.nom_conducteur || ''}
              serviceId={chauffeursServiceId}
              placeholder={t('Rechercher un nom...')}
              required
              onSelect={(c) => setFormData(prev => ({
                ...prev, nom_conducteur: c.label, conducteur_id: c.id, conducteur_source: c.source,
              }))}
            />
          </div>
          <div>
            <label style={labelStyle}>🚙 {t('Immatriculation du Véhicule')} *</label>
            <input type="text" name="immat_vehicule" value={formData.immat_vehicule || ''} onChange={handleChange} placeholder={t('Ex: AB-123-CD')} style={inputStyle} required />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" name="frais_mission" checked={formData.frais_mission || false} onChange={handleChange} style={{ width: 18, height: 18 }} />
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', cursor: 'pointer' }}>
              💰 {t('Ouvre droit aux frais de mission (OUI) / Imputation budgétaire')}
            </label>
          </div>
        </div>
        {formData.frais_mission && <MissionMealsPreview formData={formData} />}
      </div>

      {/* Prévisualisation PDF */}
      <div ref={pdfContainerRef} style={{ background: '#ffffff', padding: compact ? '24px 32px' : 32, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', width: '210mm', minHeight: '297mm' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: compact ? 16 : 24, paddingBottom: compact ? 12 : 16, borderBottom: '2px solid #1f2937' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img src="/logo-hopital.png" alt="Logo" style={{ width: 64, height: 64, objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>{t('Office de Malte')}</p>
              <p style={{ fontSize: 10, margin: '2px 0 0' }}>{t('Hôpital Saint Jean de Malte')}</p>
              <p style={{ fontSize: 10, margin: '2px 0 0' }}>{t('BP 15 Njombé - Littoral - Cameroun')}</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', margin: 0 }}>{t('Ordre de Mission')}</h1>
            <p style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>{t('Hôpital Saint Jean de Malte')}</p>
            {formData.numero_ordre && <p style={{ fontSize: 10, fontWeight: 600, marginTop: 8 }}>{t('N° {{num}}', { num: formData.numero_ordre })}</p>}
          </div>
        </div>

        {/* Grille principale */}
        <div style={{ marginBottom: compact ? 16 : 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ border: '2px solid #1f2937', padding: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>📅 {t('Date de Départ (A)')}</p>
              <p style={{ fontSize: 13, fontWeight: 600, borderBottom: '2px dotted #9ca3af', paddingBottom: 4, minHeight: 24 }}>
                {formData.date_depart ? new Date(formData.date_depart).toLocaleDateString('fr-FR') : '___/___/_____'}
                {formData.heure_depart && ` à ${formData.heure_depart}`}
              </p>
            </div>
            <div style={{ border: '2px solid #1f2937', padding: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>📅 {t('Date de Retour (R)')}</p>
              <p style={{ fontSize: 13, fontWeight: 600, borderBottom: '2px dotted #9ca3af', paddingBottom: 4, minHeight: 24 }}>
                {formData.date_retour ? new Date(formData.date_retour).toLocaleDateString('fr-FR') : '___/___/_____'}
                {formData.heure_retour && ` à ${formData.heure_retour}`}
              </p>
            </div>
            <div style={{ border: '2px solid #1f2937', padding: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>🏢 {t('Service Demandeur')}</p>
              <p style={{ fontSize: 13, fontWeight: 600, borderBottom: '2px dotted #9ca3af', paddingBottom: 4, minHeight: 24 }}>
                {formData.service_demandeur || '_____________________'}
              </p>
            </div>
            <div style={{ border: '2px solid #1f2937', padding: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>👤 {nbMissionnaires > 1 ? t('Noms des Missionnaires') : t('Nom du Missionnaire')}</p>
              <p style={{ fontSize: 13, fontWeight: 600, borderBottom: '2px dotted #9ca3af', paddingBottom: 4, minHeight: 24 }}>
                {formData.nom_missionnaire || '_____________________'}
              </p>
            </div>
          </div>
          <div style={{ border: '2px solid #1f2937', padding: 12, marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>📝 {t('Objet de la Mission')}</p>
            <div style={{ minHeight: 60, fontSize: 13, borderBottom: '2px dotted #9ca3af', paddingBottom: 8 }}>
              {formData.objet_mission || '__________________________________________'}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ border: '2px solid #1f2937', padding: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>🚗 {t('Nom du Conducteur')}</p>
              <p style={{ fontSize: 13, fontWeight: 600, borderBottom: '2px dotted #9ca3af', paddingBottom: 4, minHeight: 24 }}>
                {formData.nom_conducteur || '_____________________'}
              </p>
            </div>
            <div style={{ border: '2px solid #1f2937', padding: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>🚙 {t('Immatriculation du Véhicule')}</p>
              <p style={{ fontSize: 13, fontWeight: 600, borderBottom: '2px dotted #9ca3af', paddingBottom: 4, minHeight: 24 }}>
                {formData.immat_vehicule || '_____________________'}
              </p>
            </div>
          </div>
          <div style={{ border: '2px solid #1f2937', padding: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>
              💰 {t('Ouvre droit aux frais de mission (OUI) / Imputation budgétaire')}
            </p>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{formData.frais_mission ? t('OUI') : t('NON')}</p>
          </div>
        </div>

        {/* Tableau récapitulatif */}
        <div style={{ marginBottom: compact ? 12 : 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #1f2937', fontSize: 10 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ border: '1px solid #1f2937', padding: 8, fontWeight: 700 }}>{t('DATE (A/R)')}</th>
                <th style={{ border: '1px solid #1f2937', padding: 8, fontWeight: 700 }}>{t('OBJET DE LA MISSION')}<br/>{t('SERVICE DEMANDEUR')}</th>
                <th style={{ border: '1px solid #1f2937', padding: 8, fontWeight: 700 }}>{t('NOM DU')}<br/>{t('CONDUCTEUR')}</th>
                <th style={{ border: '1px solid #1f2937', padding: 8, fontWeight: 700 }}>{t('NOM DU')}<br/>{t('MISSIONNAIRE')}</th>
                <th style={{ border: '1px solid #1f2937', padding: 8, fontWeight: 700 }}>{t('IMMAT. DU')}<br/>{t('VÉHICULE')}</th>
                <th style={{ border: '1px solid #1f2937', padding: 8, fontWeight: 700 }}>{t('MISSION (OUI OU NON) /')}<br/>{t('IMPUTATION BUDGÉTAIRE')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #1f2937', padding: 8, textAlign: 'center', verticalAlign: 'top' }}>
                  {formData.date_depart && formData.date_retour ? (
                    <>
                      <div style={{ fontWeight: 600 }}>
                        {t('A: {{date}}', { date: new Date(formData.date_depart).toLocaleDateString('fr-FR') })}
                        {formData.heure_depart && ` ${formData.heure_depart}`}
                      </div>
                      <div style={{ fontWeight: 600, marginTop: 4 }}>
                        {t('R: {{date}}', { date: new Date(formData.date_retour).toLocaleDateString('fr-FR') })}
                        {formData.heure_retour && ` ${formData.heure_retour}`}
                      </div>
                    </>
                  ) : <div style={{ color: '#9ca3af' }}>___/___/_____</div>}
                </td>
                <td style={{ border: '1px solid #1f2937', padding: 8, verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 600 }}>{formData.objet_mission || ''}</div>
                  <div style={{ fontSize: 9, color: '#6b7280', marginTop: 4 }}>{formData.service_demandeur || ''}</div>
                </td>
                <td style={{ border: '1px solid #1f2937', padding: 8, textAlign: 'center', verticalAlign: 'top' }}>{formData.nom_conducteur || ''}</td>
                <td style={{ border: '1px solid #1f2937', padding: 8, textAlign: 'center', verticalAlign: 'top' }}>{formData.nom_missionnaire || ''}</td>
                <td style={{ border: '1px solid #1f2937', padding: 8, textAlign: 'center', verticalAlign: 'top' }}>{formData.immat_vehicule || ''}</td>
                <td style={{ border: '1px solid #1f2937', padding: 8, textAlign: 'center', verticalAlign: 'top', fontWeight: 600 }}>
                  {formData.frais_mission ? t('OUI') : t('NON')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures — espaces de validation dynamiques selon le type d'OM.
            Seule la zone "Service Demandeur" est pré-remplie avec la signature
            du soumetteur ; les autres zones (dont "Chef de pôle RO SAU" pour le
            type RO SAU) restent vides et sont signées via le vrai circuit de
            validation (Mes tâches), même si le titulaire est la même personne. */}
        {/* 4 signataires (paramédical) : 2 lignes de 2 — un cachet à taille réelle
            (58 mm) déborderait d'un cadre au quart de la largeur de la page.
            Ordre des cadres (= ordre de signature) : de gauche à droite, puis ligne suivante. */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${compact ? 2 : zones.length}, 1fr)`, gap: compact ? '10px 48px' : 16, marginTop: compact ? 12 : 32 }}>
          {zones.map((label, i) => (
            <SignatureFrame fixedLabel
              height={compact ? '88px' : undefined}
              showFooter={!compact}
              key={label}
              label={t(label)}
              signatureUrl={label === 'Service Demandeur' ? getImageUrl(user?.signaturePath) : null}
              stampUrl={label === 'Service Demandeur' ? getImageUrl(user?.stampPath) : null}
              zoneIndex={i + 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrdreDeMission;
