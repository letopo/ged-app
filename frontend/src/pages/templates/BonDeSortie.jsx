// frontend/src/pages/templates/BonDeSortie.jsx

import React from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import logo from '../../assets/logo-ordre-malte.png';

const BonDeSortie = ({ formData, setFormData, pdfContainerRef }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index][field] = value;
    setFormData({ ...formData, lines: newLines });
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { designation: '', quantite: '', pu: '', montant: '' }]
    });
  };

  const removeLine = (index) => {
    const newLines = formData.lines.filter((_, i) => i !== index);
    setFormData({ ...formData, lines: newLines });
  };

  // Calculer automatiquement le montant pour chaque ligne
  const calculateMontant = (quantite, pu) => {
    const q = parseFloat(quantite) || 0;
    const p = parseFloat(pu) || 0;
    return q * p;
  };

  // Calculer le total
  const totalMontant = formData.lines.reduce((acc, line) => {
    return acc + calculateMontant(line.quantite, line.pu);
  }, 0);

  return (
    <div
      ref={pdfContainerRef}
      className="bg-white p-8 shadow-lg mx-auto"
      style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}
    >
      {/* En-tête avec logo */}
        <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
            {/* ✅ VERSION ALTERNATIVE : Conteneur carré pour éviter la déformation */}
            <div className="w-20 h-20 flex items-center justify-center flex-shrink-0">
            <img 
                src={logo} 
                alt="Logo Ordre de Malte" 
                className="max-w-full max-h-full object-contain"
            />
            </div>
            <div>
            <h1 className="text-xl font-bold">ORDRE DE MALTE</h1>
            <p className="text-sm">B.P.: 56 NJOMBE</p>
            <p className="text-sm">Tél.: (237) 697 09 29 92</p>
            </div>
        </div>
        <div className="text-right">
            <p className="text-sm mb-1">Date :</p>
            <input
            type="date"
            name="date"
            value={formData.date || ''}
            onChange={handleChange}
            className="not-printable border-b border-black px-2 py-1 text-sm"
            />
            <div className="print-only text-sm">{formData.date || '\u00A0'}</div>
        </div>
    </div>

      {/* Titre */}
      <h2 className="text-center text-2xl font-bold mb-8">BON DE SORTIE</h2>

      {/* Nom du demandeur */}
      <div className="mb-6">
        <label className="text-sm font-semibold">Nom du demandeur :</label>
        <input
          name="nomDemandeur"
          value={formData.nomDemandeur || ''}
          onChange={handleChange}
          className="not-printable w-full border-b-2 border-dotted border-black px-2 py-1 text-sm"
          placeholder="Nom du demandeur..."
        />
        <div className="print-only border-b-2 border-dotted border-black px-2 py-1 min-h-[28px]">
          {formData.nomDemandeur || '\u00A0'}
        </div>
      </div>

      {/* Tableau des articles */}
      <table className="w-full border-collapse border-2 border-black text-sm mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 w-[10%]">N°</th>
            <th className="border border-black p-2 w-[40%]">Désignation</th>
            <th className="border border-black p-2 w-[15%]">Quantité</th>
            <th className="border border-black p-2 w-[15%]">PU</th>
            <th className="border border-black p-2 w-[20%]">Montant</th>
          </tr>
        </thead>
        <tbody>
          {formData.lines.map((line, index) => {
            const montant = calculateMontant(line.quantite, line.pu);
            return (
              <tr key={index}>
                <td className="border border-black p-2 text-center">{index + 1}</td>
                <td className="border border-black p-1">
                  <input
                    value={line.designation || ''}
                    onChange={(e) => handleLineChange(index, 'designation', e.target.value)}
                    className="not-printable w-full p-1"
                    placeholder="Désignation..."
                  />
                  <div className="print-only p-1">{line.designation}</div>
                </td>
                <td className="border border-black p-1">
                  <input
                    type="number"
                    value={line.quantite || ''}
                    onChange={(e) => handleLineChange(index, 'quantite', e.target.value)}
                    className="not-printable w-full p-1 text-center"
                    placeholder="Qté"
                  />
                  <div className="print-only p-1 text-center">{line.quantite}</div>
                </td>
                <td className="border border-black p-1">
                  <input
                    type="number"
                    value={line.pu || ''}
                    onChange={(e) => handleLineChange(index, 'pu', e.target.value)}
                    className="not-printable w-full p-1 text-right"
                    placeholder="Prix"
                  />
                  <div className="print-only p-1 text-right">
                    {line.pu ? parseFloat(line.pu).toLocaleString('fr-FR') : ''}
                  </div>
                </td>
                <td className="border border-black p-1">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-right p-1 font-semibold">
                      {montant > 0 ? montant.toLocaleString('fr-FR') : ''}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="not-printable text-red-500 hover:text-red-700 ml-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Bouton ajouter ligne */}
      <button
        type="button"
        onClick={addLine}
        className="not-printable mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
      >
        <PlusCircle size={16} /> Ajouter une ligne
      </button>

      {/* Total */}
      <div className="flex justify-end mb-6">
        <div className="w-1/3 border-2 border-black">
          <div className="bg-gray-100 border-b-2 border-black p-2 text-center font-bold">
            TOTAL
          </div>
          <div className="p-2 text-right text-xl font-bold">
            {totalMontant.toLocaleString('fr-FR')}
          </div>
        </div>
      </div>

      {/* Montant en lettres */}
      <div className="mb-8">
        <label className="text-sm font-semibold">Montant total en lettre :</label>
        <input
          name="montantEnLettres"
          value={formData.montantEnLettres || ''}
          onChange={handleChange}
          className="not-printable w-full border-b-2 border-dotted border-black px-2 py-1 text-sm"
          placeholder="Montant en lettres..."
        />
        <div className="print-only border-b-2 border-dotted border-black px-2 py-1 min-h-[28px]">
          {formData.montantEnLettres || '\u00A0'}
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-4 text-center text-sm mt-12">
        <div>
          <p className="font-semibold mb-16">Visa du demandeur</p>
          <div className="border-t-2 border-dotted border-black pt-1 h-20"></div>
        </div>
        <div>
          <p className="font-semibold mb-16">Visa MG (si besoin)</p>
          <div className="border-t-2 border-dotted border-black pt-1 h-20"></div>
        </div>
        <div>
          <p className="font-semibold mb-16">Visa Responsable</p>
          <div className="border-t-2 border-dotted border-black pt-1 h-20"></div>
        </div>
      </div>
    </div>
  );
};

export default BonDeSortie;