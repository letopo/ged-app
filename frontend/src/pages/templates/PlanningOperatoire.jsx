// frontend/src/pages/templates/PlanningOperatoire.jsx

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const PlanningOperatoire = ({ formData, setFormData, pdfContainerRef }) => {
  
  // Initialiser les lignes si elles n'existent pas
  React.useEffect(() => {
    if (!formData.lignes || formData.lignes.length === 0) {
      setFormData(prev => ({
        ...prev,
        lignes: [
          { 
            jour: '', 
            nomPatient: '', 
            age: '', 
            natureIntervention: '', 
            intervenant: '', 
            numeroSalle: '' 
          }
        ]
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLineChange = (index, field, value) => {
    const newLignes = [...(formData.lignes || [])];
    newLignes[index] = {
      ...newLignes[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      lignes: newLignes
    }));
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lignes: [
        ...(prev.lignes || []),
        { 
          jour: '', 
          nomPatient: '', 
          age: '', 
          natureIntervention: '', 
          intervenant: '', 
          numeroSalle: '' 
        }
      ]
    }));
  };

  const removeLine = (index) => {
    if ((formData.lignes || []).length > 1) {
      const newLignes = formData.lignes.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        lignes: newLignes
      }));
    }
  };

  const joursOptions = [
    'LUNDI',
    'MARDI',
    'MERCREDI',
    'JEUDI',
    'VENDREDI',
    'SAMEDI',
    'DIMANCHE'
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Formulaire de saisie */}
      <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow mb-6 not-printable">
        <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-dark-text">
          Informations du Planning
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
              📅 Période (Ex: du 24 au 28 novembre) *
            </label>
            <input
              type="text"
              name="periode"
              value={formData.periode || ''}
              onChange={handleChange}
              placeholder="Ex: du 24 au 28 novembre"
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
              🏥 Service *
            </label>
            <input
              type="text"
              name="service"
              value={formData.service || ''}
              onChange={handleChange}
              placeholder="Ex: Chirurgie"
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-md font-semibold text-gray-800 dark:text-dark-text">
              Interventions chirurgicales
            </h4>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Plus size={16} />
              Ajouter une intervention
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {(formData.lignes || []).map((ligne, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-gray-700 dark:text-dark-text">
                    Intervention #{index + 1}
                  </span>
                  {(formData.lignes || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">
                      Jour de la semaine
                    </label>
                    <select
                      value={ligne.jour || ''}
                      onChange={(e) => handleLineChange(index, 'jour', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner...</option>
                      {joursOptions.map(jour => (
                        <option key={jour} value={jour}>{jour}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">
                      Nom/Prénom du patient ou de la patiente
                    </label>
                    <input
                      type="text"
                      value={ligne.nomPatient || ''}
                      onChange={(e) => handleLineChange(index, 'nomPatient', e.target.value)}
                      placeholder="Ex: AKWO PRUDENCIA"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">
                      Âge
                    </label>
                    <input
                      type="text"
                      value={ligne.age || ''}
                      onChange={(e) => handleLineChange(index, 'age', e.target.value)}
                      placeholder="Ex: 47 ANS"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">
                      Nature de l'intervention chirurgicale
                    </label>
                    <input
                      type="text"
                      value={ligne.natureIntervention || ''}
                      onChange={(e) => handleLineChange(index, 'natureIntervention', e.target.value)}
                      placeholder="Ex: HRT TOTALE INDIQUEE POUR UTERUS POLYMYOMATEUX"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">
                      Intervenant
                    </label>
                    <input
                      type="text"
                      value={ligne.intervenant || ''}
                      onChange={(e) => handleLineChange(index, 'intervenant', e.target.value)}
                      placeholder="Ex: DR MBOUOPDA"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">
                      N° Salle
                    </label>
                    <input
                      type="text"
                      value={ligne.numeroSalle || ''}
                      onChange={(e) => handleLineChange(index, 'numeroSalle', e.target.value)}
                      placeholder="Ex: 2"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prévisualisation PDF - FORMAT PAYSAGE */}
      <div ref={pdfContainerRef} className="bg-white p-8 shadow-lg" style={{ width: '297mm', minHeight: '210mm' }}>
        {/* En-tête */}
        <div className="text-center mb-6 pb-4 border-b-2 border-black">
          <h1 className="text-2xl font-bold uppercase mb-2">
            PROGRAMME OPÉRATOIRE DE LA SEMAINE {formData.periode ? `${formData.periode.toUpperCase()}` : ''}
          </h1>
          {formData.service && (
            <p className="text-lg font-semibold">Service: {formData.service}</p>
          )}
        </div>

        {/* Tableau des interventions */}
        <table className="w-full border-2 border-black text-xs">
          <thead>
            <tr className="bg-white">
              <th className="border-2 border-black p-2 font-bold text-center uppercase">
                JOUR DE LA<br/>SEMAINE
              </th>
              <th className="border-2 border-black p-2 font-bold text-center uppercase">
                NOM/PRÉNOM DU PATIENT OU<br/>DE LA PATIENTE
              </th>
              <th className="border-2 border-black p-2 font-bold text-center uppercase">
                ÂGE
              </th>
              <th className="border-2 border-black p-2 font-bold text-center uppercase">
                NATURE DE L'INTERVENTION CHIRURGICALE
              </th>
              <th className="border-2 border-black p-2 font-bold text-center uppercase">
                INTERVENANT
              </th>
              <th className="border-2 border-black p-2 font-bold text-center uppercase">
                N° SALLE
              </th>
            </tr>
          </thead>
          <tbody>
            {(formData.lignes || []).map((ligne, index) => {
              // Déterminer si c'est une nouvelle journée (pour le fond jaune)
              const isNewDay = index === 0 || ligne.jour !== formData.lignes[index - 1]?.jour;
              const isYellowRow = ligne.jour && isNewDay;

              return (
                <tr 
                  key={index} 
                  className={isYellowRow ? 'bg-yellow-300' : 'bg-white'}
                >
                  <td className="border-2 border-black p-2 text-center align-top font-bold">
                    {ligne.jour || ''}
                  </td>
                  <td className="border-2 border-black p-2 align-top uppercase">
                    {ligne.nomPatient || ''}
                  </td>
                  <td className="border-2 border-black p-2 text-center align-top">
                    {ligne.age || ''}
                  </td>
                  <td className="border-2 border-black p-2 align-top uppercase">
                    {ligne.natureIntervention || ''}
                  </td>
                  <td className="border-2 border-black p-2 text-center align-top uppercase">
                    {ligne.intervenant || ''}
                  </td>
                  <td className="border-2 border-black p-2 text-center align-top">
                    {ligne.numeroSalle || ''}
                  </td>
                </tr>
              );
            })}
            
            {/* Lignes vides pour compléter le tableau */}
            {(formData.lignes || []).length < 10 && Array.from({ length: 10 - (formData.lignes || []).length }).map((_, i) => (
              <tr key={`empty-${i}`} className="bg-white">
                <td className="border-2 border-black p-2 h-12">&nbsp;</td>
                <td className="border-2 border-black p-2">&nbsp;</td>
                <td className="border-2 border-black p-2">&nbsp;</td>
                <td className="border-2 border-black p-2">&nbsp;</td>
                <td className="border-2 border-black p-2">&nbsp;</td>
                <td className="border-2 border-black p-2">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="mt-12 grid grid-cols-3 gap-8 text-center text-sm">
          <div>
            <div data-sig-zone={1} className="border-b-2 border-gray-400 pb-28 mb-2"></div>
            <p className="font-bold uppercase">Chef de Service<br/>Chirurgie</p>
          </div>
          <div>
            <div data-sig-zone={2} className="border-b-2 border-gray-400 pb-28 mb-2"></div>
            <p className="font-bold uppercase">Directeur des<br/>Soins Infirmiers</p>
          </div>
          <div>
            <div data-sig-zone={3} className="border-b-2 border-gray-400 pb-28 mb-2"></div>
            <p className="font-bold uppercase">Directeur Général</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningOperatoire;