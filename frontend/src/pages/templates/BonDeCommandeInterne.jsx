// frontend/src/pages/templates/BonDeCommandeInterne.jsx

import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Users } from 'lucide-react';
import logo from '../../assets/logo-ordre-malte.png';
import { usersAPI, servicesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';

// Wrapper pour gérer la prop `active` (non supportée par le composant partagé)
const ConditionalSignatureFrame = ({ active, ...props }) => {
  if (!active) return null;
  return <SignatureFrame {...props} />;
};

// ─────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────
const BonDeCommandeInterne = ({ formData, setFormData, pdfContainerRef }) => {
  const { user } = useAuth();
  const [services, setServices] = useState([]);

  // URL signature/cachet de l'utilisateur connecté (Demandeur)
  const demandeurSignatureUrl = getImageUrl(user?.signaturePath);
  const demandeurStampUrl     = getImageUrl(user?.stampPath);

  const nbSignataires = formData.nbSignataires || 3;

  // Initialisation
  useEffect(() => {
    const init = async () => {
      try {
        const servicesRes = await servicesAPI.getAll();
        setServices(servicesRes.data.data || servicesRes.data || []);

        const userRes = await usersAPI.getMyService();
        if (userRes.data.success && userRes.data.service) {
          setFormData(prev => ({
            ...prev,
            serviceDemandeur: prev.serviceDemandeur || userRes.data.service.name,
          }));
        }
      } catch (err) {
        console.error('Erreur chargement services:', err);
      }

      setFormData(prev => ({
        ...prev,
        date:           prev.date  || new Date().toISOString().split('T')[0],
        nbSignataires:  prev.nbSignataires  || 3,
        lines:          prev.lines || [{ no: 1, designation: '', quantite: '', observation: '' }],
      }));
    };
    init();
  }, []);

  // Handlers
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
    setFormData({
      ...formData,
      lines: [...lines, { no: lines.length + 1, designation: '', quantite: '', observation: '' }],
    });
  };

  const removeLine = (index) => {
    const newLines = formData.lines
      .filter((_, i) => i !== index)
      .map((line, i) => ({ ...line, no: i + 1 }));
    setFormData({ ...formData, lines: newLines });
  };

  const lines = formData.lines || [];

  return (
    <div
      ref={pdfContainerRef}
      className="bg-white p-8 mx-auto text-sm"
      style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}
    >
      {/* ── EN-TÊTE ── */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <img src={logo} alt="Logo HSJM" className="h-16 object-contain" />
        </div>
        <div className="text-center flex-1">
          <h1 className="text-xl font-bold uppercase tracking-wide">BON DE COMMANDE INTERNE</h1>
        </div>
        <div className="text-right">
          <div className="font-bold text-sm mb-1">Date du jour :</div>
          <input
            type="date"
            name="date"
            value={formData.date || ''}
            onChange={handleChange}
            className="not-printable border p-1 rounded text-sm"
          />
          <span className="print-only text-sm">
            {formData.date ? new Date(formData.date).toLocaleDateString('fr-FR') : ''}
          </span>
        </div>
      </div>

      {/* ── SERVICE DEMANDEUR ── */}
      <div className="mb-6 flex items-center gap-2">
        <span className="font-bold whitespace-nowrap">Service Demandeur :</span>
        <select
          name="serviceDemandeur"
          value={formData.serviceDemandeur || ''}
          onChange={handleChange}
          className="not-printable border border-gray-300 rounded px-2 py-1 text-sm flex-1 max-w-xs outline-none"
        >
          <option value="">-- Sélectionner un service --</option>
          {services.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
          {formData.serviceDemandeur && !services.find(s => s.name === formData.serviceDemandeur) && (
            <option value={formData.serviceDemandeur}>{formData.serviceDemandeur}</option>
          )}
        </select>
        <span className="print-only font-normal">{formData.serviceDemandeur}</span>
      </div>

      {/* ── TABLEAU ── */}
      <table className="w-full border-collapse border border-black mb-4 text-sm">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left font-bold w-12">No</th>
            <th className="border border-black p-2 text-left font-bold">Désignation</th>
            <th className="border border-black p-2 text-left font-bold w-28">Quatité</th>
            <th className="border border-black p-2 text-left font-bold w-40">Observation</th>
            <th className="border border-black p-1 w-8 not-printable"></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={index}>
              <td className="border border-black p-1 text-center">{line.no}</td>
              <td className="border border-black p-1">
                <input value={line.designation} onChange={(e) => handleLineChange(index, 'designation', e.target.value)}
                  className="not-printable w-full outline-none text-sm" placeholder="Article / fourniture..." />
                <span className="print-only">{line.designation}</span>
              </td>
              <td className="border border-black p-1">
                <input value={line.quantite} onChange={(e) => handleLineChange(index, 'quantite', e.target.value)}
                  className="not-printable w-full outline-none text-sm text-center" placeholder="0" />
                <span className="print-only text-center block">{line.quantite}</span>
              </td>
              <td className="border border-black p-1">
                <input value={line.observation} onChange={(e) => handleLineChange(index, 'observation', e.target.value)}
                  className="not-printable w-full outline-none text-sm" placeholder="..." />
                <span className="print-only">{line.observation}</span>
              </td>
              <td className="border border-black p-1 text-center not-printable">
                {lines.length > 1 && (
                  <button onClick={() => removeLine(index)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={14} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={addLine}
        className="not-printable mb-8 flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-800 text-sm">
        <PlusCircle size={16} /> Ajouter une ligne
      </button>

      {/* ── SÉLECTEUR NOMBRE DE SIGNATAIRES (non imprimé) ── */}
      <div className="not-printable flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <Users size={16} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-600">Nombre de signataires :</span>
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            onClick={() => setFormData(prev => ({ ...prev, nbSignataires: n }))}
            className={`px-4 py-1 rounded-full border text-sm font-bold transition-all ${
              nbSignataires === n
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-500'
            }`}
          >
            {n}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-1">
          {nbSignataires === 1 ? '(Demandeur uniquement)' : nbSignataires === 2 ? '(Demandeur + Acheteur)' : '(Demandeur + Acheteur + DS)'}
        </span>
      </div>

      {/* ── ZONES DE SIGNATURE ── */}
      <div className="border-t-2 border-black pt-4 mt-2">
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: `repeat(${nbSignataires}, 1fr)` }}
        >
          {/* Demandeur — toujours présent, signature pré-chargée, zone 1 */}
          <ConditionalSignatureFrame
            label="Demandeur"
            signatureUrl={demandeurSignatureUrl}
            stampUrl={demandeurStampUrl}
            active={true}
            zoneIndex={1}
          />

          {/* Acheteur — si >= 2 signataires, zone 2 */}
          <ConditionalSignatureFrame
            label="Acheteur"
            signatureUrl={null}
            stampUrl={null}
            active={nbSignataires >= 2}
            zoneIndex={2}
          />

          {/* DS — si 3 signataires, zone 3 */}
          <ConditionalSignatureFrame
            label="DS"
            signatureUrl={null}
            stampUrl={null}
            active={nbSignataires >= 3}
            zoneIndex={3}
          />
        </div>
      </div>

      {/* ── PIED DE PAGE ── */}
      <div className="text-center text-xs text-gray-400 mt-6">
        Hôpital Saint Jean de Malte - Njombé | Document généré automatiquement
      </div>
    </div>
  );
};

export default BonDeCommandeInterne;
