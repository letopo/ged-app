// frontend/src/components/schedules/PlanningMedecinsEdit.jsx
// Saisie du planning des médecins (modèle papier « ASTREINTES ET CONSULTATIONS
// DES MEDECINS ») : une ligne par astreinte / service, son superviseur du lundi
// au vendredi, des cases par période (semaine, week-end) que l'on peut
// fusionner, redécouper ou griser ; notes en bas. Repris du mois précédent.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import scheduleService from '../../services/scheduleService';
import { construirePlanningMedecinsPdf } from './planningMedecinsPdf';

const clone = (x) => JSON.parse(JSON.stringify(x));
const input = { width: '100%', boxSizing: 'border-box', padding: '3px 4px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--surface)', color: 'var(--fg)', fontSize: 12 };
const petit = { padding: '0 5px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--fg-muted)', cursor: 'pointer', lineHeight: 1.5 };
const bouton = (fond, couleur = '#fff') => ({ padding: '8px 16px', border: 'none', borderRadius: 'var(--radius-2)', background: fond, color: couleur, fontSize: 14, fontWeight: 500, cursor: 'pointer' });

export default function PlanningMedecinsEdit({ schedule, employees = [] }) {
  const navigate = useNavigate();
  const [tableau, setTableau] = useState(() => clone(schedule.content.tableau));
  const [modifie, setModifie] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const jours = scheduleService.joursDuMois(schedule.year, schedule.month);
  const periodes = scheduleService.periodesDuMois(schedule.year, schedule.month);
  const maj = (fn) => { setTableau((prev) => { const n = clone(prev); fn(n); return n; }); setModifie(true); };

  // Suggestions : médecins de la liste du personnel (« Dr NOM »)
  const suggestions = useMemo(() => [...new Set(employees.map((e) => String(e.lastName || '').trim().toUpperCase()).filter(Boolean))]
    .sort().map((n) => `Dr ${n}`), [employees]);

  const fusionner = (li, ci) => maj((t) => {
    const cs = t.lignes[li].cases;
    if (!cs[ci + 1]) return;
    cs[ci] = { ...cs[ci], fin: cs[ci + 1].fin, texte: cs[ci].texte || cs[ci + 1].texte };
    cs.splice(ci + 1, 1);
  });
  // Redécouper selon les périodes du mois (semaines / week-ends)
  const decoupables = (c) => periodes.filter((p) => p.debut >= c.debut && p.fin <= c.fin).length > 1;
  const redecouper = (li, ci) => maj((t) => {
    const c = t.lignes[li].cases[ci];
    const morceaux = periodes.filter((p) => p.debut >= c.debut && p.fin <= c.fin)
      .map((p, k) => ({ debut: p.debut, fin: p.fin, texte: k === 0 ? c.texte : '', grise: c.grise }));
    t.lignes[li].cases.splice(ci, 1, ...morceaux);
  });

  const enregistrer = async () => {
    setEnCours(true);
    try {
      await scheduleService.saveTableauMedecins(schedule.id, tableau);
      setModifie(false);
      toast.success('Planning enregistré');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Enregistrement impossible');
      return false;
    } finally {
      setEnCours(false);
    }
  };
  const apercu = () => {
    const { blob } = construirePlanningMedecinsPdf(schedule, tableau);
    window.open(URL.createObjectURL(blob), '_blank');
  };
  const soumettre = async () => {
    if (!window.confirm('Générer le PDF et soumettre le planning à la validation (Directeur médical → Directeur Général) ?')) return;
    if (!(await enregistrer())) return;
    setEnCours(true);
    try {
      const { blob, signatureZones } = construirePlanningMedecinsPdf(schedule, tableau);
      const fd = new FormData();
      fd.append('file', blob, `planning-medecins-${schedule.year}-${String(schedule.month).padStart(2, '0')}.pdf`);
      fd.append('title', schedule.title);
      fd.append('description', `Astreintes et consultations des médecins - ${scheduleService.getMonthName(schedule.month)} ${schedule.year}`);
      fd.append('category', 'Planning');
      fd.append('metadata', JSON.stringify({ scheduleId: schedule.id, scheduleType: schedule.scheduleType, month: schedule.month, year: schedule.year, signatureZones, signaturePage: 1 }));
      const res = await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await scheduleService.submitForValidation(schedule.id);
      toast.success('Planning soumis à la validation');
      const docId = res.data?.document?.id || res.data?.data?.id;
      navigate(docId ? `/documents/${docId}` : `/schedules/${schedule.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Génération ou soumission impossible');
    } finally {
      setEnCours(false);
    }
  };

  const th = { fontSize: 11, padding: 2, color: 'var(--fg)', textAlign: 'center', borderBottom: '1px solid var(--border)' };
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <button type="button" onClick={() => navigate('/schedules')} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 14 }}>← Retour</button>
          <span style={{ fontWeight: 600, marginLeft: 8 }}>{schedule.title}</span>
          {modifie && <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--warning)' }}>Modifications non enregistrées</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" style={bouton('var(--surface-3)', 'var(--fg)')} onClick={apercu}>Aperçu PDF</button>
          <button type="button" style={bouton('var(--brand)')} disabled={enCours} onClick={enregistrer}>Enregistrer</button>
          <button type="button" style={bouton('var(--success)')} disabled={enCours} onClick={soumettre}>{enCours ? 'Patientez…' : 'Générer le PDF et soumettre'}</button>
        </div>
      </div>

      <div style={{ padding: 16, display: 'grid', gap: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
          Repris du mois précédent : corrigez ce qui change. Plusieurs médecins dans une case : séparez-les par « / ».
          ⇥ fusionne avec la case suivante, ✂ redécoupe par semaine / week-end, ▒ grise la case.
        </div>
        <datalist id="planning-medecins-noms">{suggestions.map((n) => <option key={n} value={n} />)}</datalist>

        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', padding: 12, boxShadow: 'var(--shadow-1)', overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 230 + jours.reduce((w, j) => w + (j.weekEnd ? 66 : 44), 0) }}>
            <colgroup><col style={{ width: 130 }} /><col style={{ width: 100 }} />{jours.map((j) => <col key={j.jour} style={{ width: j.weekEnd ? 66 : 44 }} />)}</colgroup>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left' }}>Services*</th>
                <th style={th}>Superviseur (lun-ven)</th>
                {jours.map((j) => <th key={j.jour} style={{ ...th, background: j.weekEnd ? 'var(--surface-3)' : undefined }}>{j.lettre}<br />{j.jour}</th>)}
              </tr>
            </thead>
            <tbody>
              {tableau.lignes.map((l, li) => (
                <tr key={li} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 3, verticalAlign: 'top' }}>
                    <textarea rows={2} style={{ ...input, fontWeight: 600, resize: 'vertical' }} value={l.nom} onChange={(e) => maj((t) => { t.lignes[li].nom = e.target.value; })} />
                    <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                      <button type="button" style={petit} disabled={li === 0} onClick={() => maj((t) => { [t.lignes[li - 1], t.lignes[li]] = [t.lignes[li], t.lignes[li - 1]]; })}>↑</button>
                      <button type="button" style={petit} disabled={li === tableau.lignes.length - 1} onClick={() => maj((t) => { [t.lignes[li + 1], t.lignes[li]] = [t.lignes[li], t.lignes[li + 1]]; })}>↓</button>
                      <button type="button" style={{ ...petit, color: 'var(--danger)' }} onClick={() => { if (window.confirm(`Supprimer la ligne « ${l.nom} » ?`)) maj((t) => { t.lignes.splice(li, 1); }); }}>✕</button>
                    </div>
                  </td>
                  <td style={{ padding: 3, verticalAlign: 'top', background: l.superviseurGrise ? 'var(--surface-3)' : undefined }}>
                    <input style={input} list="planning-medecins-noms" value={l.superviseur} disabled={l.superviseurGrise} onChange={(e) => maj((t) => { t.lignes[li].superviseur = e.target.value; })} />
                    <label style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', gap: 3, alignItems: 'center', marginTop: 2 }}>
                      <input type="checkbox" checked={l.superviseurGrise} onChange={(e) => maj((t) => { t.lignes[li].superviseurGrise = e.target.checked; })} /> grisé
                    </label>
                  </td>
                  {l.cases.map((c, ci) => (
                    <td key={c.debut} colSpan={c.fin - c.debut + 1} style={{ padding: 2, verticalAlign: 'top', background: c.grise ? 'var(--surface-3)' : undefined, borderLeft: '1px solid var(--border)' }}>
                      <input style={{ ...input, textAlign: 'center', background: c.grise ? 'var(--surface-3)' : 'var(--surface)' }} list="planning-medecins-noms"
                        title={`Du ${c.debut} au ${c.fin}`} value={c.texte} onChange={(e) => maj((t) => { t.lignes[li].cases[ci].texte = e.target.value; })} />
                      <div style={{ display: 'flex', gap: 2, marginTop: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button type="button" style={petit} title={c.grise ? 'Ne plus griser' : 'Griser la case'} onClick={() => maj((t) => { t.lignes[li].cases[ci].grise = !c.grise; })}>▒</button>
                        {decoupables(c) && <button type="button" style={petit} title="Redécouper par semaine / week-end" onClick={() => redecouper(li, ci)}>✂</button>}
                        {ci < l.cases.length - 1 && <button type="button" style={petit} title="Fusionner avec la case suivante" onClick={() => fusionner(li, ci)}>⇥</button>}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" style={{ ...petit, marginTop: 8, padding: '3px 10px' }} onClick={() => maj((t) => {
            t.lignes.push({ nom: 'NOUVEAU SERVICE*', superviseur: '', superviseurGrise: false, cases: periodes.map((p) => ({ debut: p.debut, fin: p.fin, texte: '', grise: p.weekEnd })) });
          })}>+ Ajouter une ligne</button>
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', padding: 16, boxShadow: 'var(--shadow-1)', maxWidth: 900 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Notes en bas du planning</div>
          {tableau.notes.map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <input style={{ ...input, fontSize: 13 }} value={n} placeholder="ex. Dr X en congé du 23/03/26 au 23/04/26" onChange={(e) => maj((t) => { t.notes[i] = e.target.value; })} />
              <button type="button" style={petit} onClick={() => maj((t) => { t.notes.splice(i, 1); })}>✕</button>
            </div>
          ))}
          <button type="button" style={{ ...petit, padding: '3px 10px' }} onClick={() => maj((t) => { t.notes.unshift(''); })}>+ Ajouter une note (congé…)</button>
        </div>
      </div>
    </div>
  );
}
