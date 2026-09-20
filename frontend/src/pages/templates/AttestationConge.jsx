// frontend/src/pages/templates/AttestationConge.jsx
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';
import logo from '../../assets/logo-ordre-malte.png';

const inputStyle = {
  width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-2)',
  border: '1.5px solid var(--border)', background: 'var(--surface)',
  color: 'var(--fg)', fontSize: 13, outline: 'none',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 4 };

const AttestationConge = ({ formData, setFormData, pdfContainerRef }) => {
  const { user } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '___/___/_____';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const computeReprise = () => {
    if (formData.date_reprise) return formData.date_reprise;
    if (formData.date_fin) {
      const d = new Date(formData.date_fin);
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    }
    return '';
  };

  const dateReprise = computeReprise();

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Formulaire de saisie */}
      <div className="not-printable" style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-3)', padding: 24, marginBottom: 24,
        boxShadow: 'var(--shadow-1)',
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 16, marginTop: 0 }}>Remplir les informations</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>👤 Civilité *</label>
            <select name="civilite" value={formData.civilite || 'Monsieur'} onChange={handleChange} style={inputStyle}>
              <option value="Monsieur">Monsieur</option>
              <option value="Madame">Madame</option>
              <option value="Mademoiselle">Mademoiselle</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>📋 Nom et Prénom *</label>
            <input type="text" name="nom_prenom" value={formData.nom_prenom || ''} onChange={handleChange} placeholder="Ex: TCHAKOUNTE Collince" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>💼 Fonction *</label>
            <input type="text" name="fonction" value={formData.fonction || ''} onChange={handleChange} placeholder="Ex: Médecin Gynécologue-obstétricien" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>🏢 Service *</label>
            <input type="text" name="service" value={formData.service || ''} onChange={handleChange} placeholder="Ex: Gynécologie-obstétrique" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>🔢 Matricule *</label>
            <input type="text" name="matricule" value={formData.matricule || ''} onChange={handleChange} placeholder="Ex: 110345" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>📅 Nombre de jours de congé *</label>
            <input type="number" name="nb_jours" value={formData.nb_jours || ''} onChange={handleChange} min="1" placeholder="Ex: 30" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>📅 Date de début de congé *</label>
            <input type="date" name="date_debut" value={formData.date_debut || ''} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>📅 Date de fin de congé *</label>
            <input type="date" name="date_fin" value={formData.date_fin || ''} onChange={handleChange} min={formData.date_debut || ''} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>
              📅 Date de reprise de service
              <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--fg-subtle)', marginLeft: 4 }}>(calculée automatiquement)</span>
            </label>
            <input type="date" name="date_reprise" value={formData.date_reprise || dateReprise} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>📋 Date de l'attestation *</label>
            <input type="date" name="date_document" value={formData.date_document || ''} onChange={handleChange} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Aperçu PDF */}
      <div ref={pdfContainerRef} style={{ background: '#ffffff', position: 'relative', width: '210mm', minHeight: '297mm', padding: '18mm 18mm 20mm 18mm', boxSizing: 'border-box' }}>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, paddingBottom: 12, borderBottom: '1px solid #d1d5db' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={logo} alt="Logo Ordre de Malte" style={{ height: 80, objectFit: 'contain' }} />
          </div>
        </div>

        {/* Titre */}
        <div style={{ textAlign: 'center', marginBottom: 40, marginTop: 16 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Attestation</h1>
          <h2 style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '4px 0 0' }}>de Départ en Congé Annuel</h2>
        </div>

        {/* Corps */}
        <div style={{ fontSize: '12.5px', lineHeight: 1.8 }}>
          <p><strong>{formData.civilite || 'Monsieur'} : {formData.nom_prenom || '___________________________'}</strong></p>
          <p>Fonction : {formData.fonction || '___________________________'}</p>
          <div style={{ display: 'flex', gap: 64 }}>
            <p>Service : {formData.service || '___________________________'}</p>
            <p>Matricule : {formData.matricule || '_________'}</p>
          </div>
          <p style={{ marginTop: 24 }}>
            L'intéressé(e) est bénéficiaire d'un congé annuel de{' '}
            <strong>{formData.nb_jours || '___'} jours</strong>{' '}
            qui prend effet à compter du{' '}
            <strong>{formatDate(formData.date_debut)}</strong>{' '}
            et se termine le{' '}
            <strong>{formatDate(formData.date_fin)}</strong>.
          </p>
          <p style={{ marginTop: 8 }}>
            <strong>Il reprendra donc son service le {formatDate(formData.date_reprise || dateReprise)} à l'heure habituelle.</strong>
          </p>
          <p style={{ marginTop: 24 }}>Fait pour servir et valoir ce que de droit.</p>
        </div>

        {/* Date et signature */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 40, marginRight: 16 }}>
          <p style={{ fontSize: 13, marginBottom: 24 }}>
            Njombé, le {formData.date_document ? formatDate(formData.date_document) : '___/___/_____'}
          </p>
          <div style={{ width: 208 }}>
            <SignatureFrame label="Le Directeur Général" signatureUrl={null} stampUrl={null} zoneIndex={1} />
          </div>
        </div>

        {/* Pied de page */}
        <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, padding: '8px 32px 0', textAlign: 'center', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: 9, color: '#6b7280', margin: '2px 0' }}>Hôpital Saint-Jean de Malte — Tél : 00 (237)6 57 56 91 03 — e-mail : hopital.cameroun@ordredemaltefrance.org</p>
          <p style={{ fontSize: 9, color: '#6b7280', margin: '2px 0' }}>Dépendant des œuvres Hospitalières Françaises de l'ordre de malte, association BP 56 – Njombé-Cameroun reconnue d'utilité publique</p>
          <p style={{ fontSize: 9, color: '#6b7280', margin: '2px 0' }}>en partenariat avec le Ministère de la Santé Publique, et avec les plantations du groupe PHP</p>
        </div>
      </div>
    </div>
  );
};

export default AttestationConge;
