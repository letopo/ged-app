// frontend/src/pages/templates/OrdreDeMission.jsx
import React, { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';
import logo from '../../assets/logo-ordre-malte.png';

const OrdreDeMission = ({ formData, setFormData, pdfContainerRef }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userServiceResponse = await usersAPI.getMyService();
        if (userServiceResponse.data.success && userServiceResponse.data.service) {
          setFormData(prev => ({
            ...prev,
            service_demandeur: userServiceResponse.data.service.name
          }));
        }
      } catch (error) {
        console.error('Erreur chargement données utilisateur:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [setFormData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Générer le numéro automatiquement
  const generateOrderNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000);
    return `${random}/OM/DIR/HSJM/${month}/${day}/${year}`;
  };

  useEffect(() => {
    if (!formData.numero_ordre) {
      setFormData(prev => ({
        ...prev,
        numero_ordre: generateOrderNumber()
      }));
    }
  }, []);

  // Style pour les champs statiques (pour PDF)
  const staticFieldStyle = {
    borderBottom: '1px solid #000',
    padding: '4px 8px',
    minHeight: '30px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#000000',
    lineHeight: '1.5'
  };

  return (
    <div 
      ref={pdfContainerRef} 
      className="bg-white p-8 shadow-lg mx-auto relative" 
      style={{ 
        width: '210mm', 
        minHeight: '297mm', 
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px'
      }}
    >
      {/* En-tête */}
      <div className="flex items-start justify-between mb-8">
        <img src={logo} alt="Logo Ordre de Malte" style={{ width: '180px', height: 'auto' }} />
      </div>

      {/* Titre */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold border-2 border-black py-2">
          ORDRE DE MISSION
        </h1>
      </div>

      {/* Numéro d'ordre */}
      <div className="text-center mb-8">
        <div className="inline-block">
          <label className="font-semibold mr-2">N°</label>
          {/* Input pour édition */}
          <input
            name="numero_ordre"
            value={formData.numero_ordre || ''}
            onChange={handleChange}
            className="not-printable border-b-2 border-gray-400 px-2 py-1 text-center"
            style={{ width: '400px', fontSize: '16px' }}
            placeholder="/OM/DIR/HSJM/  /  /20__"
          />
          {/* Texte statique pour PDF */}
          <span className="print-only" style={{ ...staticFieldStyle, display: 'none' }}>
            {formData.numero_ordre || '\u00A0'}
          </span>
        </div>
      </div>

      {/* Zone d'édition pour les dates et informations (cachée lors de la génération PDF) */}
      <div className="not-printable mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded">
        <h3 className="font-bold text-blue-900 mb-4">📝 Remplir les informations</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Date (A/R)</label>
            <input
              type="date"
              name="date_mission"
              value={formData.date_mission || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Service Demandeur</label>
            <input
              name="service_demandeur"
              value={formData.service_demandeur || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="Service"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Objet de la mission</label>
            <textarea
              name="objet_mission"
              value={formData.objet_mission || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500"
              rows="2"
              placeholder="Description de la mission..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nom du Conducteur</label>
            <input
              name="nom_conducteur"
              value={formData.nom_conducteur || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nom du Missionnaire</label>
            <input
              name="nom_missionnaire"
              value={formData.nom_missionnaire || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Immatriculation du véhicule</label>
            <input
              name="immat_vehicule"
              value={formData.immat_vehicule || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              name="frais_mission"
              checked={formData.frais_mission || false}
              onChange={handleChange}
              className="w-4 h-4"
            />
            Ouvre droit aux frais de mission (OUI) / Imputation budgétaire
          </label>
        </div>
      </div>

      {/* Tableau */}
      <table className="w-full border-collapse border-2 border-black mb-8" style={{ fontSize: '13px' }}>
        <thead>
          <tr className="bg-gray-100">
            <th className="border-2 border-black p-2 text-center font-bold">
              DATE<br/>(A/R)
            </th>
            <th className="border-2 border-black p-2 text-center font-bold">
              OBJET DE LA MISSION<br/>SERVICE DEMANDEUR
            </th>
            <th className="border-2 border-black p-2 text-center font-bold">
              NOM DU<br/>CONDUCTEUR
            </th>
            <th className="border-2 border-black p-2 text-center font-bold">
              NOM DU<br/>MISSIONNAIRE
            </th>
            <th className="border-2 border-black p-2 text-center font-bold">
              IMMAT. DU VEHICULE
            </th>
            <th className="border-2 border-black p-2 text-center font-bold">
              OUVRE DROIT AUX FRAIS DE<br/>MISSION (OUI OU NON) /<br/>IMPUTATION BUDGETAIRE
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border-2 border-black p-4 text-center" style={{ minHeight: '120px', verticalAlign: 'top' }}>
              {formData.date_mission ? new Date(formData.date_mission).toLocaleDateString('fr-FR') : '\u00A0'}
            </td>
            <td className="border-2 border-black p-4" style={{ verticalAlign: 'top' }}>
              {formData.objet_mission || '\u00A0'}
            </td>
            <td className="border-2 border-black p-4 text-center" style={{ verticalAlign: 'top' }}>
              {formData.nom_conducteur || '\u00A0'}
            </td>
            <td className="border-2 border-black p-4 text-center" style={{ verticalAlign: 'top' }}>
              {formData.nom_missionnaire || '\u00A0'}
            </td>
            <td className="border-2 border-black p-4 text-center" style={{ verticalAlign: 'top' }}>
              {formData.immat_vehicule || '\u00A0'}
            </td>
            <td className="border-2 border-black p-4 text-center" style={{ verticalAlign: 'top' }}>
              {formData.frais_mission ? 'OUI' : 'NON'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signatures */}
      <div className="grid grid-cols-4 gap-8 mt-16" style={{ fontSize: '13px' }}>
        <div className="text-center border-t-2 border-black pt-2">
          <p className="font-bold">SIGNATURE</p>
          <p className="font-bold">SERVICE DEMANDEUR</p>
        </div>
        <div className="text-center border-t-2 border-black pt-2">
          <p className="font-bold">SIGNATURE D.D.S</p>
          <p className="text-xs">(POUR VHL SANITAIRE)</p>
        </div>
        <div className="text-center border-t-2 border-black pt-2">
          <p className="font-bold">SIGNATURE D.S</p>
        </div>
        <div className="text-center border-t-2 border-black pt-2">
          <p className="font-bold">VALIDATION DIRECTEUR</p>
        </div>
      </div>
    </div>
  );
};

export default OrdreDeMission;