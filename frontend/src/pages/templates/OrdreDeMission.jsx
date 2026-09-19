import { useEffect, useState } from 'react';
import { documentsAPI, postesAPI, servicesAPI, missionMealAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';
import PersonAutocomplete from '../../components/PersonAutocomplete';

// Aperçu (lecture seule) des indemnités de repas calculées pour le missionnaire et
// le conducteur — sert de référence à la comptable pour la pièce de caisse.
function MissionMealsPreview({ formData }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ready = formData.heure_depart && formData.heure_retour && (formData.missionnaire_id || formData.conducteur_id);
    if (!ready) { setResult(null); return undefined; }
    setLoading(true);
    const t = setTimeout(() => {
      missionMealAPI.calculate({
        missionnaireId: formData.missionnaire_id, missionnaireSource: formData.missionnaire_source,
        conducteurId: formData.conducteur_id, conducteurSource: formData.conducteur_source,
        heureDepart: formData.heure_depart, heureRetour: formData.heure_retour,
        dateDepart: formData.date_depart, dateRetour: formData.date_retour,
      }).then(r => setResult(r.data.data)).catch(() => setResult(null)).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [formData.missionnaire_id, formData.conducteur_id, formData.heure_depart, formData.heure_retour, formData.date_depart, formData.date_retour]);

  if (!formData.heure_depart || !formData.heure_retour) return null;

  const Row = ({ label, data }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
      <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
      {!data || data.categorieInconnue ? (
        <span style={{ color: 'var(--fg-subtle)' }}>Catégorie inconnue — pas de calcul</span>
      ) : (
        <span style={{ color: 'var(--fg)' }}>
          {data.petitDejeuner && 'Petit-déj '}{data.dejeuner && 'Déjeuner '}{data.diner && 'Dîner '}
          {!data.petitDejeuner && !data.dejeuner && !data.diner && '—'}
          {' · '}<strong>{Number(data.total).toLocaleString('fr-FR')} FCFA</strong>
        </span>
      )}
    </div>
  );

  return (
    <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 'var(--radius-2)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 4 }}>
        Indemnités estimées (référence pour la pièce de caisse)
      </div>
      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Calcul…</div>
      ) : !result ? (
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Sélectionnez le missionnaire et/ou le conducteur pour voir le calcul.</div>
      ) : (
        <>
          <Row label="Missionnaire" data={result.missionnaire} />
          <Row label="Conducteur" data={result.conducteur} />
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
            <span>Total</span><span>{Number(result.total).toLocaleString('fr-FR')} FCFA</span>
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
  const [missionServiceId, setMissionServiceId] = useState(null);
  const [chauffeursServiceId, setChauffeursServiceId] = useState(null);

  const zones = VALIDATION_ZONES[formData.type_mission] || VALIDATION_ZONES.paramedical;

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
        const match = types.find(t => t.code === formData.type_mission);
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
          Remplir les informations
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>📅 Date de Départ *</label>
            <input type="date" name="date_depart" value={formData.date_depart || ''} onChange={handleChange} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>📅 Date de Retour *</label>
            <input type="date" name="date_retour" value={formData.date_retour || ''} onChange={handleChange} min={formData.date_depart || ''} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>🕐 Heure de Départ *</label>
            <input type="time" name="heure_depart" value={formData.heure_depart || ''} onChange={handleChange} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>🕐 Heure de Retour *</label>
            <input type="time" name="heure_retour" value={formData.heure_retour || ''} onChange={handleChange} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>🏢 Service Demandeur *</label>
            <input type="text" name="service_demandeur" value={formData.service_demandeur || ''} onChange={handleChange} placeholder="Ex: Direction" style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>📋 Numéro d'Ordre</label>
            <input type="text" name="numero_ordre" value={formData.numero_ordre || 'Génération en cours...'} readOnly style={{ ...inputStyle, background: 'var(--surface-2)', color: 'var(--fg-muted)', cursor: 'not-allowed' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>📝 Objet de la Mission *</label>
            <textarea name="objet_mission" value={formData.objet_mission || ''} onChange={handleChange} placeholder="Décrivez l'objet de la mission..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} required />
          </div>
          <div>
            <label style={labelStyle}>👤 Nom du Missionnaire *</label>
            <PersonAutocomplete
              value={formData.nom_missionnaire || ''}
              serviceId={missionServiceId}
              placeholder="Rechercher un nom..."
              required
              onSelect={(c) => setFormData(prev => ({
                ...prev, nom_missionnaire: c.label, missionnaire_id: c.id, missionnaire_source: c.source,
              }))}
            />
          </div>
          <div>
            <label style={labelStyle}>🚗 Nom du Conducteur *</label>
            <PersonAutocomplete
              value={formData.nom_conducteur || ''}
              serviceId={chauffeursServiceId}
              placeholder="Rechercher un nom..."
              required
              onSelect={(c) => setFormData(prev => ({
                ...prev, nom_conducteur: c.label, conducteur_id: c.id, conducteur_source: c.source,
              }))}
            />
          </div>
          <div>
            <label style={labelStyle}>🚙 Immatriculation du Véhicule *</label>
            <input type="text" name="immat_vehicule" value={formData.immat_vehicule || ''} onChange={handleChange} placeholder="Ex: AB-123-CD" style={inputStyle} required />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" name="frais_mission" checked={formData.frais_mission || false} onChange={handleChange} style={{ width: 18, height: 18 }} />
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', cursor: 'pointer' }}>
              💰 Ouvre droit aux frais de mission (OUI) / Imputation budgétaire
            </label>
          </div>
        </div>
        {formData.frais_mission && <MissionMealsPreview formData={formData} />}
      </div>

      {/* Prévisualisation PDF */}
      <div ref={pdfContainerRef} style={{ background: '#ffffff', padding: 32, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', width: '210mm', minHeight: '297mm' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #1f2937' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img src="/logo-hopital.png" alt="Logo" style={{ width: 64, height: 64, objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Office de Malte</p>
              <p style={{ fontSize: 10, margin: '2px 0 0' }}>Hôpital Saint Jean de Malte</p>
              <p style={{ fontSize: 10, margin: '2px 0 0' }}>BP 15 Njombé - Littoral - Cameroun</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', margin: 0 }}>Ordre de Mission</h1>
            <p style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>Hôpital Saint Jean de Malte</p>
            {formData.numero_ordre && <p style={{ fontSize: 10, fontWeight: 600, marginTop: 8 }}>N° {formData.numero_ordre}</p>}
          </div>
        </div>

        {/* Grille principale */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ border: '2px solid #1f2937', padding: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>📅 Date de Départ (A)</p>
              <p style={{ fontSize: 13, fontWeight: 600, borderBottom: '2px dotted #9ca3af', paddingBottom: 4, minHeight: 24 }}>
                {formData.date_depart ? new Date(formData.date_depart).toLocaleDateString('fr-FR') : '___/___/_____'}
              </p>
            </div>
            <div style={{ border: '2px solid #1f2937', padding: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>📅 Date de Retour (R)</p>
              <p style={{ fontSize: 13, fontWeight: 600, borderBottom: '2px dotted #9ca3af', paddingBottom: 4, minHeight: 24 }}>
                {formData.date_retour ? new Date(formData.date_retour).toLocaleDateString('fr-FR') : '___/___/_____'}
              </p>
            </div>
            <div style={{ border: '2px solid #1f2937', padding: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>🏢 Service Demandeur</p>
              <p style={{ fontSize: 13, fontWeight: 600, borderBottom: '2px dotted #9ca3af', paddingBottom: 4, minHeight: 24 }}>
                {formData.service_demandeur || '_____________________'}
              </p>
            </div>
            <div style={{ border: '2px solid #1f2937', padding: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>👤 Nom du Missionnaire</p>
              <p style={{ fontSize: 13, fontWeight: 600, borderBottom: '2px dotted #9ca3af', paddingBottom: 4, minHeight: 24 }}>
                {formData.nom_missionnaire || '_____________________'}
              </p>
            </div>
          </div>
          <div style={{ border: '2px solid #1f2937', padding: 12, marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>📝 Objet de la Mission</p>
            <div style={{ minHeight: 60, fontSize: 13, borderBottom: '2px dotted #9ca3af', paddingBottom: 8 }}>
              {formData.objet_mission || '__________________________________________'}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ border: '2px solid #1f2937', padding: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>🚗 Nom du Conducteur</p>
              <p style={{ fontSize: 13, fontWeight: 600, borderBottom: '2px dotted #9ca3af', paddingBottom: 4, minHeight: 24 }}>
                {formData.nom_conducteur || '_____________________'}
              </p>
            </div>
            <div style={{ border: '2px solid #1f2937', padding: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>🚙 Immatriculation du Véhicule</p>
              <p style={{ fontSize: 13, fontWeight: 600, borderBottom: '2px dotted #9ca3af', paddingBottom: 4, minHeight: 24 }}>
                {formData.immat_vehicule || '_____________________'}
              </p>
            </div>
          </div>
          <div style={{ border: '2px solid #1f2937', padding: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>
              💰 Ouvre droit aux frais de mission (OUI) / Imputation budgétaire
            </p>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{formData.frais_mission ? 'OUI' : 'NON'}</p>
          </div>
        </div>

        {/* Tableau récapitulatif */}
        <div style={{ marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #1f2937', fontSize: 10 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ border: '1px solid #1f2937', padding: 8, fontWeight: 700 }}>DATE (A/R)</th>
                <th style={{ border: '1px solid #1f2937', padding: 8, fontWeight: 700 }}>OBJET DE LA MISSION<br/>SERVICE DEMANDEUR</th>
                <th style={{ border: '1px solid #1f2937', padding: 8, fontWeight: 700 }}>NOM DU<br/>CONDUCTEUR</th>
                <th style={{ border: '1px solid #1f2937', padding: 8, fontWeight: 700 }}>NOM DU<br/>MISSIONNAIRE</th>
                <th style={{ border: '1px solid #1f2937', padding: 8, fontWeight: 700 }}>IMMAT. DU<br/>VÉHICULE</th>
                <th style={{ border: '1px solid #1f2937', padding: 8, fontWeight: 700 }}>MISSION (OUI OU NON) /<br/>IMPUTATION BUDGÉTAIRE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #1f2937', padding: 8, textAlign: 'center', verticalAlign: 'top' }}>
                  {formData.date_depart && formData.date_retour ? (
                    <>
                      <div style={{ fontWeight: 600 }}>A: {new Date(formData.date_depart).toLocaleDateString('fr-FR')}</div>
                      <div style={{ fontWeight: 600, marginTop: 4 }}>R: {new Date(formData.date_retour).toLocaleDateString('fr-FR')}</div>
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
                  {formData.frais_mission ? 'OUI' : 'NON'}
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
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${zones.length}, 1fr)`, gap: 16, marginTop: 32 }}>
          {zones.map((label, i) => (
            <SignatureFrame
              key={label}
              label={label}
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
