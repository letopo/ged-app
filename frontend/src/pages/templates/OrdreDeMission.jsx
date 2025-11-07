const OrdreDeMission = ({ formData, setFormData, pdfContainerRef }) => {
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Formulaire de saisie */}
      <div className="bg-white p-6 rounded-lg shadow mb-6 not-printable">
        <h3 className="text-lg font-bold mb-4 text-gray-800">Remplir les informations</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ✅ MODIFIÉ : Deux champs de date séparés */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📅 Date de Départ *
            </label>
            <input
              type="date"
              name="date_depart"
              value={formData.date_depart || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📅 Date de Retour *
            </label>
            <input
              type="date"
              name="date_retour"
              value={formData.date_retour || ''}
              onChange={handleChange}
              min={formData.date_depart || ''} // ✅ La date de retour doit être après le départ
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🏢 Service Demandeur *
            </label>
            <input
              type="text"
              name="service_demandeur"
              value={formData.service_demandeur || ''}
              onChange={handleChange}
              placeholder="Ex: Direction"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📋 Numéro d'Ordre
            </label>
            <input
              type="text"
              name="numero_ordre"
              value={formData.numero_ordre || ''}
              onChange={handleChange}
              placeholder="Ex: OM-2025-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📝 Objet de la Mission *
            </label>
            <textarea
              name="objet_mission"
              value={formData.objet_mission || ''}
              onChange={handleChange}
              placeholder="Décrivez l'objet de la mission..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              👤 Nom du Missionnaire *
            </label>
            <input
              type="text"
              name="nom_missionnaire"
              value={formData.nom_missionnaire || ''}
              onChange={handleChange}
              placeholder="Nom complet"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🚗 Nom du Conducteur *
            </label>
            <input
              type="text"
              name="nom_conducteur"
              value={formData.nom_conducteur || ''}
              onChange={handleChange}
              placeholder="Nom complet"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🚙 Immatriculation du Véhicule *
            </label>
            <input
              type="text"
              name="immat_vehicule"
              value={formData.immat_vehicule || ''}
              onChange={handleChange}
              placeholder="Ex: AB-123-CD"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="frais_mission"
              checked={formData.frais_mission || false}
              onChange={handleChange}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label className="ml-3 text-sm font-semibold text-gray-700">
              💰 Ouvre droit aux frais de mission (OUI) / Imputation budgétaire
            </label>
          </div>
        </div>
      </div>

      {/* Prévisualisation PDF */}
      <div ref={pdfContainerRef} className="bg-white p-8 shadow-lg" style={{ width: '210mm', minHeight: '297mm' }}>
        {/* En-tête */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-800">
          <div className="flex items-center gap-4">
            <img 
              src="/logo-hopital.png" 
              alt="Logo" 
              className="w-16 h-16 object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div>
              <p className="text-xs font-bold uppercase">Office de Malte</p>
              <p className="text-[10px]">Hôpital Saint Jean de Malte</p>
              <p className="text-[10px]">BP 15 Njombé - Littoral - Cameroun</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold text-red-700 uppercase">Ordre de Mission</h1>
            <p className="text-xs text-gray-600 mt-1">Hôpital Saint Jean de Malte</p>
            {formData.numero_ordre && (
              <p className="text-xs font-semibold mt-2">N° {formData.numero_ordre}</p>
            )}
          </div>
        </div>

        {/* Formulaire principal */}
        <div className="mb-6">
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-600 rounded">
            <h2 className="text-sm font-bold text-center">✏️ Remplir les informations</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* ✅ MODIFIÉ : Affichage des deux dates */}
            <div className="border-2 border-gray-800 p-3">
              <p className="text-xs font-bold mb-2">📅 Date de Départ (A)</p>
              <p className="text-sm font-semibold border-b-2 border-dotted border-gray-400 pb-1 min-h-[24px]">
                {formData.date_depart ? new Date(formData.date_depart).toLocaleDateString('fr-FR') : '___/___/_____'}
              </p>
            </div>

            <div className="border-2 border-gray-800 p-3">
              <p className="text-xs font-bold mb-2">📅 Date de Retour (R)</p>
              <p className="text-sm font-semibold border-b-2 border-dotted border-gray-400 pb-1 min-h-[24px]">
                {formData.date_retour ? new Date(formData.date_retour).toLocaleDateString('fr-FR') : '___/___/_____'}
              </p>
            </div>

            <div className="border-2 border-gray-800 p-3">
              <p className="text-xs font-bold mb-2">🏢 Service Demandeur</p>
              <p className="text-sm font-semibold border-b-2 border-dotted border-gray-400 pb-1 min-h-[24px]">
                {formData.service_demandeur || '_____________________'}
              </p>
            </div>

            <div className="border-2 border-gray-800 p-3">
              <p className="text-xs font-bold mb-2">👤 Nom du Missionnaire</p>
              <p className="text-sm font-semibold border-b-2 border-dotted border-gray-400 pb-1 min-h-[24px]">
                {formData.nom_missionnaire || '_____________________'}
              </p>
            </div>
          </div>

          <div className="border-2 border-gray-800 p-3 mb-4">
            <p className="text-xs font-bold mb-2">📝 Objet de la Mission</p>
            <div className="min-h-[60px] text-sm border-b-2 border-dotted border-gray-400 pb-2">
              {formData.objet_mission || '__________________________________________'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border-2 border-gray-800 p-3">
              <p className="text-xs font-bold mb-2">🚗 Nom du Conducteur</p>
              <p className="text-sm font-semibold border-b-2 border-dotted border-gray-400 pb-1 min-h-[24px]">
                {formData.nom_conducteur || '_____________________'}
              </p>
            </div>

            <div className="border-2 border-gray-800 p-3">
              <p className="text-xs font-bold mb-2">🚙 Immatriculation du Véhicule</p>
              <p className="text-sm font-semibold border-b-2 border-dotted border-gray-400 pb-1 min-h-[24px]">
                {formData.immat_vehicule || '_____________________'}
              </p>
            </div>
          </div>

          <div className="border-2 border-gray-800 p-3">
            <p className="text-xs font-bold mb-2">
              💰 Ouvre droit aux frais de mission (OUI) / Imputation budgétaire
            </p>
            <p className="text-sm font-semibold">
              {formData.frais_mission ? 'OUI' : 'NON'}
            </p>
          </div>
        </div>

        {/* Tableau récapitulatif */}
        <div className="mb-6">
          <table className="w-full border-2 border-gray-800 text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-800 p-2 font-bold">DATE (A/R)</th>
                <th className="border border-gray-800 p-2 font-bold">OBJET DE LA MISSION<br/>SERVICE DEMANDEUR</th>
                <th className="border border-gray-800 p-2 font-bold">NOM DU<br/>CONDUCTEUR</th>
                <th className="border border-gray-800 p-2 font-bold">NOM DU<br/>MISSIONNAIRE</th>
                <th className="border border-gray-800 p-2 font-bold">IMMAT. DU<br/>VÉHICULE</th>
                <th className="border border-gray-800 p-2 font-bold">MISSION (OUI OU NON) /<br/>IMPUTATION BUDGÉTAIRE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {/* ✅ MODIFIÉ : Afficher les deux dates dans le tableau */}
                <td className="border border-gray-800 p-2 text-center align-top">
                  {formData.date_depart && formData.date_retour ? (
                    <>
                      <div className="font-semibold">A: {new Date(formData.date_depart).toLocaleDateString('fr-FR')}</div>
                      <div className="font-semibold mt-1">R: {new Date(formData.date_retour).toLocaleDateString('fr-FR')}</div>
                    </>
                  ) : (
                    <div className="text-gray-400">___/___/_____</div>
                  )}
                </td>
                <td className="border border-gray-800 p-2 align-top">
                  <div className="font-semibold">{formData.objet_mission || ''}</div>
                  <div className="text-[10px] text-gray-600 mt-1">{formData.service_demandeur || ''}</div>
                </td>
                <td className="border border-gray-800 p-2 text-center align-top">{formData.nom_conducteur || ''}</td>
                <td className="border border-gray-800 p-2 text-center align-top">{formData.nom_missionnaire || ''}</td>
                <td className="border border-gray-800 p-2 text-center align-top">{formData.immat_vehicule || ''}</td>
                <td className="border border-gray-800 p-2 text-center align-top font-semibold">
                  {formData.frais_mission ? 'OUI' : 'NON'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="mt-8 grid grid-cols-4 gap-4 text-center text-xs">
          <div>
            <div className="border-b-2 border-gray-400 pb-16 mb-2"></div>
            <p className="font-bold uppercase">Signature<br/>Service Demandeur</p>
          </div>
          <div>
            <div className="border-b-2 border-gray-400 pb-16 mb-2"></div>
            <p className="font-bold uppercase">Signature D.D.S<br/>(pour VHL Sanitaire)</p>
          </div>
          <div>
            <div className="border-b-2 border-gray-400 pb-16 mb-2"></div>
            <p className="font-bold uppercase">Signature D.S</p>
          </div>
          <div>
            <div className="border-b-2 border-gray-400 pb-16 mb-2"></div>
            <p className="font-bold uppercase">Validation Directeur</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdreDeMission;