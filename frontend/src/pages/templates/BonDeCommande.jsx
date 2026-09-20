// frontend/src/pages/templates/BonDeCommande.jsx
import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import logo from '../../assets/logo-ordre-malte.png';
import { useAuth } from '../../contexts/AuthContext';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';

const BonDeCommande = ({ formData, setFormData, pdfContainerRef }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!formData.lines) {
      setFormData(prev => ({
        ...prev,
        numeroCommande: `HSJMBC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        date: new Date().toISOString().split('T')[0],
        serviceDemandeur: '',
        fournisseur: { name: '', address: '', phone: '', fax: '' },
        livraison: { contact: '', address: 'Hôpital Saint Jean de Malte - Njombé', datePrevue: '' },
        objet: '',
        modeTransport: '',
        conditionPaiement: 'Virement à 30 jours',
        lines: [{ ref: '', designation: '', quantite: 1, unite: 'U', prixUnitaire: 0, remise: 0 }],
        tvaRate: 19.25
      }));
    }
  }, []);

  const calculateLineTotal = (line) => {
    const qty = parseFloat(line.quantite) || 0;
    const pu = parseFloat(line.prixUnitaire) || 0;
    const remise = parseFloat(line.remise) || 0;
    return (qty * pu) - remise;
  };

  const calculateTotals = () => {
    const lines = formData.lines || [];
    const totalHT = lines.reduce((acc, line) => acc + calculateLineTotal(line), 0);
    const tva = totalHT * ((formData.tvaRate || 0) / 100);
    const totalTTC = totalHT + tva;
    return { totalHT, tva, totalTTC };
  };

  const { totalHT, tva, totalTTC } = calculateTotals();

  const handleChange = (e, section = null) => {
    const { name, value } = e.target;
    if (section) {
      setFormData(prev => ({ ...prev, [section]: { ...prev[section], [name]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...(formData.lines || [])];
    newLines[index][field] = value;
    setFormData({ ...formData, lines: newLines });
  };

  const addLine = () => {
    setFormData({ ...formData, lines: [...(formData.lines || []), { ref: '', designation: '', quantite: 1, unite: 'U', prixUnitaire: 0, remise: 0 }] });
  };

  const removeLine = (index) => {
    setFormData({ ...formData, lines: formData.lines.filter((_, i) => i !== index) });
  };

  const cellIn = { background: 'none', border: 'none', outline: 'none', width: '100%', fontSize: 12 };

  return (
    <div ref={pdfContainerRef} style={{ background: '#ffffff', padding: 32, margin: '0 auto', display: 'flex', flexDirection: 'column', fontSize: 13, width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>

      {/* EN-TÊTE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '2px solid #000', paddingBottom: 16 }}>
        <img src={logo} alt="Logo HSJM" style={{ height: 80, objectFit: 'contain' }} />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Bon de Commande</h1>
          <h2 style={{ fontSize: 16, margin: '4px 0 0', fontWeight: 600 }}>N° {formData.numeroCommande}</h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700 }}>DU : </div>
          <input type="date" name="date" value={formData.date || ''} onChange={handleChange} className="not-printable" style={{ border: '1px solid #ccc', padding: 4, borderRadius: 4 }} />
          <span className="print-only">{formData.date ? new Date(formData.date).toLocaleDateString('fr-FR') : ''}</span>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span style={{ fontWeight: 700 }}>Service Demandeur : </span>
        <input name="serviceDemandeur" value={formData.serviceDemandeur || ''} onChange={handleChange} placeholder="Ex: Frais Généraux / Chirurgie" className="not-printable" style={{ borderBottom: '1px solid #999', width: '40%', outline: 'none' }} />
        <span className="print-only">{formData.serviceDemandeur}</span>
      </div>

      {/* FOURNISSEUR & LIVRAISON */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginBottom: 24, border: '1px solid #000' }}>
        <div style={{ padding: 8, borderRight: '1px solid #000' }}>
          <h3 style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: 8, fontSize: 13 }}>FOURNISSEUR :</h3>
          {[['name','Nom'], ['address','Adresse'], ['phone','Tél']].map(([key, lbl]) => (
            <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 70 }}>{lbl}:</span>
              <input name={key} value={formData.fournisseur?.[key] || ''} onChange={(e) => handleChange(e, 'fournisseur')} className="not-printable" style={{ ...cellIn, flex: 1, borderBottom: '1px solid #999' }} />
              <span className="print-only" style={{ fontWeight: key === 'name' ? 700 : 400 }}>{formData.fournisseur?.[key]}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: 8 }}>
          <h3 style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: 8, fontSize: 13 }}>ADRESSE DE LIVRAISON :</h3>
          {[['address','Lieu'], ['contact','Contact']].map(([key, lbl]) => (
            <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 70 }}>{lbl}:</span>
              <input name={key} value={formData.livraison?.[key] || ''} onChange={(e) => handleChange(e, 'livraison')} className="not-printable" style={{ ...cellIn, flex: 1, borderBottom: '1px solid #999' }} />
              <span className="print-only">{formData.livraison?.[key]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* OBJET & TRANSPORT */}
      <div style={{ marginBottom: 16, border: '1px solid #000', padding: 8 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <span style={{ fontWeight: 700, width: 100 }}>Objet :</span>
          <textarea name="objet" value={formData.objet || ''} onChange={handleChange} className="not-printable" style={{ flex: 1, border: '1px solid #ccc', padding: 4 }} rows={2} />
          <span className="print-only" style={{ flex: 1 }}>{formData.objet}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontWeight: 700, width: 100 }}>Mode transport:</span>
          <input name="modeTransport" value={formData.modeTransport || ''} onChange={handleChange} className="not-printable" style={{ ...cellIn, flex: 1, borderBottom: '1px solid #999' }} />
          <span className="print-only">{formData.modeTransport}</span>
        </div>
      </div>

      {/* TABLEAU */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: 16, fontSize: 11 }}>
        <thead style={{ background: '#e5e7eb' }}>
          <tr>
            {['N° REF','DESCRIPTION / DÉSIGNATION','QTÉ','UNITÉ','PRIX U.','REMISE','MONTANT HT',''].map((h, i) => (
              <th key={i} style={{ border: '1px solid #000', padding: 4, fontWeight: 700, ...(i===7 ? {width:28} : {}) }} className={i===7 ? 'not-printable' : ''}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(formData.lines || []).map((line, index) => (
            <tr key={index}>
              <td style={{ border: '1px solid #000', padding: 4 }}>
                <input value={line.ref} onChange={(e) => handleLineChange(index, 'ref', e.target.value)} className="not-printable" style={cellIn} />
                <span className="print-only">{line.ref}</span>
              </td>
              <td style={{ border: '1px solid #000', padding: 4 }}>
                <input value={line.designation} onChange={(e) => handleLineChange(index, 'designation', e.target.value)} className="not-printable" style={cellIn} />
                <span className="print-only">{line.designation}</span>
              </td>
              <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>
                <input type="number" value={line.quantite} onChange={(e) => handleLineChange(index, 'quantite', e.target.value)} className="not-printable" style={{ ...cellIn, textAlign: 'right' }} />
                <span className="print-only">{line.quantite}</span>
              </td>
              <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>
                <input value={line.unite} onChange={(e) => handleLineChange(index, 'unite', e.target.value)} className="not-printable" style={{ ...cellIn, textAlign: 'center' }} />
                <span className="print-only">{line.unite}</span>
              </td>
              <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>
                <input type="number" value={line.prixUnitaire} onChange={(e) => handleLineChange(index, 'prixUnitaire', e.target.value)} className="not-printable" style={{ ...cellIn, textAlign: 'right' }} />
                <span className="print-only">{Number(line.prixUnitaire).toLocaleString('fr-FR')}</span>
              </td>
              <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>
                <input type="number" value={line.remise} onChange={(e) => handleLineChange(index, 'remise', e.target.value)} className="not-printable" style={{ ...cellIn, textAlign: 'right' }} />
                <span className="print-only">{Number(line.remise).toLocaleString('fr-FR')}</span>
              </td>
              <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right', fontWeight: 700, background: '#f9fafb' }}>
                {calculateLineTotal(line).toLocaleString('fr-FR')}
              </td>
              <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }} className="not-printable">
                <button onClick={() => removeLine(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14}/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={addLine} className="not-printable" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontWeight: 700, fontSize: 13 }}>
        <PlusCircle size={16}/> Ajouter un article
      </button>

      {/* TOTAUX */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
        <table style={{ width: '50%', borderCollapse: 'collapse', border: '1px solid #000' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: 4, fontWeight: 700 }}>Montant H.T.</td>
              <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>{totalHT.toLocaleString('fr-FR')} XAF</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: 4, fontWeight: 700 }}>
                TVA ({formData.tvaRate}%)
                <input type="number" name="tvaRate" value={formData.tvaRate} onChange={handleChange} className="not-printable" style={{ width: 48, marginLeft: 8, border: '1px solid #ccc' }} />
              </td>
              <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>{tva.toLocaleString('fr-FR')} XAF</td>
            </tr>
            <tr style={{ background: '#e5e7eb' }}>
              <td style={{ border: '1px solid #000', padding: 8, fontWeight: 700, fontSize: 15 }}>Montant TTC</td>
              <td style={{ border: '1px solid #000', padding: 8, textAlign: 'right', fontWeight: 700, fontSize: 15 }}>{totalTTC.toLocaleString('fr-FR')} XAF</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* CONDITIONS ET SIGNATURES */}
      <div style={{ borderTop: '2px solid #000', paddingTop: 16, marginTop: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <span style={{ fontWeight: 700 }}>Condition de paiement :</span>
          <input name="conditionPaiement" value={formData.conditionPaiement || ''} onChange={handleChange} className="not-printable" style={{ ...cellIn, flex: 1, borderBottom: '1px solid #999' }} />
          <span className="print-only">{formData.conditionPaiement}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          <span style={{ fontWeight: 700 }}>Livraison prévue le :</span>
          <input type="date" name="datePrevue" value={formData.livraison?.datePrevue || ''} onChange={(e) => handleChange(e, 'livraison')} className="not-printable" style={{ borderBottom: '1px solid #999', outline: 'none' }} />
          <span className="print-only">{formData.livraison?.datePrevue ? new Date(formData.livraison.datePrevue).toLocaleDateString('fr-FR') : '__________________'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <SignatureFrame label="VALIDATION SERVICE ACHAT / DG" signatureUrl={getImageUrl(user?.signaturePath)} stampUrl={getImageUrl(user?.stampPath)} zoneIndex={1} />
          <SignatureFrame label="ACCEPTATION FOURNISSEUR" signatureUrl={null} stampUrl={null} zoneIndex={2} />
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 10, color: '#6b7280', marginTop: 16 }}>
        Hôpital Saint Jean de Malte - Njombé | Document généré automatiquement
      </div>
    </div>
  );
};

export default BonDeCommande;
