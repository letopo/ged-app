// frontend/src/pages/templates/BonDeSortie.jsx
import React from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import logo from '../../assets/logo-ordre-malte.png';
import { useAuth } from '../../contexts/AuthContext';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';

const BonDeSortie = ({ formData, setFormData, pdfContainerRef }) => {
  const { user } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index][field] = value;
    setFormData({ ...formData, lines: newLines });
  };

  const addLine = () => setFormData({ ...formData, lines: [...formData.lines, { designation: '', quantite: '', pu: '', montant: '' }] });

  const removeLine = (index) => setFormData({ ...formData, lines: formData.lines.filter((_, i) => i !== index) });

  const calculateMontant = (quantite, pu) => (parseFloat(quantite) || 0) * (parseFloat(pu) || 0);

  const totalMontant = formData.lines.reduce((acc, line) => acc + calculateMontant(line.quantite, line.pu), 0);

  const cellIn = { background: 'none', border: 'none', outline: 'none', width: '100%', padding: 4, fontSize: 12 };

  return (
    <div ref={pdfContainerRef} style={{ background: '#ffffff', padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', margin: '0 auto', width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src={logo} alt="Logo Ordre de Malte" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>ORDRE DE MALTE</h1>
            <p style={{ fontSize: 13, margin: '2px 0 0' }}>B.P.: 56 NJOMBE</p>
            <p style={{ fontSize: 13, margin: '2px 0 0' }}>Tél.: (237) 697 09 29 92</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 13, marginBottom: 4 }}>Date :</p>
          <input type="date" name="date" value={formData.date || ''} onChange={handleChange} className="not-printable" style={{ borderBottom: '1px solid #000', outline: 'none', padding: '4px 8px', fontSize: 13 }} />
          <div className="print-only" style={{ fontSize: 13 }}>{formData.date || ' '}</div>
        </div>
      </div>

      {/* Titre */}
      <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, marginBottom: 32 }}>BON DE SORTIE</h2>

      {/* Nom du demandeur */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Nom du demandeur :</label>
        <input name="nomDemandeur" value={formData.nomDemandeur || ''} onChange={handleChange} className="not-printable" style={{ ...cellIn, width: '100%', borderBottom: '2px dotted #000', padding: '4px 8px', minHeight: 28, marginTop: 4 }} placeholder="Nom du demandeur..." />
        <div className="print-only" style={{ borderBottom: '2px dotted #000', padding: '4px 8px', minHeight: 28 }}>{formData.nomDemandeur || ' '}</div>
      </div>

      {/* Tableau */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', fontSize: 13, marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ border: '1px solid #000', padding: 8, width: '10%' }}>N°</th>
            <th style={{ border: '1px solid #000', padding: 8, width: '40%' }}>Désignation</th>
            <th style={{ border: '1px solid #000', padding: 8, width: '15%' }}>Quantité</th>
            <th style={{ border: '1px solid #000', padding: 8, width: '15%' }}>PU</th>
            <th style={{ border: '1px solid #000', padding: 8, width: '20%' }}>Montant</th>
          </tr>
        </thead>
        <tbody>
          {formData.lines.map((line, index) => {
            const montant = calculateMontant(line.quantite, line.pu);
            return (
              <tr key={index}>
                <td style={{ border: '1px solid #000', padding: 8, textAlign: 'center' }}>{index + 1}</td>
                <td style={{ border: '1px solid #000', padding: 4 }}>
                  <input value={line.designation || ''} onChange={(e) => handleLineChange(index, 'designation', e.target.value)} className="not-printable" style={cellIn} placeholder="Désignation..." />
                  <div className="print-only" style={{ padding: 4 }}>{line.designation}</div>
                </td>
                <td style={{ border: '1px solid #000', padding: 4 }}>
                  <input type="number" value={line.quantite || ''} onChange={(e) => handleLineChange(index, 'quantite', e.target.value)} className="not-printable" style={{ ...cellIn, textAlign: 'center' }} placeholder="Qté" />
                  <div className="print-only" style={{ padding: 4, textAlign: 'center' }}>{line.quantite}</div>
                </td>
                <td style={{ border: '1px solid #000', padding: 4 }}>
                  <input type="number" value={line.pu || ''} onChange={(e) => handleLineChange(index, 'pu', e.target.value)} className="not-printable" style={{ ...cellIn, textAlign: 'right' }} placeholder="Prix" />
                  <div className="print-only" style={{ padding: 4, textAlign: 'right' }}>{line.pu ? parseFloat(line.pu).toLocaleString('fr-FR') : ''}</div>
                </td>
                <td style={{ border: '1px solid #000', padding: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, textAlign: 'right', padding: 4, fontWeight: 600 }}>
                      {montant > 0 ? montant.toLocaleString('fr-FR') : ''}
                    </div>
                    <button type="button" onClick={() => removeLine(index)} className="not-printable" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', marginLeft: 8 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button type="button" onClick={addLine} className="not-printable" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: 13 }}>
        <PlusCircle size={16} /> Ajouter une ligne
      </button>

      {/* Total */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <div style={{ width: '33%', border: '2px solid #000' }}>
          <div style={{ background: '#f3f4f6', borderBottom: '2px solid #000', padding: 8, textAlign: 'center', fontWeight: 700 }}>TOTAL</div>
          <div style={{ padding: 8, textAlign: 'right', fontSize: 18, fontWeight: 700 }}>{totalMontant.toLocaleString('fr-FR')}</div>
        </div>
      </div>

      {/* Montant en lettres */}
      <div style={{ marginBottom: 32 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Montant total en lettre :</label>
        <input name="montantEnLettres" value={formData.montantEnLettres || ''} onChange={handleChange} className="not-printable" style={{ ...cellIn, width: '100%', borderBottom: '2px dotted #000', padding: '4px 8px', minHeight: 28, marginTop: 4 }} placeholder="Montant en lettres..." />
        <div className="print-only" style={{ borderBottom: '2px dotted #000', padding: '4px 8px', minHeight: 28 }}>{formData.montantEnLettres || ' '}</div>
      </div>

      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 48 }}>
        <SignatureFrame label="Visa du demandeur" signatureUrl={getImageUrl(user?.signaturePath)} stampUrl={getImageUrl(user?.stampPath)} zoneIndex={1} />
        <SignatureFrame label="Visa MG (si besoin)" signatureUrl={null} stampUrl={null} zoneIndex={2} />
        <SignatureFrame label="Visa Responsable" signatureUrl={null} stampUrl={null} zoneIndex={3} />
      </div>
    </div>
  );
};

export default BonDeSortie;
