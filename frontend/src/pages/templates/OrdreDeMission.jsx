import { useEffect } from 'react';
import { documentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';

const inputStyle = {
  width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-2)',
  border: '1.5px solid var(--border)', background: 'var(--surface)',
  color: 'var(--fg)', fontSize: 13, outline: 'none',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 4 };

// Espaces de validation (signature) du PDF selon le type d'ordre de mission.
// La 1re zone (Service Demandeur) est toujours présente ; suivent les postes
// du circuit puis le Directeur Général. Doit rester cohérent avec ordre_mission_types.
const VALIDATION_ZONES = {
  paramedical:   ['Service Demandeur', 'D.D.S', 'D.S', 'Directeur Général'],
  administratif: ['Service Demandeur', 'Chef de pôle', 'Directeur Général'],
  strategie:     ['Service Demandeur', 'Médecin Chef', 'Directeur Général'],
};

const OrdreDeMission = ({ formData, setFormData, pdfContainerRef }) => {
  const { user } = useAuth();

  const zones = VALIDATION_ZONES[formData.type_mission] || VALIDATION_ZONES.paramedical;

  useEffect(() => {
    if (formData.numero_ordre) return;
    documentsAPI.getNextNumero('Ordre de mission')
      .then(res => setFormData(prev => ({ ...prev, numero_ordre: res.data.numero })))
      .catch(err => console.error('Erreur récupération numéro OM:', err));
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
            <input type="text" name="nom_missionnaire" value={formData.nom_missionnaire || ''} onChange={handleChange} placeholder="Nom complet" style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>🚗 Nom du Conducteur *</label>
            <input type="text" name="nom_conducteur" value={formData.nom_conducteur || ''} onChange={handleChange} placeholder="Nom complet" style={inputStyle} required />
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

        {/* Signatures — espaces de validation dynamiques selon le type d'OM */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${zones.length}, 1fr)`, gap: 16, marginTop: 32 }}>
          {zones.map((label, i) => (
            <SignatureFrame
              key={label}
              label={label}
              signatureUrl={i === 0 ? getImageUrl(user?.signaturePath) : null}
              stampUrl={i === 0 ? getImageUrl(user?.stampPath) : null}
              zoneIndex={i + 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrdreDeMission;
