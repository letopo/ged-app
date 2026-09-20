// frontend/src/pages/templates/BonDeCommandeInterne.jsx
import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Users } from 'lucide-react';
import logo from '../../assets/logo-ordre-malte.png';
import { usersAPI, servicesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';

const ConditionalSignatureFrame = ({ active, ...props }) => {
  if (!active) return null;
  return <SignatureFrame {...props} />;
};

const BonDeCommandeInterne = ({ formData, setFormData, pdfContainerRef }) => {
  const { user } = useAuth();
  const [services, setServices] = useState([]);

  const demandeurSignatureUrl = getImageUrl(user?.signaturePath);
  const demandeurStampUrl     = getImageUrl(user?.stampPath);
  const nbSignataires = formData.nbSignataires || 3;

  useEffect(() => {
    const init = async () => {
      try {
        const servicesRes = await servicesAPI.getAll();
        setServices(servicesRes.data.data || servicesRes.data || []);
        const userRes = await usersAPI.getMyService();
        if (userRes.data.success && userRes.data.service) {
          setFormData(prev => ({ ...prev, serviceDemandeur: prev.serviceDemandeur || userRes.data.service.name }));
        }
      } catch (err) {
        console.error('Erreur chargement services:', err);
      }
      setFormData(prev => ({
        ...prev,
        date:           prev.date          || new Date().toISOString().split('T')[0],
        nbSignataires:  prev.nbSignataires  || 3,
        lines:          prev.lines         || [{ no: 1, designation: '', quantite: '', observation: '' }],
      }));
    };
    init();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...(formData.lines || [])];
    newLines[index][field] = value;
    setFormData({ ...formData, lines: newLines });
  };

  const addLine = () => {
    const lines = formData.lines || [];
    setFormData({ ...formData, lines: [...lines, { no: lines.length + 1, designation: '', quantite: '', observation: '' }] });
  };

  const removeLine = (index) => {
    const newLines = formData.lines
      .filter((_, i) => i !== index)
      .map((line, i) => ({ ...line, no: i + 1 }));
    setFormData({ ...formData, lines: newLines });
  };

  const lines = formData.lines || [];
  const cellIn = { background: 'none', border: 'none', outline: 'none', width: '100%', fontSize: 13 };

  return (
    <div ref={pdfContainerRef} style={{ background: '#ffffff', padding: 32, margin: '0 auto', fontSize: 13, width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>

      {/* EN-TÊTE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <img src={logo} alt="Logo HSJM" style={{ height: 64, objectFit: 'contain' }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>BON DE COMMANDE INTERNE</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Date du jour :</div>
          <input type="date" name="date" value={formData.date || ''} onChange={handleChange} className="not-printable" style={{ border: '1px solid #ccc', padding: 4, borderRadius: 4, fontSize: 12 }} />
          <span className="print-only" style={{ fontSize: 12 }}>
            {formData.date ? new Date(formData.date).toLocaleDateString('fr-FR') : ''}
          </span>
        </div>
      </div>

      {/* SERVICE DEMANDEUR */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Service Demandeur :</span>
        <select name="serviceDemandeur" value={formData.serviceDemandeur || ''} onChange={handleChange} className="not-printable" style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '4px 8px', fontSize: 12, flex: 1, maxWidth: 280, outline: 'none' }}>
          <option value="">-- Sélectionner un service --</option>
          {services.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          {formData.serviceDemandeur && !services.find(s => s.name === formData.serviceDemandeur) && (
            <option value={formData.serviceDemandeur}>{formData.serviceDemandeur}</option>
          )}
        </select>
        <span className="print-only">{formData.serviceDemandeur}</span>
      </div>

      {/* TABLEAU */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: 16, fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #000', padding: 8, textAlign: 'left', fontWeight: 700, width: 48 }}>No</th>
            <th style={{ border: '1px solid #000', padding: 8, textAlign: 'left', fontWeight: 700 }}>Désignation</th>
            <th style={{ border: '1px solid #000', padding: 8, textAlign: 'left', fontWeight: 700, width: 112 }}>Quantité</th>
            <th style={{ border: '1px solid #000', padding: 8, textAlign: 'left', fontWeight: 700, width: 160 }}>Observation</th>
            <th style={{ border: '1px solid #000', padding: 4, width: 32 }} className="not-printable"></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={index}>
              <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>{line.no}</td>
              <td style={{ border: '1px solid #000', padding: 4 }}>
                <input value={line.designation} onChange={(e) => handleLineChange(index, 'designation', e.target.value)} className="not-printable" style={cellIn} placeholder="Article / fourniture..." />
                <span className="print-only">{line.designation}</span>
              </td>
              <td style={{ border: '1px solid #000', padding: 4 }}>
                <input value={line.quantite} onChange={(e) => handleLineChange(index, 'quantite', e.target.value)} className="not-printable" style={{ ...cellIn, textAlign: 'center' }} placeholder="0" />
                <span className="print-only" style={{ display: 'block', textAlign: 'center' }}>{line.quantite}</span>
              </td>
              <td style={{ border: '1px solid #000', padding: 4 }}>
                <input value={line.observation} onChange={(e) => handleLineChange(index, 'observation', e.target.value)} className="not-printable" style={cellIn} placeholder="..." />
                <span className="print-only">{line.observation}</span>
              </td>
              <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }} className="not-printable">
                {lines.length > 1 && (
                  <button onClick={() => removeLine(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={addLine} className="not-printable" style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontWeight: 600, fontSize: 13 }}>
        <PlusCircle size={16} /> Ajouter une ligne
      </button>

      {/* SÉLECTEUR NOMBRE DE SIGNATAIRES */}
      <div className="not-printable" style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: 12,
        background: 'var(--surface-2)', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)',
      }}>
        <Users size={16} color="var(--fg-muted)" />
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-muted)' }}>Nombre de signataires :</span>
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            onClick={() => setFormData(prev => ({ ...prev, nbSignataires: n }))}
            style={{
              padding: '4px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: nbSignataires === n ? 'var(--brand)' : 'var(--surface)',
              color: nbSignataires === n ? '#fff' : 'var(--fg-muted)',
              border: nbSignataires === n ? '1px solid var(--brand)' : '1px solid var(--border)',
            }}
          >
            {n}
          </button>
        ))}
        <span style={{ fontSize: 11, color: 'var(--fg-subtle)', marginLeft: 4 }}>
          {nbSignataires === 1 ? '(Demandeur uniquement)' : nbSignataires === 2 ? '(Demandeur + Acheteur)' : '(Demandeur + Acheteur + DS)'}
        </span>
      </div>

      {/* ZONES DE SIGNATURE */}
      <div style={{ borderTop: '2px solid #000', paddingTop: 16, marginTop: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${nbSignataires}, 1fr)`, gap: 24 }}>
          <ConditionalSignatureFrame label="Demandeur" signatureUrl={demandeurSignatureUrl} stampUrl={demandeurStampUrl} active={true} zoneIndex={1} />
          <ConditionalSignatureFrame label="Acheteur" signatureUrl={null} stampUrl={null} active={nbSignataires >= 2} zoneIndex={2} />
          <ConditionalSignatureFrame label="DS" signatureUrl={null} stampUrl={null} active={nbSignataires >= 3} zoneIndex={3} />
        </div>
      </div>

      {/* PIED DE PAGE */}
      <div style={{ textAlign: 'center', fontSize: 10, color: '#9ca3af', marginTop: 24 }}>
        Hôpital Saint Jean de Malte - Njombé | Document généré automatiquement
      </div>
    </div>
  );
};

export default BonDeCommandeInterne;
