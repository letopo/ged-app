// frontend/src/pages/ProgrammeOperatoire.jsx
// Programme opératoire de la semaine, rempli en même temps par tous les services
// (backend routes/bloc.js). Chaque service ajoute ses interventions jusqu'au
// vendredi 12 h ; les autres pages ouvertes se mettent à jour en direct. Le
// responsable du programme clôt la semaine puis génère le document commun
// (modèle « Planning Opératoire »), envoyé au Médecin Chef puis au DG.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Lock, Unlock, Send, Loader, Settings2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { blocAPI, getSocket, initializeSocket } from '../services/api';

const JOURS = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];
const EMPTY = { service: '', jour: '', nomPatient: '', age: '', natureIntervention: '', intervenant: '', numeroSalle: '' };
const SERVICE_KEY = 'bloc.service';
const SERVICE_COLORS = ['#0F766E', '#7C3AED', '#DB2777', '#2563EB', '#EA580C', '#059669', '#CA8A04', '#DC2626'];

// Texte d'une pastille de service : sa couleur, éclaircie en mode nuit (lisible sur fond sombre)
const ink = (c) => `color-mix(in srgb, ${c} 72%, var(--fg))`;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = fromIso(s); d.setDate(d.getDate() + n); return iso(d); };
const mondayOf = (d) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return iso(x); };
const isMonday = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && fromIso(s).getDay() === 1;
const readStorage = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const writeStorage = (k, v) => { try { localStorage.setItem(k, v); } catch { /* navigation privée */ } };

const inputStyle = {
  width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-2)', border: '1.5px solid var(--border)',
  background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 4 };
const btn = (bg, fg = '#fff') => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--radius-2)',
  border: 'none', background: bg, color: fg, fontSize: 13, fontWeight: 600, cursor: 'pointer',
});
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'inline-flex', color: 'var(--fg-muted)' };
const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-1)' };

// Champs d'une intervention (ajout et modification)
function LineFields({ value, onChange, services, t }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
      <div>
        <label style={labelStyle}>{t('Service')} *</label>
        <select value={value.service} onChange={set('service')} style={inputStyle}>
          <option value="">{t('Sélectionner...')}</option>
          {[...new Set([...services, value.service].filter(Boolean))].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>{t('Jour de la semaine')} *</label>
        <select value={value.jour} onChange={set('jour')} style={inputStyle}>
          <option value="">{t('Sélectionner...')}</option>
          {JOURS.map(j => <option key={j} value={j}>{t(j)}</option>)}
        </select>
      </div>
      <div style={{ gridColumn: 'span 2' }}>
        <label style={labelStyle}>{t('Nom/Prénom du patient ou de la patiente')} *</label>
        <input value={value.nomPatient} onChange={set('nomPatient')} placeholder={t('Ex: AKWO PRUDENCIA')} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>{t('Âge')}</label>
        <input value={value.age} onChange={set('age')} placeholder={t('Ex: 47 ANS')} style={inputStyle} />
      </div>
      <div style={{ gridColumn: 'span 2' }}>
        <label style={labelStyle}>{t("Nature de l'intervention chirurgicale")} *</label>
        <input value={value.natureIntervention} onChange={set('natureIntervention')} placeholder={t('Ex: HRT TOTALE INDIQUEE POUR UTERUS POLYMYOMATEUX')} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>{t('Intervenant')}</label>
        <input value={value.intervenant} onChange={set('intervenant')} placeholder={t('Ex: DR MBOUOPDA')} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>{t('N° Salle')}</label>
        <input value={value.numeroSalle} onChange={set('numeroSalle')} placeholder={t('Ex: 2')} style={inputStyle} />
      </div>
    </div>
  );
}

