// frontend/src/components/schedules/ProgrammeWeekendEdit.jsx
// Saisie du programme du week-end (modèle papier) : en-tête Direction, services
// × 5 créneaux, cases fusionnables, noms en texte libre avec suggestions tirées
// du personnel (« SOPPI/MOUNCHILI » : la suggestion porte sur le dernier nom).
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import scheduleService from '../../services/scheduleService';
import ProgrammeWeekend, { PROGRAMME_LARGEUR } from './ProgrammeWeekend';
import { construireProgrammePdf } from './programmeWeekendPdf';

const CRENEAUX = 5;
const caseVide = () => ({ texte: '', span: 1 });
const ligneVide = () => Array.from({ length: CRENEAUX }, caseVide);
const clone = (x) => JSON.parse(JSON.stringify(x));

const input = { width: '100%', boxSizing: 'border-box', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--surface)', color: 'var(--fg)', fontSize: 13 };
const petitBouton = { padding: '1px 6px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--fg-muted)', cursor: 'pointer', lineHeight: 1.4 };
const bouton = (fond, couleur = '#fff') => ({ padding: '8px 16px', border: 'none', borderRadius: 'var(--radius-2)', background: fond, color: couleur, fontSize: 14, fontWeight: 500, cursor: 'pointer' });

export default function ProgrammeWeekendEdit({ schedule, employees = [] }) {
  const navigate = useNavigate();
  const [content, setContent] = useState(() => clone(schedule.content));
  const [modifie, setModifie] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [apercu, setApercu] = useState(false);
  const [saisie, setSaisie] = useState(''); // valeur de la case en cours (suggestions)
  const { jours } = scheduleService.programmeJours(schedule);
  const enTetes = jours.flatMap((j) => j.creneaux.map((c) => `${j.nom.slice(0, 3)}. ${c}`));

  const maj = (fn) => { setContent((prev) => { const n = clone(prev); fn(n); return n; }); setModifie(true); };

  // Suggestions : on complète le dernier nom tapé après « / »
  const noms = useMemo(() => {
    const vus = new Map();
    for (const e of employees) {
      const nom = String(e.lastName || '').trim().toUpperCase();
      if (nom && !vus.has(nom)) vus.set(nom, `${e.firstName || ''} ${e.lastName || ''}`.trim() + (e.service?.name ? ` · ${e.service.name}` : ''));
    }
    return [...vus.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [employees]);
  const suggestions = useMemo(() => {
    const coupe = saisie.lastIndexOf('/');
    const prefixe = coupe >= 0 ? saisie.slice(0, coupe + 1) : '';
    const debut = saisie.slice(coupe + 1).trim().toUpperCase();
    if (debut.length < 2) return [];
    return noms.filter(([nom]) => nom.includes(debut)).slice(0, 12).map(([nom, detail]) => ({ valeur: prefixe + nom, detail }));
  }, [saisie, noms]);

  // Fusion : la case absorbe la suivante ; réduire libère la dernière
  const etendre = (si, li, ci) => maj((n) => {
    const l = n.services[si].lignes[li];
    const fin = ci + l[ci].span;
    if (fin >= CRENEAUX) return;
    const suivante = l[fin];
    if (!l[ci].texte) l[ci].texte = suivante.texte;
    l[ci].span += suivante.span;
    for (let k = fin; k < ci + l[ci].span; k++) l[k] = { texte: '', span: 0 };
  });
  const reduire = (si, li, ci) => maj((n) => {
    const l = n.services[si].lignes[li];
    if (l[ci].span <= 1) return;
    l[ci].span -= 1;
    l[ci + l[ci].span] = caseVide();
  });

  const enregistrer = async () => {
    setEnCours(true);
    try {
      await scheduleService.saveProgramme(schedule.id, content);
      setModifie(false);
      toast.success('Programme enregistré');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Enregistrement impossible');
      return false;
    } finally {
      setEnCours(false);
    }
  };

  const soumettre = async () => {
    if (!window.confirm('Générer le PDF et soumettre le programme à la validation (Directrice des Soins → Directeur Médical → DG) ?')) return;
    if (!(await enregistrer())) return;
    setEnCours(true);
    try {
      const { blob, signatureZones } = construireProgrammePdf(schedule, content);
      const { du, au } = scheduleService.programmeJours(schedule);
      const fd = new FormData();
      fd.append('file', blob, `programme-week-end-${schedule.startDate}.pdf`);
      fd.append('title', schedule.title || `Programme du week-end du ${du} au ${au}`);
      fd.append('description', `Programme du week-end du ${du} au ${au}`);
      fd.append('category', 'Programme du week-end');
      fd.append('metadata', JSON.stringify({ scheduleId: schedule.id, scheduleType: 'weekend', signatureZones, signaturePage: 1 }));
      const res = await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await scheduleService.submitForValidation(schedule.id);
      toast.success('Programme soumis à la validation');
      const docId = res.data?.document?.id || res.data?.data?.id;
      navigate(docId ? `/documents/${docId}` : `/schedules/${schedule.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Génération ou soumission impossible');
    } finally {
      setEnCours(false);
    }
  };

  const listeEntete = (cle, titre) => (
    <div style={{ flex: '1 1 320px' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{titre}</div>
      {(content.entete[cle] || []).map((e, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          <input style={{ ...input, flex: '0 0 40%' }} value={e.label} placeholder="Intitulé" onChange={(ev) => maj((n) => { n.entete[cle][i].label = ev.target.value; })} />
          <input style={input} value={e.valeur} placeholder="Nom ou numéro" onChange={(ev) => maj((n) => { n.entete[cle][i].valeur = ev.target.value; })} />
          <button type="button" style={petitBouton} title="Retirer" onClick={() => maj((n) => { n.entete[cle].splice(i, 1); })}>✕</button>
        </div>
      ))}
      <button type="button" style={petitBouton} onClick={() => maj((n) => { n.entete[cle] = [...(n.entete[cle] || []), { label: '', valeur: '' }]; })}>+ Ajouter une ligne</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <button type="button" onClick={() => navigate('/schedules')} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 14 }}>← Retour</button>
          <span style={{ fontWeight: 600, marginLeft: 8 }}>{schedule.title}</span>
          {modifie && <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--warning)' }}>Modifications non enregistrées</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" style={bouton('var(--surface-3)', 'var(--fg)')} onClick={() => setApercu((a) => !a)}>{apercu ? 'Revenir à la saisie' : 'Aperçu'}</button>
          <button type="button" style={bouton('var(--brand)')} disabled={enCours} onClick={enregistrer}>Enregistrer</button>
          <button type="button" style={bouton('var(--success)')} disabled={enCours} onClick={soumettre}>{enCours ? 'Patientez…' : 'Générer le PDF et soumettre'}</button>
        </div>
      </div>

      {apercu ? (
        <div style={{ padding: 16, overflowX: 'auto' }}>
          <div style={{ boxShadow: 'var(--shadow-2)', width: PROGRAMME_LARGEUR, margin: '0 auto' }}>
            <ProgrammeWeekend schedule={schedule} content={content} />
          </div>
        </div>
      ) : (
        <div style={{ padding: 16, display: 'grid', gap: 16 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', padding: 16, boxShadow: 'var(--shadow-1)' }}>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 12 }}>
              Repris du week-end précédent : corrigez ce qui change. Plusieurs noms dans une case : séparez-les par « / ».
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              <div style={{ flex: '1 1 320px' }}>
                {listeEntete('direction', 'Direction')}
                <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>Superviseur management :</span>
                  <input style={input} value={content.entete.superviseurManagement || ''} onChange={(e) => maj((n) => { n.entete.superviseurManagement = e.target.value; })} />
                </div>
              </div>
              {listeEntete('responsables', 'Responsables du week-end')}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', padding: 16, boxShadow: 'var(--shadow-1)', overflowX: 'auto' }}>
            <datalist id="programme-weekend-noms">
              {suggestions.map((s) => <option key={s.valeur} value={s.valeur}>{s.detail}</option>)}
            </datalist>
            <table style={{ borderCollapse: 'collapse', minWidth: 980, width: '100%', tableLayout: 'fixed' }}>
              <colgroup><col style={{ width: 190 }} />{enTetes.map((h) => <col key={h} />)}</colgroup>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontSize: 12, color: 'var(--fg-muted)', padding: 4 }}>Service</th>
                  {enTetes.map((h, i) => (
                    <th key={h} style={{ fontSize: 12, padding: 4, color: 'var(--fg)' }}>
                      {h}<div style={{ fontWeight: 400, color: 'var(--fg-muted)' }}>{jours[i === 0 ? 0 : i <= 2 ? 1 : 2]?.date}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {content.services.map((s, si) => s.lignes.map((ligne, li) => (
                  <tr key={`${si}-${li}`} style={{ borderTop: li === 0 ? '2px solid var(--border)' : '1px dashed var(--border)' }}>
                    {li === 0 && (
                      <td rowSpan={s.lignes.length} style={{ verticalAlign: 'top', padding: 4 }}>
                        <input style={{ ...input, fontWeight: 600 }} value={s.nom} onChange={(e) => maj((n) => { n.services[si].nom = e.target.value; })} />
                        <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12, color: 'var(--fg-muted)', margin: '4px 0' }}>
                          <input type="checkbox" checked={!!s.astreinte} onChange={(e) => maj((n) => { n.services[si].astreinte = e.target.checked; })} /> Astreinte
                        </label>
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          <button type="button" style={petitBouton} title="Ajouter une ligne" onClick={() => maj((n) => { n.services[si].lignes.push(ligneVide()); })}>+ ligne</button>
                          {s.lignes.length > 1 && <button type="button" style={petitBouton} title="Retirer la dernière ligne" onClick={() => maj((n) => { n.services[si].lignes.pop(); })}>− ligne</button>}
                          <button type="button" style={petitBouton} title="Monter" disabled={si === 0} onClick={() => maj((n) => { [n.services[si - 1], n.services[si]] = [n.services[si], n.services[si - 1]]; })}>↑</button>
                          <button type="button" style={petitBouton} title="Descendre" disabled={si === content.services.length - 1} onClick={() => maj((n) => { [n.services[si + 1], n.services[si]] = [n.services[si], n.services[si + 1]]; })}>↓</button>
                          <button type="button" style={{ ...petitBouton, color: 'var(--danger)' }} title="Supprimer le service" onClick={() => { if (window.confirm(`Supprimer « ${s.nom} » du programme ?`)) maj((n) => { n.services.splice(si, 1); }); }}>✕</button>
                        </div>
                      </td>
                    )}
                    {ligne.map((c, ci) => (c.span > 0 ? (
                      <td key={ci} colSpan={c.span} style={{ padding: 3, verticalAlign: 'top' }}>
                        <input
                          style={{ ...input, textTransform: 'uppercase', textAlign: c.span > 1 ? 'center' : 'left', background: c.span > 1 ? 'var(--brand-soft)' : 'var(--surface)' }}
                          list="programme-weekend-noms"
                          value={c.texte}
                          onFocus={(e) => setSaisie(e.target.value)}
                          onChange={(e) => { setSaisie(e.target.value); maj((n) => { n.services[si].lignes[li][ci].texte = e.target.value.toUpperCase(); }); }}
                        />
                        <div style={{ display: 'flex', gap: 3, marginTop: 2, justifyContent: 'flex-end' }}>
                          {c.span > 1 && <button type="button" style={petitBouton} title="Réduire la case" onClick={() => reduire(si, li, ci)}>⇤</button>}
                          {ci + c.span < CRENEAUX && <button type="button" style={petitBouton} title="Fusionner avec la case suivante" onClick={() => etendre(si, li, ci)}>⇥</button>}
                        </div>
                      </td>
                    ) : null))}
                  </tr>
                )))}
              </tbody>
            </table>
            <button type="button" style={{ ...petitBouton, marginTop: 10, padding: '4px 10px' }} onClick={() => maj((n) => { n.services.push({ nom: 'NOUVEAU SERVICE', astreinte: false, lignes: [ligneVide()] }); })}>+ Ajouter un service</button>
          </div>
        </div>
      )}
    </div>
  );
}
