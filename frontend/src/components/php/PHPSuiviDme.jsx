// frontend/src/components/php/PHPSuiviDme.jsx
// Suivi DME dans « Consultations PHP » : pour chaque patient de la page, où il
// en est dans le DME (accueil, paramètres, attente du médecin, en consultation,
// vu…) et la frise du jour : consultation → labo → imagerie. Lecture seule.
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Stethoscope, FlaskConical, ScanLine, Pill, Info, AlertCircle } from 'lucide-react';
import { phpConsultationAPI } from '../../services/phpService';

const TONES = {
  attente: 'var(--warning)',
  encours: 'var(--brand)',
  fini: 'var(--success)',
  alerte: 'var(--danger)',
  neutre: 'var(--fg-subtle)',
};
const KIND_ICON = { consultation: Stethoscope, labo: FlaskConical, imagerie: ScanLine };

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
  return (
    <button type="button" onClick={onToggle} disabled={!suivi.trouve}
      title={suivi.trouve ? 'Voir le parcours du jour dans le DME' : 'Ni le matricule ni le nom ne correspondent à une fiche du DME'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: suivi.trouve ? 'pointer' : 'default' }}>
      {suivi.trouve && <Chevron size={13} style={{ color: 'var(--fg-subtle)' }} />}
      <Pastille tone={suivi.etat.tone}>{suivi.etat.label}{suivi.etat.heure ? ` · ${suivi.etat.heure}` : ''}</Pastille>
      {kinds.map((k) => {
        const Icon = KIND_ICON[k];
        return Icon ? <Icon key={k} size={14} style={{ color: 'var(--fg-muted)' }} aria-label={k} /> : null;
      })}
    </button>
  );
}

export function DmeSuiviFrise({ suivi }) {
  if (!suivi) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {suivi.frise.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--fg-muted)', margin: 0 }}>Aucun passage enregistré dans le DME ce jour-là.</p>
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
      <p className="text-xs" style={{ color: 'var(--fg-subtle)', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Pill size={12} /> La pharmacie n’apparaît pas encore : le DME n’a pas ouvert la lecture des ordonnances à la GED.
        {suivi.par === 'nom' && <><AlertCircle size={12} style={{ marginLeft: 6 }} /> Fiche DME retrouvée par le nom (matricule absent du DME).</>}
      </p>
    </div>
  );
}
