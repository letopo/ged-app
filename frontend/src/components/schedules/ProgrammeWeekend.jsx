// frontend/src/components/schedules/ProgrammeWeekend.jsx
// Programme du week-end, présenté comme le modèle papier de l'hôpital
// (« WEEKEND DU 21/08/26 AU 23/08/2026 ») : en-tête Direction, tableau
// services × vendredi nuit → dimanche nuit, signatures DDS / Directeur médical / DG.
// Toujours en noir sur blanc (impression, PDF), quel que soit le thème.
import React from 'react';
import scheduleService from '../../services/scheduleService';

export const PROGRAMME_LARGEUR = 1123; // A4 paysage à 96 dpi

const SIGNATAIRES = [
  { role: 'dds', label: 'Directrice des Soins' },
  { role: 'medical_chief', label: 'Directeur Médical' },
  { role: 'dg', label: 'Directeur général' },
];

const bord = '1px solid #000';
// Hauteurs de ligne fixes : sans elles, html2canvas (PDF) décale le texte sur les traits
const th = { border: bord, padding: '3px 6px', fontWeight: 700, textAlign: 'center', fontSize: 13, lineHeight: '17px', verticalAlign: 'middle' };
const td = { border: bord, padding: '3px 6px', textAlign: 'center', fontSize: 13, lineHeight: '17px', verticalAlign: 'middle', textTransform: 'uppercase' };

export default function ProgrammeWeekend({ schedule, content, validations = [] }) {
  const { jours, du, au } = scheduleService.programmeJours(schedule);
  const entete = content?.entete || {};
  const signature = (role) => validations.find((v) => v.validatorRole === role && v.status === 'approved' && v.validator)?.validator;

  return (
    <div style={{ width: PROGRAMME_LARGEUR, background: '#fff', color: '#000', fontFamily: '"Times New Roman", Times, serif', lineHeight: 1.35, padding: '18px 28px', boxSizing: 'border-box' }}>
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
        WEEKEND DU {du} AU {au}
      </div>

      {/* En-tête : Direction à gauche, responsables du week-end à droite */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, fontSize: 13, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 28 }}>
          <div style={{ fontWeight: 700, textDecoration: 'underline', whiteSpace: 'nowrap' }}>Direction :</div>
          <div>
            {(entete.direction || []).map((e, i) => (
              <div key={i}>{e.label}{e.label && e.valeur ? ' : ' : ''}{e.valeur}</div>
            ))}
            {entete.superviseurManagement && (
              <div style={{ marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>SUPERVISEUR MANAGEMENT : </span>
                <b>{entete.superviseurManagement}</b>
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          {(entete.responsables || []).map((e, i) => (
            <div key={i}>{e.label}{e.label && e.valeur ? ' : ' : ''}{e.valeur}</div>
          ))}
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 170 }} />
          {[0, 1, 2, 3, 4].map((i) => <col key={i} />)}
        </colgroup>
        <thead>
          <tr>
            <th style={{ border: 'none' }} />
            {jours.map((j) => (
              <th key={j.nom} colSpan={j.creneaux.length} style={th}>{j.nom} {j.date}</th>
            ))}
          </tr>
          <tr>
            <th style={{ border: 'none' }} />
            {jours.flatMap((j) => j.creneaux.map((c) => <th key={`${j.nom}-${c}`} style={th}>{c}</th>))}
          </tr>
        </thead>
        <tbody>
          {(content?.services || []).map((s, si) => s.lignes.map((ligne, li) => (
            <tr key={`${si}-${li}`}>
              {li === 0 && (
                <td rowSpan={s.lignes.length} style={{ ...td, fontWeight: 700, fontSize: 14, position: 'relative' }}>
                  {s.nom}
                  {s.astreinte && <div style={{ fontSize: 9, fontWeight: 400, textTransform: 'none' }}>(astreinte)</div>}
                </td>
              )}
              {ligne.map((c, ci) => (c.span > 0 ? (
                <td key={ci} colSpan={c.span} style={{ ...td, ...(c.texte.length > 22 && c.span === 1 ? { fontSize: 10, lineHeight: '17px' } : {}) }}>{c.texte}</td>
              ) : null))}
            </tr>
          )))}
        </tbody>
      </table>

      {/* Signatures : cadres mesurés pour le PDF (data-sig-zone = ordre du circuit) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        {SIGNATAIRES.map((sig, i) => {
          const v = signature(sig.role);
          return (
            <div key={sig.role} style={{ width: 260, textAlign: 'center' }}>
              <div data-sig-zone={i + 1} style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {v?.signaturePath && <img src={`/api/${v.signaturePath}`} alt="" style={{ maxHeight: 76, objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />}
                {v?.stampPath && <img src={`/api/${v.stampPath}`} alt="" style={{ maxHeight: 76, objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />}
              </div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{sig.label}</div>
              {v && <div style={{ fontSize: 11 }}>{v.firstName} {v.lastName}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
