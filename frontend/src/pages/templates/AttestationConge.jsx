// frontend/src/pages/templates/AttestationConge.jsx
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SignatureFrame, { getImageUrl } from '../../components/SignatureFrame';
import logo from '../../assets/logo-ordre-malte.png';

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

  // Calcul automatique de la date de reprise (date_fin + 1 jour)
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
    <div className="max-w-4xl mx-auto">
      {/* ─── Formulaire de saisie ─── */}
      <div className="bg-white p-6 rounded-lg shadow mb-6 not-printable">
        <h3 className="text-lg font-bold mb-4 text-gray-800">Remplir les informations</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Civilité */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">👤 Civilité *</label>
            <select
              name="civilite"
              value={formData.civilite || 'Monsieur'}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Monsieur">Monsieur</option>
              <option value="Madame">Madame</option>
              <option value="Mademoiselle">Mademoiselle</option>
            </select>
          </div>

          {/* Nom Prénom */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">📋 Nom et Prénom *</label>
            <input
              type="text"
              name="nom_prenom"
              value={formData.nom_prenom || ''}
              onChange={handleChange}
              placeholder="Ex: TCHAKOUNTE Collince"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Fonction */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">💼 Fonction *</label>
            <input
              type="text"
              name="fonction"
              value={formData.fonction || ''}
              onChange={handleChange}
              placeholder="Ex: Médecin Gynécologue-obstétricien"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Service */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">🏢 Service *</label>
            <input
              type="text"
              name="service"
              value={formData.service || ''}
              onChange={handleChange}
              placeholder="Ex: Gynécologie-obstétrique"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Matricule */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">🔢 Matricule *</label>
            <input
              type="text"
              name="matricule"
              value={formData.matricule || ''}
              onChange={handleChange}
              placeholder="Ex: 110345"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Nombre de jours */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Nombre de jours de congé *</label>
            <input
              type="number"
              name="nb_jours"
              value={formData.nb_jours || ''}
              onChange={handleChange}
              min="1"
              placeholder="Ex: 30"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date de début */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Date de début de congé *</label>
            <input
              type="date"
              name="date_debut"
              value={formData.date_debut || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date de fin */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Date de fin de congé *</label>
            <input
              type="date"
              name="date_fin"
              value={formData.date_fin || ''}
              onChange={handleChange}
              min={formData.date_debut || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date de reprise (auto-calculée mais modifiable) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📅 Date de reprise de service
              <span className="text-xs font-normal text-gray-400 ml-1">(calculée automatiquement)</span>
            </label>
            <input
              type="date"
              name="date_reprise"
              value={formData.date_reprise || dateReprise}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date du document */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">📋 Date de l'attestation *</label>
            <input
              type="date"
              name="date_document"
              value={formData.date_document || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* ─── Aperçu PDF ─── */}
      <div ref={pdfContainerRef} className="bg-white shadow-lg relative" style={{ width: '210mm', minHeight: '297mm', padding: '18mm 18mm 20mm 18mm', boxSizing: 'border-box' }}>

        {/* En-tête */}
        <div className="flex items-start justify-between mb-8 pb-3 border-b border-gray-300">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Logo Ordre de Malte"
              className="h-20 object-contain"
            />
          </div>
        </div>

        {/* Titre */}
        <div className="text-center mb-10 mt-4">
          <h1 className="text-xl font-bold uppercase tracking-wide">Attestation</h1>
          <h2 className="text-lg font-bold uppercase tracking-wide">de Départ en Congé Annuel</h2>
        </div>

        {/* Corps du document */}
        <div className="text-sm leading-relaxed space-y-4 mb-8" style={{ fontSize: '12.5px' }}>

          {/* Identité */}
          <p>
            <strong>{formData.civilite || 'Monsieur'} : {formData.nom_prenom || '___________________________'}</strong>
          </p>

          <p>
            Fonction : {formData.fonction || '___________________________'}
          </p>

          <div className="flex gap-16">
            <p>Service : {formData.service || '___________________________'}</p>
            <p>Matricule : {formData.matricule || '_________'}</p>
          </div>

          {/* Texte principal */}
          <p className="mt-6">
            L'intéressé(e) est bénéficiaire d'un congé annuel de{' '}
            <strong>{formData.nb_jours || '___'} jours</strong>{' '}
            qui prend effet à compter du{' '}
            <strong>{formatDate(formData.date_debut)}</strong>{' '}
            et se termine le{' '}
            <strong>{formatDate(formData.date_fin)}</strong>.
          </p>

          <p className="mt-2">
            <strong>
              Il reprendra donc son service le{' '}
              {formatDate(formData.date_reprise || dateReprise)}{' '}
              à l'heure habituelle.
            </strong>
          </p>

          <p className="mt-6">Fait pour servir et valoir ce que de droit.</p>
        </div>

        {/* Date et signature */}
        <div className="flex flex-col items-end mt-10 mr-4">
          <p className="text-sm mb-6">
            Njombé, le {formData.date_document ? formatDate(formData.date_document) : '___/___/_____'}
          </p>
          <div className="w-52">
            <SignatureFrame
              label="Le Directeur Général"
              signatureUrl={null}
              stampUrl={null}
              zoneIndex={1}
            />
          </div>
        </div>

        {/* Pied de page */}
        <div className="absolute bottom-6 left-0 right-0 px-8 text-center border-t border-gray-200 pt-2">
          <p className="text-[9px] text-gray-500">Hôpital Saint-Jean de Malte — Tél : 00 (237)6 57 56 91 03 — e-mail : hopital.cameroun@ordredemaltefrance.org</p>
          <p className="text-[9px] text-gray-500">Dépendant des œuvres Hospitalières Françaises de l'ordre de malte, association BP 56 – Njombé-Cameroun reconnue d'utilité publique</p>
          <p className="text-[9px] text-gray-500">en partenariat avec le Ministère de la Santé Publique, et avec les plantations du groupe PHP</p>
        </div>

      </div>
    </div>
  );
};

export default AttestationConge;
