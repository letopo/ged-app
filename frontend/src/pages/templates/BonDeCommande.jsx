// frontend/src/pages/templates/BonDeCommande.jsx

import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import logo from '../../assets/logo-ordre-malte.png'; // Assurez-vous que le logo existe
import { useAuth } from '../../contexts/AuthContext';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';

const BonDeCommande = ({ formData, setFormData, pdfContainerRef }) => {
  const { user } = useAuth();
  
  // Initialisation des données
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

  // Helpers de calcul
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

  // Handlers
  const handleChange = (e, section = null) => {
    const { name, value } = e.target;
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: { ...prev[section], [name]: value }
      }));
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
    setFormData({
      ...formData,
      lines: [...(formData.lines || []), { ref: '', designation: '', quantite: 1, unite: 'U', prixUnitaire: 0, remise: 0 }]
    });
  };

  const removeLine = (index) => {
    const newLines = formData.lines.filter((_, i) => i !== index);
    setFormData({ ...formData, lines: newLines });
  };

  return (
    <div ref={pdfContainerRef} className="bg-white p-8 mx-auto flex flex-col text-sm" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
      
      {/* EN-TÊTE */}
      <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
        <img src={logo} alt="Logo HSJM" className="h-20 object-contain" />
        <div className="text-center">
          <h1 className="text-2xl font-bold uppercase">Bon de Commande</h1>
          <h2 className="text-lg">N° {formData.numeroCommande}</h2>
        </div>
        <div className="text-right">
          <div className="font-bold">DU : </div>
          <input 
            type="date" 
            name="date" 
            value={formData.date || ''} 
            onChange={handleChange} 
            className="not-printable border p-1 rounded" 
          />
          <span className="print-only">{new Date(formData.date).toLocaleDateString('fr-FR')}</span>
        </div>
      </div>

      <div className="mb-4">
        <span className="font-bold">Service Demandeur : </span>
        <input 
          name="serviceDemandeur" 
          value={formData.serviceDemandeur || ''} 
          onChange={handleChange} 
          placeholder="Ex: Frais Généraux / Chirurgie" 
          className="not-printable border-b w-1/2"
        />
        <span className="print-only">{formData.serviceDemandeur}</span>
      </div>

      {/* CADRES FOURNISSEUR & LIVRAISON */}
      <div className="grid grid-cols-2 gap-4 mb-6 border border-black">
        {/* Fournisseur */}
        <div className="p-2 border-r border-black">
          <h3 className="font-bold underline mb-2">FOURNISSEUR :</h3>
          <div className="space-y-1">
            <div className="flex gap-2"><span className="w-20">Nom:</span> 
              <input name="name" value={formData.fournisseur?.name || ''} onChange={(e) => handleChange(e, 'fournisseur')} className="not-printable border-b flex-1" placeholder="Nom du fournisseur"/>
              <span className="print-only font-bold">{formData.fournisseur?.name}</span>
            </div>
            <div className="flex gap-2"><span className="w-20">Adresse:</span>
              <input name="address" value={formData.fournisseur?.address || ''} onChange={(e) => handleChange(e, 'fournisseur')} className="not-printable border-b flex-1"/>
              <span className="print-only">{formData.fournisseur?.address}</span>
            </div>
            <div className="flex gap-2"><span className="w-20">Tél:</span>
              <input name="phone" value={formData.fournisseur?.phone || ''} onChange={(e) => handleChange(e, 'fournisseur')} className="not-printable border-b flex-1"/>
              <span className="print-only">{formData.fournisseur?.phone}</span>
            </div>
          </div>
        </div>

        {/* Livraison */}
        <div className="p-2">
          <h3 className="font-bold underline mb-2">ADRESSE DE LIVRAISON :</h3>
          <div className="space-y-1">
            <div className="flex gap-2"><span className="w-20">Lieu:</span>
              <input name="address" value={formData.livraison?.address || ''} onChange={(e) => handleChange(e, 'livraison')} className="not-printable border-b flex-1"/>
              <span className="print-only">{formData.livraison?.address}</span>
            </div>
            <div className="flex gap-2"><span className="w-20">Contact:</span>
              <input name="contact" value={formData.livraison?.contact || ''} onChange={(e) => handleChange(e, 'livraison')} className="not-printable border-b flex-1"/>
              <span className="print-only">{formData.livraison?.contact}</span>
            </div>
          </div>
        </div>
      </div>

      {/* OBJET & TRANSPORT */}
      <div className="mb-4 border border-black p-2">
        <div className="flex gap-2 mb-2">
          <span className="font-bold w-32">Objet :</span>
          <textarea 
            name="objet" 
            value={formData.objet || ''} 
            onChange={handleChange} 
            className="not-printable w-full border p-1" 
            rows="2"
          />
          <span className="print-only flex-1">{formData.objet}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-bold w-32">Mode transport:</span>
          <input name="modeTransport" value={formData.modeTransport || ''} onChange={handleChange} className="not-printable border-b flex-1"/>
          <span className="print-only">{formData.modeTransport}</span>
        </div>
      </div>

      {/* TABLEAU DES ARTICLES */}
      <table className="w-full border-collapse border border-black mb-4 text-xs">
        <thead className="bg-gray-200">
          <tr>
            <th className="border border-black p-1 w-16">N° REF</th>
            <th className="border border-black p-1">DESCRIPTION / DÉSIGNATION</th>
            <th className="border border-black p-1 w-12">QTÉ</th>
            <th className="border border-black p-1 w-12">UNITÉ</th>
            <th className="border border-black p-1 w-20">PRIX U.</th>
            <th className="border border-black p-1 w-20">REMISE</th>
            <th className="border border-black p-1 w-24">MONTANT HT</th>
            <th className="border border-black p-1 w-8 not-printable"></th>
          </tr>
        </thead>
        <tbody>
          {(formData.lines || []).map((line, index) => (
            <tr key={index}>
              <td className="border border-black p-1">
                <input value={line.ref} onChange={(e) => handleLineChange(index, 'ref', e.target.value)} className="not-printable w-full"/>
                <span className="print-only">{line.ref}</span>
              </td>
              <td className="border border-black p-1">
                <input value={line.designation} onChange={(e) => handleLineChange(index, 'designation', e.target.value)} className="not-printable w-full"/>
                <span className="print-only">{line.designation}</span>
              </td>
              <td className="border border-black p-1 text-right">
                <input type="number" value={line.quantite} onChange={(e) => handleLineChange(index, 'quantite', e.target.value)} className="not-printable w-full text-right"/>
                <span className="print-only">{line.quantite}</span>
              </td>
              <td className="border border-black p-1 text-center">
                <input value={line.unite} onChange={(e) => handleLineChange(index, 'unite', e.target.value)} className="not-printable w-full text-center"/>
                <span className="print-only">{line.unite}</span>
              </td>
              <td className="border border-black p-1 text-right">
                <input type="number" value={line.prixUnitaire} onChange={(e) => handleLineChange(index, 'prixUnitaire', e.target.value)} className="not-printable w-full text-right"/>
                <span className="print-only">{Number(line.prixUnitaire).toLocaleString('fr-FR')}</span>
              </td>
              <td className="border border-black p-1 text-right">
                <input type="number" value={line.remise} onChange={(e) => handleLineChange(index, 'remise', e.target.value)} className="not-printable w-full text-right"/>
                <span className="print-only">{Number(line.remise).toLocaleString('fr-FR')}</span>
              </td>
              <td className="border border-black p-1 text-right font-bold bg-gray-50">
                {calculateLineTotal(line).toLocaleString('fr-FR')}
              </td>
              <td className="border border-black p-1 text-center not-printable">
                <button onClick={() => removeLine(index)} className="text-red-500"><Trash2 size={14}/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <button onClick={addLine} className="not-printable mb-4 flex items-center gap-2 text-blue-600 font-bold"><PlusCircle size={16}/> Ajouter un article</button>

      {/* TOTAUX */}
      <div className="flex justify-end mb-8">
        <table className="w-1/2 border-collapse border border-black">
          <tbody>
            <tr>
              <td className="border border-black p-1 font-bold">Montant H.T.</td>
              <td className="border border-black p-1 text-right">{totalHT.toLocaleString('fr-FR')} XAF</td>
            </tr>
            <tr>
              <td className="border border-black p-1 font-bold">
                TVA ({formData.tvaRate}%) 
                <input 
                  type="number" 
                  name="tvaRate" 
                  value={formData.tvaRate} 
                  onChange={handleChange} 
                  className="not-printable w-12 ml-2 border" 
                />
              </td>
              <td className="border border-black p-1 text-right">{tva.toLocaleString('fr-FR')} XAF</td>
            </tr>
            <tr className="bg-gray-200">
              <td className="border border-black p-2 font-bold text-lg">Montant TTC</td>
              <td className="border border-black p-2 text-right font-bold text-lg">{totalTTC.toLocaleString('fr-FR')} XAF</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* CONDITIONS ET VALIDATION */}
      <div className="border-t-2 border-black pt-4 mt-auto">
        <div className="flex gap-2 mb-2">
          <span className="font-bold">Condition de paiement :</span>
          <input name="conditionPaiement" value={formData.conditionPaiement || ''} onChange={handleChange} className="not-printable border-b flex-1"/>
          <span className="print-only">{formData.conditionPaiement}</span>
        </div>
        <div className="flex gap-2 mb-8">
          <span className="font-bold">Livraison prévue le :</span>
          <input type="date" name="datePrevue" value={formData.livraison?.datePrevue || ''} onChange={(e) => handleChange(e, 'livraison')} className="not-printable border-b"/>
          <span className="print-only">{formData.livraison?.datePrevue ? new Date(formData.livraison.datePrevue).toLocaleDateString('fr-FR') : '__________________'}</span>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <SignatureFrame label="VALIDATION SERVICE ACHAT / DG" signatureUrl={getImageUrl(user?.signaturePath)} stampUrl={getImageUrl(user?.stampPath)} zoneIndex={1} />
          <SignatureFrame label="ACCEPTATION FOURNISSEUR" signatureUrl={null} stampUrl={null} zoneIndex={2} />
        </div>
      </div>

      <div className="text-center text-xs text-gray-500 mt-4">
        Hôpital Saint Jean de Malte - Njombé | Document généré automatiquement
      </div>
    </div>
  );
};

export default BonDeCommande;