// Liste des services (responsable du programme et administrateurs)
function ServicesEditor({ services, onSaved, onClose, t }) {
  const [list, setList] = useState(services);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const add = () => { const v = name.trim(); if (v && !list.includes(v)) setList([...list, v]); setName(''); };
  const save = async () => {
    setSaving(true);
    try {
      await blocAPI.updateServices(list);
      toast.success(t('Liste des services enregistrée.'));
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur serveur.'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div style={{ ...card, padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <strong style={{ fontSize: 14, color: 'var(--fg)' }}>{t('Services qui remplissent le programme')}</strong>
        <button type="button" onClick={onClose} style={iconBtn} aria-label={t('Fermer')}><X size={16} /></button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {list.map(s => (
          <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 6px 4px 10px', borderRadius: 999, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--fg)' }}>
            {s}
            <button type="button" onClick={() => setList(list.filter(x => x !== s))} style={{ ...iconBtn, padding: 2 }} aria-label={t('Retirer')}><X size={12} /></button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={t('Nouveau service (ex: Urologie)')} style={{ ...inputStyle, flex: '1 1 200px', width: 'auto' }} />
        <button type="button" onClick={add} style={btn('var(--surface-2)', 'var(--fg)')}><Plus size={14} /> {t('Ajouter')}</button>
        <button type="button" onClick={save} disabled={saving || list.length === 0} style={btn('var(--accent, #0F766E)')}>
          {saving ? <Loader size={14} className="animate-spin" /> : <Check size={14} />} {t('Enregistrer')}
        </button>
      </div>
    </div>
  );
}

export default function ProgrammeOperatoire() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const weekStart = isMonday(params.get('semaine')) ? params.get('semaine') : addDays(mondayOf(new Date()), 7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ ...EMPTY, service: readStorage(SERVICE_KEY) || '' });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null); // { id, ...champs }
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [showServices, setShowServices] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await blocAPI.week(weekStart);
      setData(r.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('Erreur serveur.'));
    } finally {
      setLoading(false);
    }
  }, [weekStart, t]);

  useEffect(() => { setLoading(true); setEditing(null); load(); }, [load]);

  // Mise à jour en direct quand un autre service saisit
  useEffect(() => {
    const socket = getSocket() || initializeSocket();
    if (!socket) return undefined;
    const join = () => socket.emit('join_bloc');
    const onChange = (evt) => { if (evt?.weekStart === weekStart) load(); };
    join();
    socket.on('connect', join);
    socket.on('bloc:changed', onChange);
    return () => {
      socket.off('connect', join);
      socket.off('bloc:changed', onChange);
      socket.emit('leave_bloc');
    };
  }, [weekStart, load]);

  const goWeek = (n) => setParams({ semaine: addDays(weekStart, n * 7) });
  const fmt = (s, opts) => fromIso(s).toLocaleDateString(i18n.language || 'fr', opts);
  const periode = `du ${fmt(weekStart, { day: 'numeric' })} au ${fmt(addDays(weekStart, 6), { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const services = data?.services || [];
  const colorOf = useMemo(() => {
    const all = [...new Set([...services, ...(data?.interventions || []).map(l => l.service)])];
    return (s) => SERVICE_COLORS[Math.max(0, all.indexOf(s)) % SERVICE_COLORS.length];
  }, [services, data]);
  const lines = (data?.interventions || []).filter(l => !filter || l.service === filter);
  const counts = (data?.interventions || []).reduce((acc, l) => ({ ...acc, [l.service]: (acc[l.service] || 0) + 1 }), {});

  const submitNew = async (e) => {
    e.preventDefault();
    if (!form.service || !form.jour || !form.nomPatient.trim() || !form.natureIntervention.trim()) {
      toast.error(t('Service, jour, patient et nature de l\'intervention sont obligatoires.'));
      return;
    }
    setAdding(true);
    try {
      await blocAPI.add(weekStart, form);
      writeStorage(SERVICE_KEY, form.service);
      // On garde le service et le jour : on enchaîne souvent plusieurs patients
      setForm({ ...EMPTY, service: form.service, jour: form.jour });
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur serveur.'));
    } finally {
      setAdding(false);
    }
  };

  const saveEdit = async () => {
    const { id, ...fields } = editing;
    try {
      await blocAPI.update(id, fields);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur serveur.'));
    }
  };

  const remove = async (line) => {
    if (!window.confirm(t('Supprimer l\'intervention de {{name}} ?', { name: line.nomPatient }))) return;
    try {
      await blocAPI.remove(line.id);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur serveur.'));
    }
  };

  const setStatus = async (status) => {
    setBusy(true);
    try {
      await blocAPI.setStatus(weekStart, status);
      toast.success(status === 'cloture' ? t('Semaine clôturée : la saisie est fermée.') : t('Semaine rouverte : les services peuvent de nouveau saisir.'));
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur serveur.'));
    } finally {
      setBusy(false);
    }
  };

  // Document commun : modèle « Planning Opératoire » prérempli avec toutes les lignes
  const generate = () => {
    const blocPrefill = {
      blocWeekStart: weekStart,
      periode,
      service: t('Tous services'),
      lignes: data.interventions.map(({ jour, service, nomPatient, age, natureIntervention, intervenant, numeroSalle }) =>
        ({ jour, service, nomPatient, age, natureIntervention, intervenant, numeroSalle })),
    };
    navigate('/create-from-template', { state: { templateName: 'Planning Opératoire', blocPrefill } });
  };

  if (loading && !data) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader className="animate-spin" /></div>;
  }

  const status = data?.status;
  const deadline = data ? new Date(data.deadline) : null;
  const deadlineText = deadline?.toLocaleString(i18n.language || 'fr', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const statusInfo = !data ? null
    : status === 'envoye' && data.documentStatus === 'approved' ? { color: '#059669', text: t('Signé par le Médecin Chef et le DG') }
    : status === 'envoye' && data.documentStatus === 'rejected' ? { color: '#DC2626', text: t('Rejeté — rouvrez la semaine pour corriger puis renvoyer') }
    : status === 'envoye' && data.documentStatus === 'draft' ? { color: '#CA8A04', text: t('Document créé, pas encore envoyé : choisissez le signataire'), action: 'submit' }
    : status === 'envoye' ? { color: '#2563EB', text: t('Envoyé à la signature (Médecin Chef puis DG)') }
    : status === 'cloture' ? { color: '#7C3AED', text: t('Clôturé par {{name}} — saisie fermée', { name: data.closedBy || '—' }) }
    : data.deadlinePassed ? { color: '#DC2626', text: t('Saisie fermée depuis {{date}} — seul le responsable peut encore modifier', { date: deadlineText }) }
    : { color: '#059669', text: t('Ouvert à tous les services jusqu\'au {{date}}', { date: deadlineText }) };

  let lastJour = null;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 0 40px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>{t('Programme opératoire')}</h1>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>{t('Rempli en même temps par tous les services, mis à jour en direct.')}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" onClick={() => goWeek(-1)} style={{ ...iconBtn, border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', padding: 6 }} aria-label={t('Semaine précédente')}><ChevronLeft size={16} /></button>
          <div style={{ minWidth: 200, textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{t('Semaine {{periode}}', { periode })}</div>
          <button type="button" onClick={() => goWeek(1)} style={{ ...iconBtn, border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', padding: 6 }} aria-label={t('Semaine suivante')}><ChevronRight size={16} /></button>
        </div>
      </div>

      {error && <div style={{ ...card, padding: 14, marginBottom: 16, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}

      {data && (
        <>
          <div style={{ ...card, padding: '12px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg)' }}>
              <span style={{ width: 9, height: 9, borderRadius: 99, background: statusInfo.color, flexShrink: 0 }} />
              {statusInfo.text}
              {data.documentId && (
                <button type="button" onClick={() => navigate(statusInfo.action === 'submit' ? `/documents?soumettre=${data.documentId}` : `/documents/${data.documentId}`)}
                  style={{ ...iconBtn, color: 'var(--accent, #2563EB)', fontSize: 13, fontWeight: 600, textDecoration: 'underline' }}>
                  {statusInfo.action === 'submit' ? t('Soumettre') : t('Voir le document')}
                </button>
              )}
            </span>
            {data.access.manage && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" onClick={() => setShowServices(v => !v)} style={btn('var(--surface-2)', 'var(--fg)')}><Settings2 size={14} /> {t('Services')}</button>
                {status === 'ouvert' && (
                  <button type="button" disabled={busy || !data.interventions.length} onClick={() => setStatus('cloture')} style={btn('#7C3AED')}><Lock size={14} /> {t('Clôturer la semaine')}</button>
                )}
                {status !== 'ouvert' && (
                  <button type="button" disabled={busy} onClick={() => setStatus('ouvert')} style={btn('var(--surface-2)', 'var(--fg)')}><Unlock size={14} /> {t('Rouvrir')}</button>
                )}
                {status === 'cloture' && (
                  <button type="button" disabled={busy} onClick={generate} style={btn('#2563EB')}><Send size={14} /> {t('Générer et envoyer à la signature')}</button>
                )}
              </div>
            )}
          </div>

          {showServices && <ServicesEditor services={services} t={t} onClose={() => setShowServices(false)} onSaved={() => { setShowServices(false); load(); }} />}

          {data.access.canAdd && (
            <form onSubmit={submitNew} style={{ ...card, padding: 18, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 12 }}>{t('Ajouter une intervention')}</div>
              <LineFields value={form} onChange={setForm} services={services} t={t} />
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={adding} style={btn('var(--success)')}>
                  {adding ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />} {t('Ajouter au programme')}
                </button>
              </div>
            </form>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {['', ...new Set([...services, ...Object.keys(counts)])].map(s => {
              const active = filter === s;
              const c = s ? colorOf(s) : 'var(--fg)';
              return (
                <button key={s || 'all'} type="button" onClick={() => setFilter(s)} style={{
                  padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${active ? c : 'var(--border)'}`,
                  background: active ? `color-mix(in srgb, ${s ? c : 'var(--fg)'} 12%, var(--surface))` : 'var(--surface)',
                  color: active ? (s ? ink(c) : c) : 'var(--fg-muted)',
                }}>
                  {s || t('Tous')} ({s ? counts[s] || 0 : data.interventions.length})
                </button>
              );
            })}
          </div>

          <div style={{ ...card, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)', textAlign: 'left' }}>
                  {[t('Jour'), t('Service'), t('Patient'), t('Âge'), t('Intervention'), t('Intervenant'), t('Salle'), t('Saisi par'), ''].map((h, i) => (
                    <th key={i} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: 28, textAlign: 'center', color: 'var(--fg-muted)' }}>{t('Aucune intervention pour cette semaine.')}</td></tr>
                )}
                {lines.map(l => {
                  const newDay = l.jour !== lastJour;
                  lastJour = l.jour;
                  if (editing?.id === l.id) {
                    return (
                      <tr key={l.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td colSpan={9} style={{ padding: 14, background: 'var(--surface-2)' }}>
                          <LineFields value={editing} onChange={setEditing} services={services} t={t} />
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                            <button type="button" onClick={() => setEditing(null)} style={btn('var(--surface)', 'var(--fg)')}>{t('Annuler')}</button>
                            <button type="button" onClick={saveEdit} style={btn('var(--success)')}><Check size={14} /> {t('Enregistrer')}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={l.id} style={{ borderTop: newDay ? '2px solid var(--border)' : '1px solid var(--border)', color: 'var(--fg)' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{newDay ? t(l.jour) : ''}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap', color: ink(colorOf(l.service)), background: `color-mix(in srgb, ${colorOf(l.service)} 16%, transparent)` }}>{l.service}</span>
                      </td>
                      <td style={{ padding: '9px 12px', textTransform: 'uppercase' }}>{l.nomPatient}</td>
                      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{l.age}</td>
                      <td style={{ padding: '9px 12px', textTransform: 'uppercase' }}>{l.natureIntervention}</td>
                      <td style={{ padding: '9px 12px', textTransform: 'uppercase' }}>{l.intervenant}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>{l.numeroSalle}</td>
                      <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{l.author}</td>
                      <td style={{ padding: '9px 8px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                        {l.canEdit && (
                          <>
                            <button type="button" onClick={() => setEditing({ id: l.id, service: l.service, jour: l.jour, nomPatient: l.nomPatient, age: l.age || '', natureIntervention: l.natureIntervention, intervenant: l.intervenant || '', numeroSalle: l.numeroSalle || '' })} style={iconBtn} aria-label={t('Modifier')}><Pencil size={15} /></button>
                            <button type="button" onClick={() => remove(l)} style={{ ...iconBtn, color: 'var(--danger)' }} aria-label={t('Supprimer')}><Trash2 size={15} /></button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
