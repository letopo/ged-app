// frontend/src/components/php/PHPSuiviDme.jsx
// Suivi DME dans « Consultations PHP » : pour chaque patient de la page, où il
// en est dans le DME (accueil, paramètres, attente du médecin, en consultation,
// vu…) et la frise du jour : consultation → labo → imagerie. Lecture seule.
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, Check, X, Link2, Undo2, Stethoscope, FlaskConical, ScanLine, Pill, Info, AlertTriangle, Copy, HelpCircle } from 'lucide-react';
import { phpConsultationAPI, phpPatientAPI } from '../../services/phpService';

const TONES = {
  attente: 'var(--warning)',
  encours: 'var(--brand)',
  fini: 'var(--success)',
  alerte: 'var(--danger)',
  neutre: 'var(--fg-subtle)',
};
const KIND_ICON = { consultation: Stethoscope, labo: FlaskConical, imagerie: ScanLine };

const fmtJour = (s) => new Date(`${String(s).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR');

const todayLocal = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Douala' });

/** Charge le suivi DME des consultations affichées ; chaque minute pour aujourd'hui. */
export function useSuiviDme({ enabled, date, consultations }) {
  const [data, setData] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [tick, setTick] = useState(0);
  const key = consultations.map((c) => c.id).join(',');
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    if (!tick) setData(null);
    if (!enabled || !key) return undefined;
    let stop = false;
    const load = async () => {
      if (document.hidden) return;
      setChargement(true);
      try {
        const res = await phpConsultationAPI.suiviDme(date, key.split(','));
        if (!stop && keyRef.current === key) setData(res.data);
      } catch (err) {
        if (!stop) setData({ disponible: true, erreur: err.response?.data?.message || 'Suivi DME indisponible.', suivis: {} });
      } finally {
        if (!stop) setChargement(false);
      }
    };
    load();
    const timer = date === todayLocal() ? setInterval(load, 60_000) : null;
    return () => { stop = true; if (timer) clearInterval(timer); };
  }, [enabled, date, key, tick]);

  // Colonne masquée si le DME n'est pas branché pour l'établissement
  const actif = enabled && !(data && data.disponible === false);
  return { actif, data, chargement, recharger: () => setTick((t) => t + 1) };
}

function Pastille({ tone, children, title }) {
  const color = TONES[tone] || TONES.neutre;
  return (
    <span title={title} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
      color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 35%, transparent)` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {children}
    </span>
  );
}

export function DmeSuiviBadge({ suivi, chargement, ouvert, onToggle }) {
  if (chargement) return <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>…</span>;
  if (!suivi) return <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>–</span>;
  const kinds = [...new Set(suivi.frise.map((e) => e.kind))].filter((k) => k !== 'consultation');
  const Chevron = ouvert ? ChevronDown : ChevronRight;
  const cliquable = true;
  const trouve = suivi.fiches?.length > 0;
  return (
    <button type="button" onClick={onToggle} disabled={!cliquable}
      title={trouve ? 'Voir le parcours du jour et les fiches DME' : 'Ni le matricule, ni le nom, ni le compte Sage ne correspondent à une fiche du DME — cliquez pour saisir son n° de dossier DME'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', background: 'none', border: 'none', padding: 0, cursor: cliquable ? 'pointer' : 'default', textAlign: 'left' }}>
      {cliquable && <Chevron size={13} style={{ color: 'var(--fg-subtle)' }} />}
      <Pastille tone={suivi.etat.tone}>{suivi.etat.label}{suivi.etat.heure ? ` · ${suivi.etat.heure}` : ''}</Pastille>
      {kinds.map((k) => {
        const Icon = KIND_ICON[k];
        return Icon ? <Icon key={k} size={14} style={{ color: 'var(--fg-muted)' }} aria-label={k} /> : null;
      })}
      {suivi.confiance === 'probable' && <HelpCircle size={14} style={{ color: 'var(--warning)' }} aria-label="à vérifier" />}
      {suivi.doublons && <span className="text-xs font-semibold" style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Copy size={12} /> {suivi.fiches.length} fiches DME</span>}
      {suivi.ecartMatricule && <AlertTriangle size={14} style={{ color: 'var(--warning)' }} aria-label="matricule différent" />}
      {trouve && suivi.confiance !== 'ambigu' && (
        <span className="text-xs" style={{ flexBasis: '100%', color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)', paddingLeft: 19 }}>
          {suivi.fiches.map((f) => `${f.lien === 'confirme' ? '✓ ' : ''}${f.dossier || `#${f.id}`}`).join(' · ')}
          {suivi.frise.length === 0 && suivi.dernierPassage ? <span style={{ fontFamily: 'inherit' }}> — dernier passage le {fmtJour(suivi.dernierPassage)}</span> : null}
        </span>
      )}
    </button>
  );
}

const RAISONS = { 'lien confirmé': 'lien enregistré', 'matricule': 'même matricule', 'compte Sage': 'même compte Sage', 'nom complet': 'même nom', 'nom partiel': 'nom en partie', 'matricule voisin': 'matricule à un chiffre près', 'date de naissance': 'même date de naissance', 'même personne (doublon)': 'même nom et date de naissance' };

const btn = (color) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
  color, background: `color-mix(in srgb, ${color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 35%, transparent)` });

/** Actions de saisie PHP : confirmer / écarter / annuler / associer un n° de dossier. */
function useLienDme(patientId, onChange) {
  const [busy, setBusy] = useState(false);
  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); toast.success(ok); onChange?.(); }
    catch (err) { toast.error(err.response?.data?.message || 'Action impossible.'); }
    finally { setBusy(false); }
  };
  return {
    busy,
    confirmer: (dmePatientId) => run(() => phpPatientAPI.decideLienDme(patientId, { dmePatientId, statut: 'confirme' }), 'Fiche DME liée au patient.'),
    ecarter: (dmePatientId) => run(() => phpPatientAPI.decideLienDme(patientId, { dmePatientId, statut: 'ecarte' }), 'Fiche écartée : elle ne sera plus proposée pour ce patient.'),
    annuler: (dmePatientId) => run(() => phpPatientAPI.resetLienDme(patientId, dmePatientId), 'Décision annulée.'),
    associer: (dossier) => run(() => phpPatientAPI.decideLienDme(patientId, { dossier, statut: 'confirme' }), `Dossier ${dossier} lié au patient.`),
  };
}

