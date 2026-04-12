// frontend/src/components/php/PHPBonPrint.jsx
// Visualisation et impression du bon de prise en charge

import { useRef } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

export default function PHPBonPrint({ bon, patient, onClose }) {
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `BPC-${bon?.numeroBon}`,
  });

  const dateEmission = new Date(bon?.createdAt || bon?.dateEmission).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const heureEmission = bon?.heureEmission || new Date().toTimeString().split(' ')[0].slice(0, 5);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FileText className="text-blue-600" size={20} />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Bon de Prise en Charge généré
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Zone à imprimer */}
        <div className="p-4">
          <div ref={printRef} className="border-2 border-gray-800 rounded-lg p-6 bg-white text-gray-900">
            {/* En-tête hôpital */}
            <div className="text-center mb-4 border-b-2 border-gray-800 pb-3">
              <h1 className="text-lg font-bold uppercase">Hôpital Saint Jean de Malte</h1>
              <p className="text-sm">Protection & Hygiène du Personnel (PHP)</p>
            </div>

            {/* Titre bon */}
            <div className="text-center mb-5">
              <h2 className="text-base font-bold uppercase border border-gray-800 inline-block px-6 py-1">
                BON DE PRISE EN CHARGE
              </h2>
              <p className="text-sm text-gray-600 mt-1">N° <strong className="font-mono">{bon?.numeroBon}</strong></p>
            </div>

            {/* Infos patient */}
            <table className="w-full text-sm mb-4">
              <tbody>
                <tr>
                  <td className="py-1 font-semibold w-40">Matricule :</td>
                  <td className="py-1 font-mono font-bold">{patient?.matricule}</td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold">Nom et Prénoms :</td>
                  <td className="py-1 font-bold uppercase">{patient?.nom} {patient?.prenom || ''}</td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold">Secteur :</td>
                  <td className="py-1">{patient?.secteur?.nom || '–'}</td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold">Infirmerie :</td>
                  <td className="py-1">{patient?.infirmerie?.nom || '–'}</td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold">Service consulté :</td>
                  <td className="py-1 font-semibold">{bon?.serviceDestination || 'Consultation Médicale'}</td>
                </tr>
                {bon?.motifVisite && (
                  <tr>
                    <td className="py-1 font-semibold">Motif :</td>
                    <td className="py-1 italic">{bon.motifVisite}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-1 font-semibold">Date :</td>
                  <td className="py-1">{dateEmission}</td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold">Heure :</td>
                  <td className="py-1">{heureEmission}</td>
                </tr>
              </tbody>
            </table>

            {/* Note importante */}
            <div className="border border-gray-600 rounded p-2 text-xs text-gray-700 mb-4">
              <strong>⚠ Important :</strong> Ce bon est valable uniquement pour la date d'émission.
              Le patient doit se présenter au service indiqué muni de ce document.
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 mt-6">
              <div className="text-center">
                <p className="text-xs font-semibold mb-6">Signature Agent PHP</p>
                <div className="border-t border-gray-400 pt-1 text-xs text-gray-500">
                  {bon?.agentEmetteur ? `${bon.agentEmetteur.firstName} ${bon.agentEmetteur.lastName}` : ''}
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold mb-6">Cachet / Visa Médecin</p>
                <div className="border-t border-gray-400 pt-1 text-xs text-gray-500">&nbsp;</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Fermer
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Printer size={15} />
              Imprimer le bon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
