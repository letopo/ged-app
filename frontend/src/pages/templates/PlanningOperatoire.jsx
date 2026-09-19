// frontend/src/pages/templates/PlanningOperatoire.jsx
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import SignatureFrame from '../../components/SignatureFrame';

const joursOptions = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];

const inputStyle = {
  width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-2)',
  border: '1.5px solid var(--border)', background: 'var(--surface)',
  color: 'var(--fg)', fontSize: 13, outline: 'none',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 4 };

const PlanningOperatoire = ({ formData, setFormData, pdfContainerRef }) => {

  React.useEffect(() => {
    if (!formData.lignes || formData.lignes.length === 0) {
      setFormData(prev => ({
        ...prev,
        lignes: [{ jour: '', nomPatient: '', age: '', natureIntervention: '', intervenant: '', numeroSalle: '' }]
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLineChange = (index, field, value) => {
    const newLignes = [...(formData.lignes || [])];
    newLignes[index] = { ...newLignes[index], [field]: value };
    setFormData(prev => ({ ...prev, lignes: newLignes }));
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lignes: [...(prev.lignes || []), { jour: '', nomPatient: '', age: '', natureIntervention: '', intervenant: '', numeroSalle: '' }]
    }));
  };

  const removeLine = (index) => {
    if ((formData.lignes || []).length > 1) {
      setFormData(prev => ({ ...prev, lignes: prev.lignes.filter((_, i) => i !== index) }));
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Formulaire de saisie */}
      <div className="not-printable" style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-3)', padding: 24, marginBottom: 24,
        boxShadow: 'var(--shadow-1)',
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 16, marginTop: 0 }}>Informations du Planning</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={labelStyle}>📅 Période (Ex: du 24 au 28 novembre) *</label>
            <input type="text" name="periode" value={formData.periode || ''} onChange={handleChange} placeholder="Ex: du 24 au 28 novembre" style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>🏥 Service *</label>
            <input type="text" name="service" value={formData.service || ''} onChange={handleChange} placeholder="Ex: Chirurgie" style={inputStyle} required />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>Interventions chirurgicales</h4>
            <button type="button" onClick={addLine} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px',
              background: 'var(--success)', color: '#fff', border: 'none',
              borderRadius: 'var(--radius-2)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}>
              <Plus size={16} /> Ajouter une intervention
            </button>
          </div>

          <div style={{ maxHeight: 384, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(formData.lignes || []).map((ligne, index) => (
              <div key={index} style={{
                padding: 16, background: 'var(--surface-2)',
                borderRadius: 'var(--radius-2)', border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>Intervention #{index + 1}</span>
                  {(formData.lignes || []).length > 1 && (
                    <button type="button" onClick={() => removeLine(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}>
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Jour de la semaine</label>
                    <select value={ligne.jour || ''} onChange={(e) => handleLineChange(index, 'jour', e.target.value)} style={{ ...inputStyle, fontSize: 12, padding: '4px 8px' }}>
                      <option value="">Sélectionner...</option>
                      {joursOptions.map(jour => <option key={jour} value={jour}>{jour}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Nom/Prénom du patient ou de la patiente</label>
                    <input type="text" value={ligne.nomPatient || ''} onChange={(e) => handleLineChange(index, 'nomPatient', e.target.value)} placeholder="Ex: AKWO PRUDENCIA" style={{ ...inputStyle, fontSize: 12, padding: '4px 8px' }} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Âge</label>
                    <input type="text" value={ligne.age || ''} onChange={(e) => handleLineChange(index, 'age', e.target.value)} placeholder="Ex: 47 ANS" style={{ ...inputStyle, fontSize: 12, padding: '4px 8px' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Nature de l'intervention chirurgicale</label>
                    <input type="text" value={ligne.natureIntervention || ''} onChange={(e) => handleLineChange(index, 'natureIntervention', e.target.value)} placeholder="Ex: HRT TOTALE INDIQUEE POUR UTERUS POLYMYOMATEUX" style={{ ...inputStyle, fontSize: 12, padding: '4px 8px' }} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Intervenant</label>
                    <input type="text" value={ligne.intervenant || ''} onChange={(e) => handleLineChange(index, 'intervenant', e.target.value)} placeholder="Ex: DR MBOUOPDA" style={{ ...inputStyle, fontSize: 12, padding: '4px 8px' }} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>N° Salle</label>
                    <input type="text" value={ligne.numeroSalle || ''} onChange={(e) => handleLineChange(index, 'numeroSalle', e.target.value)} placeholder="Ex: 2" style={{ ...inputStyle, fontSize: 12, padding: '4px 8px' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prévisualisation PDF - FORMAT PAYSAGE */}
      <div ref={pdfContainerRef} style={{ background: '#ffffff', padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', width: '297mm', minHeight: '210mm' }}>
        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #000' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
            PROGRAMME OPÉRATOIRE DE LA SEMAINE {formData.periode ? formData.periode.toUpperCase() : ''}
          </h1>
          {formData.service && <p style={{ fontSize: 16, fontWeight: 600 }}>Service: {formData.service}</p>}
        </div>

        {/* Tableau */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#ffffff' }}>
              {['JOUR DE LA\nSEMAINE', 'NOM/PRÉNOM DU PATIENT OU\nDE LA PATIENTE', 'ÂGE', 'NATURE DE L\'INTERVENTION CHIRURGICALE', 'INTERVENANT', 'N° SALLE'].map((h, i) => (
                <th key={i} style={{ border: '2px solid #000', padding: 8, fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', whiteSpace: 'pre-line' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(formData.lignes || []).map((ligne, index) => {
              const isNewDay = index === 0 || ligne.jour !== formData.lignes[index - 1]?.jour;
              const isYellow = ligne.jour && isNewDay;
              return (
                <tr key={index} style={{ background: isYellow ? '#fef08a' : '#ffffff' }}>
                  <td style={{ border: '2px solid #000', padding: 8, textAlign: 'center', verticalAlign: 'top', fontWeight: 700 }}>{ligne.jour || ''}</td>
                  <td style={{ border: '2px solid #000', padding: 8, verticalAlign: 'top', textTransform: 'uppercase' }}>{ligne.nomPatient || ''}</td>
                  <td style={{ border: '2px solid #000', padding: 8, textAlign: 'center', verticalAlign: 'top' }}>{ligne.age || ''}</td>
                  <td style={{ border: '2px solid #000', padding: 8, verticalAlign: 'top', textTransform: 'uppercase' }}>{ligne.natureIntervention || ''}</td>
                  <td style={{ border: '2px solid #000', padding: 8, textAlign: 'center', verticalAlign: 'top', textTransform: 'uppercase' }}>{ligne.intervenant || ''}</td>
                  <td style={{ border: '2px solid #000', padding: 8, textAlign: 'center', verticalAlign: 'top' }}>{ligne.numeroSalle || ''}</td>
                </tr>
              );
            })}
            {(formData.lignes || []).length < 10 && Array.from({ length: 10 - (formData.lignes || []).length }).map((_, i) => (
              <tr key={`empty-${i}`} style={{ background: '#ffffff' }}>
                {[...Array(6)].map((__, j) => <td key={j} style={{ border: '2px solid #000', padding: 8, height: 48 }}>&nbsp;</td>)}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, marginTop: 48, fontSize: 13 }}>
          <SignatureFrame label="Chef de Service Chirurgie" zoneIndex={1} height="112px" />
          <SignatureFrame label="Directeur des Soins Infirmiers" zoneIndex={2} height="112px" />
          <SignatureFrame label="Directeur Général" zoneIndex={3} height="112px" />
        </div>
      </div>
    </div>
  );
};

export default PlanningOperatoire;