function AssocierDossier({ actions }) {
  const [dossier, setDossier] = useState('');
  const submit = (e) => { e.preventDefault(); const d = dossier.trim(); if (d) actions.associer(d); };
  return (
    <form onSubmit={submit} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <Link2 size={13} style={{ color: 'var(--fg-muted)' }} />
      <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>Associer un n° de dossier DME :</span>
      <input value={dossier} onChange={(e) => setDossier(e.target.value)} placeholder="HSJM…" aria-label="N° de dossier DME"
        style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', width: 150, fontFamily: 'var(--font-mono)' }} />
      <button type="submit" disabled={actions.busy || !dossier.trim()} style={{ ...btn('var(--brand)'), opacity: actions.busy || !dossier.trim() ? 0.5 : 1 }}>Associer</button>
    </form>
  );
}

export function FichesDme({ suivi, canWrite, onChange }) {
  const { fiches = [], confiance, doublons, ecartMatricule, ecartees = [] } = suivi;
  const actions = useLienDme(suivi.patientId, onChange);
  const alerte = doublons || confiance === 'ambigu';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {confiance === 'ambigu' && (
        <p className="text-xs" style={{ margin: 0, color: 'var(--danger)', display: 'flex', gap: 5, alignItems: 'center' }}>
          <AlertTriangle size={13} /> Plusieurs fiches du DME peuvent correspondre : impossible de choisir.{canWrite ? ' Indiquez la bonne avec « C’est lui ».' : ''}
        </p>
      )}
      {doublons && (
        <p className="text-xs" style={{ margin: 0, color: 'var(--danger)', display: 'flex', gap: 5, alignItems: 'center' }}>
          <Copy size={13} /> Ce patient a {fiches.length} fiches dans le DME : à fusionner dans le DME. Le parcours ci-dessus les réunit.
        </p>
      )}
      {confiance === 'probable' && !fiches.some((f) => f.lien === 'confirme') && (
        <p className="text-xs" style={{ margin: 0, color: 'var(--warning)', display: 'flex', gap: 5, alignItems: 'center' }}>
          <HelpCircle size={13} /> Fiche retrouvée sans matricule ni compte Sage commun : à vérifier.
        </p>
      )}
      {ecartMatricule && (
        <p className="text-xs" style={{ margin: 0, color: 'var(--warning)', display: 'flex', gap: 5, alignItems: 'center' }}>
          <AlertTriangle size={13} /> Matricule différent dans le DME : {ecartMatricule.join(', ')}. Un des deux est mal saisi.
        </p>
      )}
      {fiches.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {fiches.map((f) => (
            <div key={f.id} style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 2,
              border: `1px solid ${f.lien === 'confirme' ? 'color-mix(in srgb, var(--success) 40%, var(--border))' : alerte ? 'color-mix(in srgb, var(--danger) 35%, var(--border))' : 'var(--border)'}` }}>
              <div className="text-xs font-semibold" style={{ color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 5 }}>
                {f.lien === 'confirme' && <Check size={12} style={{ color: 'var(--success)' }} aria-label="lien enregistré" />}
                {f.dossier || `Fiche ${f.id}`} · {f.nom}
              </div>
              <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                {[f.type, f.matricule && `matricule ${f.matricule}`, f.naissance && `né(e) le ${new Date(`${f.naissance}T12:00:00`).toLocaleDateString('fr-FR')}`].filter(Boolean).join(' · ')}
              </div>
              {f.raisons?.length > 0 && <div className="text-xs" style={{ color: 'var(--fg-subtle)' }}>Retrouvée par : {f.raisons.map((r) => RAISONS[r] || r).join(', ')}</div>}
              {f.lien === 'confirme' && <div className="text-xs" style={{ color: 'var(--success)' }}>Lien enregistré{f.lienSource === 'auto' ? ' automatiquement (même matricule ou compte Sage)' : ''}</div>}
              {canWrite && (
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {f.lien !== 'confirme' && <button type="button" disabled={actions.busy} onClick={() => actions.confirmer(f.id)} style={btn('var(--success)')}><Check size={12} /> C’est lui</button>}
                  <button type="button" disabled={actions.busy} onClick={() => actions.ecarter(f.id)} style={btn('var(--danger)')}><X size={12} /> Ce n’est pas lui</button>
                  {f.lien === 'confirme' && f.lienSource === 'manuel' && <button type="button" disabled={actions.busy} onClick={() => actions.annuler(f.id)} style={btn('var(--fg-muted)')}><Undo2 size={12} /> Annuler</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {ecartees.length > 0 && (
        <div className="text-xs" style={{ color: 'var(--fg-subtle)', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          Écartées pour ce patient :
          {ecartees.map((e) => (
            <span key={e.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ textDecoration: 'line-through' }}>{e.dossier || `#${e.id}`}{e.nom ? ` · ${e.nom}` : ''}</span>
              {canWrite && <button type="button" disabled={actions.busy} onClick={() => actions.annuler(e.id)} style={btn('var(--fg-muted)')} title="Ne plus écarter cette fiche"><Undo2 size={11} /> Annuler</button>}
            </span>
          ))}
        </div>
      )}
      {canWrite && <AssocierDossier actions={actions} />}
    </div>
  );
}

export function DmeSuiviFrise({ suivi, canWrite = false, onChange }) {
  if (!suivi) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {!suivi.trouve ? (
        <p className="text-xs" style={{ color: 'var(--fg-muted)', margin: 0 }}>
          Aucune fiche du DME ne correspond (ni le matricule, ni le nom, ni le compte Sage).{canWrite ? ' Si le patient a une fiche, saisissez son n° de dossier DME ci-dessous.' : ''}
        </p>
      ) : suivi.confiance === 'ambigu' ? null : suivi.frise.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--fg-muted)', margin: 0 }}>
          La fiche DME est retrouvée, mais aucun passage (consultation, labo, imagerie) n’y est enregistré ce jour-là.
          {suivi.dernierPassage ? ` Dernier passage : le ${fmtJour(suivi.dernierPassage)} à ${String(suivi.dernierPassage).slice(11, 16)}.` : ' Aucun passage antérieur.'}
        </p>
      ) : (
        <ol style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 6, listStyle: 'none', margin: 0, padding: 0 }}>
          {suivi.frise.map((e, i) => {
            const Icon = KIND_ICON[e.kind] || Info;
            const color = e.annule ? 'var(--fg-subtle)' : e.termine ? 'var(--success)' : 'var(--brand)';
            return (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span aria-hidden style={{ color: 'var(--fg-subtle)', fontSize: 13 }}>→</span>}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 10px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', minWidth: 150 }}>
                  <Icon size={15} style={{ color, marginTop: 1, flexShrink: 0 }} />
                  <div style={{ lineHeight: 1.35 }}>
                    <div className="text-xs font-semibold" style={{ color: 'var(--fg)', textDecoration: e.annule ? 'line-through' : 'none' }}>
                      {e.heure || '--:--'}{e.fin ? `–${e.fin}` : ''} · {e.titre}
                    </div>
                    {e.statut && <div className="text-xs" style={{ color }}>{e.statut}</div>}
                    {e.detail && <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{e.detail}</div>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <FichesDme suivi={suivi} canWrite={canWrite} onChange={onChange} />
      <p className="text-xs" style={{ color: 'var(--fg-subtle)', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Pill size={12} /> La pharmacie n’apparaît pas encore : le DME n’a pas ouvert la lecture des ordonnances à la GED.
      </p>
    </div>
  );
}
