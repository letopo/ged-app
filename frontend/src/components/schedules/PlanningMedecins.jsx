// frontend/src/components/schedules/PlanningMedecins.jsx
// Affichage du planning des médecins (modèle papier « ASTREINTES ET CONSULTATIONS
// DES MEDECINS ») pour les pages détail et validation. Noir sur blanc.
import React from 'react';
import scheduleService from '../../services/scheduleService';

const bord = '1px solid #000';
const noms = (t) => String(t || '').split('/').map((x) => x.trim()).filter(Boolean);

export default function PlanningMedecins({ schedule, tableau }) {
  const jours = scheduleService.joursDuMois(schedule.year, schedule.month);
  const cell = { border: bord, padding: '2px 3px', textAlign: 'center', fontSize: 11, verticalAlign: 'middle' };
  return (
    <div style={{ background: '#fff', color: '#000', padding: 12, minWidth: 1100, fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
        ASTREINTES ET CONSULTATIONS DES MEDECINS — {scheduleService.getMonthName(schedule.month).toUpperCase()} {schedule.year}
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <colgroup><col style={{ width: 150 }} /><col style={{ width: 110 }} />{jours.map((j) => <col key={j.jour} />)}</colgroup>
        <thead>
          <tr>
            <th rowSpan={2} style={{ ...cell, fontSize: 13 }}>Services*</th>
            <th rowSpan={2} style={{ ...cell, fontSize: 9 }}>Superviseurs services<br />Lundi - vendredi</th>
            {jours.map((j) => <th key={j.jour} style={cell}>{j.lettre}</th>)}
          </tr>
          <tr>{jours.map((j) => <th key={j.jour} style={cell}>{j.jour}</th>)}</tr>
        </thead>
        <tbody>
          {(tableau?.lignes || []).map((l, i) => (
            <tr key={i}>
              <td style={{ ...cell, fontWeight: 700, fontSize: 10 }}>{l.nom}</td>
              <td style={{ ...cell, fontWeight: 700, background: l.superviseurGrise ? '#bfbfbf' : undefined }}>{noms(l.superviseur).map((n) => <div key={n}>{n}</div>)}</td>
              {l.cases.map((c) => (
                <td key={c.debut} colSpan={c.fin - c.debut + 1} style={{ ...cell, background: c.grise ? '#bfbfbf' : undefined }}>
                  {noms(c.texte).map((n, k) => <div key={k}>{n}</div>)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {(tableau?.notes || []).map((n, i) => <div key={i} style={{ fontSize: 12, marginTop: 4, fontWeight: i > 0 || /^N\.?B/i.test(n) ? 700 : 400 }}>{n}</div>)}
    </div>
  );
}
