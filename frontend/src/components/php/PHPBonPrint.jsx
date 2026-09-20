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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 512 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} style={{ color: 'var(--brand)' }} />
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>
              Bon de Prise en Charge généré
            </h2>
          </div>
          <button onClick={onClose} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', borderRadius: 'var(--radius-2)', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Zone à imprimer */}
        <div style={{ padding: 16 }}>
          <div ref={printRef} style={{ border: '2px solid #1f2937', borderRadius: 8, padding: 24, background: '#ffffff', color: '#111827' }}>
            {/* En-tête hôpital */}
            <div style={{ textAlign: 'center', marginBottom: 16, borderBottom: '2px solid #1f2937', paddingBottom: 12 }}>
              <h1 style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 4px' }}>Hôpital Saint Jean de Malte</h1>
              <p style={{ fontSize: 13, margin: 0 }}>Protection & Hygiène du Personnel (PHP)</p>
            </div>

            {/* Titre bon */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', border: '1px solid #1f2937', display: 'inline-block', padding: '4px 24px', margin: '0 0 4px' }}>
                BON DE PRISE EN CHARGE
              </h2>
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>N° <strong style={{ fontFamily: 'monospace' }}>{bon?.numeroBon}</strong></p>
            </div>

            {/* Infos patient */}
            <table style={{ width: '100%', fontSize: 13, marginBottom: 16 }}>
              <tbody>
                <tr><td style={{ padding: '3px 0', fontWeight: 600, width: 160 }}>Matricule :</td><td style={{ padding: '3px 0', fontFamily: 'monospace', fontWeight: 700 }}>{patient?.matricule}</td></tr>
                <tr><td style={{ padding: '3px 0', fontWeight: 600 }}>Nom et Prénoms :</td><td style={{ padding: '3px 0', fontWeight: 700, textTransform: 'uppercase' }}>{patient?.nom} {patient?.prenom || ''}</td></tr>
                <tr><td style={{ padding: '3px 0', fontWeight: 600 }}>Secteur :</td><td style={{ padding: '3px 0' }}>{patient?.secteur?.nom || '–'}</td></tr>
                <tr><td style={{ padding: '3px 0', fontWeight: 600 }}>Infirmerie :</td><td style={{ padding: '3px 0' }}>{patient?.infirmerie?.nom || '–'}</td></tr>
                <tr><td style={{ padding: '3px 0', fontWeight: 600 }}>Service consulté :</td><td style={{ padding: '3px 0', fontWeight: 600 }}>{bon?.serviceDestination || 'Consultation Médicale'}</td></tr>
                {bon?.motifVisite && (
                  <tr><td style={{ padding: '3px 0', fontWeight: 600 }}>Motif :</td><td style={{ padding: '3px 0', fontStyle: 'italic' }}>{bon.motifVisite}</td></tr>
                )}
                <tr><td style={{ padding: '3px 0', fontWeight: 600 }}>Date :</td><td style={{ padding: '3px 0' }}>{dateEmission}</td></tr>
                <tr><td style={{ padding: '3px 0', fontWeight: 600 }}>Heure :</td><td style={{ padding: '3px 0' }}>{heureEmission}</td></tr>
              </tbody>
            </table>

            {/* Note importante */}
            <div style={{ border: '1px solid #6b7280', borderRadius: 4, padding: 8, fontSize: 11, color: '#374151', marginBottom: 16 }}>
              <strong>⚠ Important :</strong> Ce bon est valable uniquement pour la date d'émission.
              Le patient doit se présenter au service indiqué muni de ce document.
            </div>

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 24 }}>Signature Agent PHP</p>
                <div style={{ borderTop: '1px solid #9ca3af', paddingTop: 4, fontSize: 11, color: '#6b7280' }}>
                  {bon?.agentEmetteur ? `${bon.agentEmetteur.firstName} ${bon.agentEmetteur.lastName}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 24 }}>Cachet / Visa Médecin</p>
                <div style={{ borderTop: '1px solid #9ca3af', paddingTop: 4, fontSize: 11, color: '#6b7280' }}>&nbsp;</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              onClick={onClose}
              style={{ flex: 1, padding: '8px 16px', fontSize: 13, border: '1px solid var(--border)', color: 'var(--fg)', background: 'var(--surface-2)', borderRadius: 'var(--radius-2)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
            >
              Fermer
            </button>
            <button
              onClick={handlePrint}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 16px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-active)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
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
