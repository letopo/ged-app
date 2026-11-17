// frontend/src/components/php/PHPSuiviDme.jsx
// Suivi DME dans « Consultations PHP » : pour chaque patient de la page, où il
// en est dans le DME (accueil, paramètres, attente du médecin, en consultation,
// vu…) et la frise du jour : consultation → labo → imagerie. Lecture seule.
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Stethoscope, FlaskConical, ScanLine, Pill, Info, AlertTriangle, Copy, HelpCircle } from 'lucide-react';
import { phpConsultationAPI } from '../../services/phpService';

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
  const key = consultations.map((c) => c.id).join(',');
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    setData(null);
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
  }, [enabled, date, key]);

  // Colonne masquée si le DME n'est pas branché pour l'établissement
  const actif = enabled && !(data && data.disponible === false);
  return { actif, data, chargement };
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
  const cliquable = suivi.fiches?.length > 0;
  return (
    <button type="button" onClick={onToggle} disabled={!cliquable}
      title={cliquable ? 'Voir le parcours du jour et les fiches DME' : 'Ni le matricule, ni le nom, ni le compte Sage ne correspondent à une fiche du DME'}
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
      {cliquable && suivi.confiance !== 'ambigu' && (
        <span className="text-xs" style={{ flexBasis: '100%', color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)', paddingLeft: 19 }}>
          {suivi.fiches.map((f) => f.dossier || `#${f.id}`).join(' · ')}
          {suivi.frise.length === 0 && suivi.dernierPassage ? <span style={{ fontFamily: 'inherit' }}> — dernier passage le {fmtJour(suivi.dernierPassage)}</span> : null}
        </span>
      )}
    </button>
  );
}

const RAISONS = { 'matricule': 'même matricule', 'compte Sage': 'même compte Sage', 'nom complet': 'même nom', 'nom partiel': 'nom en partie', 'matricule voisin': 'matricule à un chiffre près', 'date de naissance': 'même date de naissance', 'même personne (doublon)': 'même nom et date de naissance' };

function FichesDme({ suivi }) {
  const { fiches = [], confiance, doublons, ecartMatricule } = suivi;
  if (!fiches.length) return null;
  const alerte = doublons || confiance === 'ambigu';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {confiance === 'ambigu' && (
        <p className="text-xs" style={{ margin: 0, color: 'var(--danger)', display: 'flex', gap: 5, alignItems: 'center' }}>
          <AlertTriangle size={13} /> Plusieurs fiches du DME peuvent correspondre : impossible de choisir. Vérifiez dans le DME et corrigez le matricule de la bonne fiche.
        </p>
      )}
      {doublons && (
        <p className="text-xs" style={{ margin: 0, color: 'var(--danger)', display: 'flex', gap: 5, alignItems: 'center' }}>
          <Copy size={13} /> Ce patient a {fiches.length} fiches dans le DME : à fusionner dans le DME. Le parcours ci-dessus les réunit.
        </p>
      )}
      {confiance === 'probable' && (
        <p className="text-xs" style={{ margin: 0, color: 'var(--warning)', display: 'flex', gap: 5, alignItems: 'center' }}>
          <HelpCircle size={13} /> Fiche retrouvée sans matricule ni compte Sage commun : à vérifier.
        </p>
      )}
      {ecartMatricule && (
        <p className="text-xs" style={{ margin: 0, color: 'var(--warning)', display: 'flex', gap: 5, alignItems: 'center' }}>
          <AlertTriangle size={13} /> Matricule différent dans le DME : {ecartMatricule.join(', ')}. Un des deux est mal saisi.
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {fiches.map((f) => (
          <div key={f.id} style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--surface)', border: `1px solid ${alerte ? 'color-mix(in srgb, var(--danger) 35%, var(--border))' : 'var(--border)'}` }}>
            <div className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>{f.dossier || `Fiche ${f.id}`} · {f.nom}</div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              {[f.type, f.matricule && `matricule ${f.matricule}`, f.naissance && `né(e) le ${new Date(`${f.naissance}T12:00:00`).toLocaleDateString('fr-FR')}`].filter(Boolean).join(' · ')}
            </div>
            {f.raisons?.length > 0 && <div className="text-xs" style={{ color: 'var(--fg-subtle)' }}>Retrouvée par : {f.raisons.map((r) => RAISONS[r] || r).join(', ')}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DmeSuiviFrise({ suivi }) {
  if (!suivi) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {suivi.confiance === 'ambigu' ? null : suivi.frise.length === 0 ? (
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
      <FichesDme suivi={suivi} />
      <p className="text-xs" style={{ color: 'var(--fg-subtle)', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Pill size={12} /> La pharmacie n’apparaît pas encore : le DME n’a pas ouvert la lecture des ordonnances à la GED.
      </p>
    </div>
  );
}
