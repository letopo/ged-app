// frontend/src/pages/PHPPharmacie.jsx - Module PHP
// Registre de pharmacie (feuille PHARMACIE de l'Excel du Point Focal) :
//  - onglet Registre : produits prescrits par patient et par jour, source
//    (pharmacie HSJM, hôpital extérieur, médecin du travail), quantité, servi,
//    reste à servir ; « Servir » complète une ligne ;
//  - onglet Consommation : quantités par produit sur la période ;
//  - « Nouvelle ordonnance » : patient retrouvé par son matricule, rattaché à
//    sa consultation du jour, produits proposés d'après ceux déjà saisis.
// Export Excel identique à l'écran (utils/tableToExcel.js).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Pill, RefreshCw, FileSpreadsheet, Plus, Search, Check, Pencil, Trash2, X, Loader,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { phpPharmacieAPI, phpPatientAPI } from '../services/phpService';
import { exportTablesToExcel } from '../utils/tableToExcel';
import { useAuth } from '../contexts/AuthContext';
import { phpAccess } from '../utils/phpAccess';

const SOURCES = [
  { id: 'hsjm',            label: 'Pharmacie HSJM',     short: 'HSJM',        color: '#1d4ed8' },
  { id: 'hopital_ext',     label: 'Hôpital extérieur',  short: 'HÔPITAL EXT', color: '#7c3aed' },
  { id: 'medecin_travail', label: 'Médecin du travail', short: 'MÉD. TRAVAIL', color: '#047857' },
];
const SOURCE = Object.fromEntries(SOURCES.map(s => [s.id, s]));
const DARK = '#111827';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayISO = () => iso(new Date());
const monthOf = (day) => {
  const [y, m] = day.split('-').map(Number);
  return { du: `${day.slice(0, 7)}-01`, au: iso(new Date(y, m, 0)) };
};
const frDay = (d, locale = 'fr-FR') => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString(locale) : '');
const fullName = (r) => [r.nom, r.prenom].filter(Boolean).join(' ');

const input = { padding: '6px 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13 };
const btn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 13, borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' };
const primary = { ...btn, background: 'var(--brand)', borderColor: 'var(--brand)', color: '#fff', fontWeight: 600 };
const th = 'px-2 py-2 text-[11px] font-bold text-left whitespace-nowrap';
const td = 'px-2 py-1.5 text-xs align-top';

function Box({ children }) {
  return <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>{children}</div>;
}
function SourceTag({ source }) {
  const s = SOURCE[source] || SOURCES[0];
  return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap" style={{ color: s.color, background: `${s.color}14` }}>{s.short}</span>;
}

export default function PHPPharmacie() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const canWrite = phpAccess(user).write;
  const [tab, setTab] = useState('registre');
  const [period, setPeriod] = useState(() => ({ ...monthOf(todayISO()), auto: true }));
  const [source, setSource] = useState('');
  const [resteOnly, setResteOnly] = useState(false);
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const contentRef = useRef(null);

  useEffect(() => { const id = setTimeout(() => setQDebounced(q.trim()), 350); return () => clearTimeout(id); }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { du: period.du, au: period.au };
      const [l, s] = await Promise.all([
        phpPharmacieAPI.getLignes({ ...params, source: source || undefined, reste: resteOnly ? '1' : undefined, q: qDebounced || undefined }),
        phpPharmacieAPI.getStats(params),
      ]);
      const d = l.data.data;
      // Mois en cours encore vide : on se place sur le dernier mois saisi
      if (period.auto && !d.rows.length && !s.data.data.total.lignes && d.last && String(d.last).slice(0, 10) < period.du) {
        setPeriod(monthOf(String(d.last).slice(0, 10)));
        return;
      }
      setData(d);
      setStats(s.data.data);
    } catch (err) {
      console.error('Registre pharmacie :', err);
      toast.error(err.response?.data?.message || t('Chargement impossible.'));
    } finally {
      setLoading(false);
    }
  }, [period, source, resteOnly, qDebounced, t]);

  useEffect(() => { load(); }, [load]);

  const setShortcut = (k) => {
    const now = new Date();
    if (k === 'mois') setPeriod(monthOf(todayISO()));
    if (k === 'prec') setPeriod(monthOf(iso(new Date(now.getFullYear(), now.getMonth() - 1, 1))));
    if (k === 'annee') setPeriod({ du: `${now.getFullYear()}-01-01`, au: todayISO() });
  };

  // Lignes regroupées par ordonnance (même patient, même jour), comme dans l'Excel
  const groups = useMemo(() => {
    const out = [];
    for (const r of data?.rows || []) {
      const key = `${r.datePrescription}|${r.patientId}`;
      if (out.at(-1)?.key !== key) out.push({ key, first: r, lignes: [] });
      out.at(-1).lignes.push(r);
    }
    return out;
  }, [data]);

  const serve = async (r) => {
    try {
      await phpPharmacieAPI.update(r.id, { quantiteServie: r.quantitePrescrite });
      toast.success(t('{{produit}} servi.', { produit: r.produit }));
      load();
    } catch (err) { toast.error(err.response?.data?.message || t('Enregistrement impossible.')); }
  };
  const remove = async (r) => {
    try {
      await phpPharmacieAPI.remove(r.id);
      setConfirmDelete(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || t('Suppression impossible.')); }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const label = tab === 'registre' ? t('Registre') : t('Consommation');
      const periode = `du ${frDay(period.du)} au ${frDay(period.au)}`;
      const n = await exportTablesToExcel(contentRef.current, {
        fileName: `PHARMACIE-PHP-${label}-${periode}`.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').toUpperCase(),
        sheetName: label,
        title: `${t('Registre de pharmacie')} — ${periode}`,
      });
      if (!n) toast(t('Aucun tableau à exporter.'), { icon: 'ℹ️' });
    } catch (err) {
      console.error('Export Excel :', err);
      toast.error(t('Export Excel impossible.'));
    } finally {
      setExporting(false);
    }
  };

  const total = stats?.total;
  const kpis = [
    { label: t('Ordonnances'), value: total?.ordonnances },
    { label: t('Patients'), value: total?.patients },
    { label: t('Produits prescrits'), value: total?.prescrit },
    { label: t('Servis'), value: total?.servi, color: 'var(--success)' },
    { label: t('Reste à servir'), value: total?.reste, color: total?.reste ? 'var(--warning)' : undefined },
  ];

  return (
    <div className="min-h-screen p-4 lg:p-6" style={{ background: 'var(--surface-2)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <Link to="/php" className="p-1 rounded-lg" style={{ color: 'var(--fg-muted)' }}><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <Pill size={22} style={{ color: 'rgb(16,185,129)' }} /> {t('Registre de pharmacie')}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
              {t('Produits prescrits aux patients PHP, servis et restant à servir')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button style={btn} onClick={load} title={t('Actualiser')}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
          <button style={btn} onClick={exportExcel} disabled={exporting}>
            {exporting ? <Loader size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} {t('Export Excel')}
          </button>
          {canWrite && <button style={primary} onClick={() => setShowNew(true)}><Plus size={15} /> {t('Nouvelle ordonnance')}</button>}
        </div>
      </div>

      {/* Période */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input type="date" value={period.du} max={period.au} onChange={(e) => e.target.value && setPeriod(p => ({ du: e.target.value, au: p.au }))} style={input} />
        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{t('au')}</span>
        <input type="date" value={period.au} min={period.du} onChange={(e) => e.target.value && setPeriod(p => ({ du: p.du, au: e.target.value }))} style={input} />
        {[['mois', t('Ce mois')], ['prec', t('Mois dernier')], ['annee', t('Cette année')]].map(([k, l]) => (
          <button key={k} style={{ ...btn, padding: '5px 10px', fontSize: 12 }} onClick={() => setShortcut(k)}>{l}</button>
        ))}
      </div>

      <div ref={contentRef} className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {kpis.map(k => (
            <div key={k.label} data-export-kpi={k.label} className="rounded-xl px-3 py-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{k.label}</div>
              <div data-kpi-value="" className="text-xl font-bold" style={{ color: k.color || 'var(--fg)' }}>{k.value ?? '–'}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {[['registre', t('Registre')], ['consommation', t('Consommation par produit')]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className="px-3 py-1.5 text-sm"
                style={{ background: tab === k ? 'var(--brand)' : 'var(--surface)', color: tab === k ? '#fff' : 'var(--fg)', fontWeight: tab === k ? 600 : 400 }}>{l}</button>
            ))}
          </div>
          {tab === 'registre' && (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Matricule, nom ou produit')} style={{ ...input, paddingLeft: 28, width: 220 }} />
              </div>
              <select value={source} onChange={(e) => setSource(e.target.value)} style={input}>
                <option value="">{t('Toutes les sources')}</option>
                {SOURCES.map(s => <option key={s.id} value={s.id}>{t(s.label)}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--fg)' }}>
                <input type="checkbox" checked={resteOnly} onChange={(e) => setResteOnly(e.target.checked)} /> {t('Reste à servir seulement')}
              </label>
            </>
          )}
        </div>

        {loading && !data ? (
          <Box><div className="flex justify-center py-16" style={{ color: 'var(--fg-muted)' }}><Loader size={22} className="animate-spin" /></div></Box>
        ) : tab === 'registre' ? (
          <Box>
            {!groups.length ? (
              <div className="py-14 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>{t('Aucun produit enregistré sur cette période.')}</div>
            ) : (
              <div className="overflow-x-auto" data-export-title={t('Registre')}>
                <table className="w-full border-collapse min-w-max">
                  <thead>
                    <tr style={{ background: DARK, color: '#fff' }}>
                      <th className={th}>{t('DATE')}</th>
                      <th className={th}>{t('MATRICULE')}</th>
                      <th className={th}>{t('NOM ET PRÉNOM')}</th>
                      <th className={th}>{t('SECTEUR')}</th>
                      <th className={th}>{t('PRODUIT')}</th>
                      <th className={th}>{t('SOURCE')}</th>
                      <th className={`${th} text-center`}>{t('QTÉ')}</th>
                      <th className={`${th} text-center`}>{t('SERVI')}</th>
                      <th className={`${th} text-center`}>{t('RESTE')}</th>
                      {canWrite && <th className={th} data-export-skip="" />}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g, gi) => g.lignes.map((r, i) => (
                      <tr key={r.id} style={{ borderTop: i === 0 ? '2px solid var(--border)' : '1px solid var(--border)', background: gi % 2 ? 'var(--surface-2)' : undefined }}>
                        {i === 0 && (
                          <>
                            <td className={td} rowSpan={g.lignes.length} style={{ color: 'var(--fg)' }}>{frDay(r.datePrescription, i18n.language)}</td>
                            <td className={`${td} font-mono`} rowSpan={g.lignes.length} style={{ color: 'var(--fg)' }}>{r.matricule}</td>
                            <td className={`${td} font-semibold`} rowSpan={g.lignes.length} style={{ color: 'var(--fg)' }}>
                              {fullName(r)}
                              {r.consultationService && <div className="text-[10px] font-normal" style={{ color: 'var(--fg-muted)' }}>{t('Consultation {{service}}', { service: r.consultationService })}</div>}
                            </td>
                            <td className={td} rowSpan={g.lignes.length} style={{ color: 'var(--fg-muted)' }}>{r.secteur || ''}</td>
                          </>
                        )}
                        <td className={td} style={{ color: 'var(--fg)' }}>{r.produit}</td>
                        <td className={td}><SourceTag source={r.source} /></td>
                        <td className={`${td} text-center`} style={{ color: 'var(--fg)' }}>{r.quantitePrescrite}</td>
                        <td className={`${td} text-center`} style={{ color: 'var(--success)' }}>{r.quantiteServie}</td>
                        <td className={`${td} text-center font-bold`} style={{ color: r.reste ? 'var(--warning)' : 'var(--fg-muted)' }}>{r.reste}</td>
                        {canWrite && (
                          <td className={`${td} whitespace-nowrap text-right`} data-export-skip="">
                            {r.reste > 0 && (
                              <button onClick={() => serve(r)} className="inline-flex items-center gap-1 px-2 py-0.5 mr-1 rounded text-[11px] font-semibold"
                                style={{ background: 'var(--success-soft)', color: 'var(--success)' }} title={t('Marquer comme servi en entier')}>
                                <Check size={12} /> {t('Servir')}
                              </button>
                            )}
                            <button onClick={() => setEditing(r)} className="p-1 rounded" style={{ color: 'var(--fg-muted)' }} title={t('Modifier')}><Pencil size={13} /></button>
                            {confirmDelete === r.id ? (
                              <button onClick={() => remove(r)} onBlur={() => setConfirmDelete(null)} autoFocus className="px-1.5 py-0.5 rounded text-[11px] font-semibold"
                                style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{t('Supprimer ?')}</button>
                            ) : (
                              <button onClick={() => setConfirmDelete(r.id)} className="p-1 rounded" style={{ color: 'var(--fg-muted)' }} title={t('Supprimer')}><Trash2 size={13} /></button>
                            )}
                          </td>
                        )}
                      </tr>
                    )))}
                  </tbody>
                </table>
                {data?.limited && <p className="text-xs p-2" style={{ color: 'var(--warning)' }}>{t('Seules les 3 000 premières lignes sont affichées : réduisez la période.')}</p>}
              </div>
            )}
          </Box>
        ) : (
          <TabConsommation stats={stats} />
        )}
      </div>

      {showNew && <NouvelleOrdonnance onClose={() => setShowNew(false)} onSaved={(day) => { setShowNew(false); if (day < period.du || day > period.au) setPeriod(monthOf(day)); else load(); }} />}
      {editing && <EditLigne ligne={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

// ─── Consommation par produit ────────────────────────────────────────────────

function TabConsommation({ stats }) {
  const { t } = useTranslation();
  const produits = stats?.produits || [];
  const usedSources = SOURCES.filter(s => produits.some(p => p[s.id]));
  if (!produits.length) return <Box><div className="py-14 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>{t('Aucun produit enregistré sur cette période.')}</div></Box>;
  const sum = (k) => produits.reduce((s, p) => s + (p[k] || 0), 0);
  return (
    <Box>
      <div className="overflow-x-auto" data-export-title={t('Consommation par produit')}>
        <table className="w-full border-collapse min-w-max">
          <thead>
            <tr style={{ background: DARK, color: '#fff' }}>
              <th className={th}>{t('PRODUIT')}</th>
              <th className={`${th} text-center`}>{t('PATIENTS')}</th>
              <th className={`${th} text-center`}>{t('PRESCRIT')}</th>
              {usedSources.map(s => <th key={s.id} className={`${th} text-center`} style={{ background: s.color }}>{t(s.short)}</th>)}
              <th className={`${th} text-center`}>{t('SERVI')}</th>
              <th className={`${th} text-center`}>{t('RESTE')}</th>
            </tr>
          </thead>
          <tbody>
            {produits.map(p => (
              <tr key={p.produit} style={{ borderTop: '1px solid var(--border)' }}>
                <td className={td} style={{ color: 'var(--fg)' }}>{p.produit}</td>
                <td className={`${td} text-center`} style={{ color: 'var(--fg-muted)' }}>{p.patients}</td>
                <td className={`${td} text-center font-bold`} style={{ color: 'var(--fg)' }}>{p.prescrit}</td>
                {usedSources.map(s => <td key={s.id} className={`${td} text-center`} style={{ color: s.color }}>{p[s.id] || ''}</td>)}
                <td className={`${td} text-center`} style={{ color: 'var(--success)' }}>{p.servi}</td>
                <td className={`${td} text-center font-bold`} style={{ color: p.reste ? 'var(--warning)' : 'var(--fg-muted)' }}>{p.reste || ''}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface-2)' }}>
              <td className={`${td} font-bold`} style={{ color: 'var(--fg)' }}>{t('TOTAL')}</td>
              <td className={`${td} text-center font-bold`} style={{ color: 'var(--fg)' }}>{stats.total.patients}</td>
              <td className={`${td} text-center font-bold`} style={{ color: 'var(--fg)' }}>{sum('prescrit')}</td>
              {usedSources.map(s => <td key={s.id} className={`${td} text-center font-bold`} style={{ color: s.color }}>{sum(s.id)}</td>)}
              <td className={`${td} text-center font-bold`} style={{ color: 'var(--success)' }}>{sum('servi')}</td>
              <td className={`${td} text-center font-bold`} style={{ color: 'var(--warning)' }}>{sum('reste')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Box>
  );
}

// ─── Fenêtres ────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ background: 'rgba(0,0,0,0.45)' }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full rounded-xl flex flex-col" style={{ maxWidth: wide ? 760 : 440, maxHeight: '92vh', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-3, 0 20px 50px rgba(0,0,0,.3))' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}><Pill size={17} style={{ color: 'rgb(16,185,129)' }} /> {title}</h2>
          <button onClick={onClose} className="p-1 rounded" style={{ color: 'var(--fg-muted)' }}><X size={18} /></button>
        </div>
        <div className="p-4 overflow-y-auto space-y-3">{children}</div>
        <div className="flex justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>{footer}</div>
      </div>
    </div>
  );
}

// Noms de produits déjà saisis, proposés pendant la frappe
function useProduitSuggestions() {
  const [list, setList] = useState([]);
  const timer = useRef(null);
  const suggest = useCallback((q) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try { setList((await phpPharmacieAPI.getProduits(q)).data.data || []); } catch { /* sans suggestions */ }
    }, 250);
  }, []);
  useEffect(() => { suggest(''); return () => clearTimeout(timer.current); }, [suggest]);
  return [list, suggest];
}

const emptyLigne = () => ({ key: Math.random().toString(36).slice(2), produit: '', source: 'hsjm', quantitePrescrite: 1, quantiteServie: 1, serviTouched: false });

function NouvelleOrdonnance({ onClose, onSaved }) {
  const { t } = useTranslation();
  const [matricule, setMatricule] = useState('');
  const [patient, setPatient] = useState(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [consultations, setConsultations] = useState([]);
  const [consultationId, setConsultationId] = useState('');
  const [lignes, setLignes] = useState([emptyLigne()]);
  const [saving, setSaving] = useState(false);
  const [suggestions, suggest] = useProduitSuggestions();

  const search = async () => {
    const m = matricule.replace(/\s+/g, '');
    if (!m) return;
    setSearching(true); setNotFound(false);
    try {
      const res = await phpPatientAPI.searchByMatricule(encodeURIComponent(m));
      setPatient(res.data.data || null);
      setNotFound(!res.data.data);
    } catch (err) {
      setPatient(null);
      if (err.response?.status === 404) setNotFound(true);
      else toast.error(err.response?.data?.message || t('Erreur réseau lors de la recherche'));
    } finally { setSearching(false); }
  };

  // Consultations du patient ce jour-là : la première est proposée
  useEffect(() => {
    if (!patient?.id || !date) { setConsultations([]); setConsultationId(''); return undefined; }
    let alive = true;
    phpPharmacieAPI.getConsultationsDuJour(patient.id, date).then((res) => {
      if (!alive) return;
      const list = res.data.data || [];
      setConsultations(list);
      setConsultationId(list[0]?.id || '');
    }).catch(() => { if (alive) { setConsultations([]); setConsultationId(''); } });
    return () => { alive = false; };
  }, [patient?.id, date]);

  const setLigne = (key, patch) => setLignes(ls => ls.map(l => {
    if (l.key !== key) return l;
    const next = { ...l, ...patch };
    // Servi suit la quantité tant qu'il n'a pas été changé à la main
    if ('quantitePrescrite' in patch && !l.serviTouched) next.quantiteServie = patch.quantitePrescrite;
    if ('quantiteServie' in patch) next.serviTouched = true;
    return next;
  }));

  const filled = lignes.filter(l => l.produit.trim());
  const save = async () => {
    if (!patient) { toast.error(t('Recherchez d\'abord le patient par son matricule.')); return; }
    if (!filled.length) { toast.error(t('Ajoutez au moins un produit.')); return; }
    setSaving(true);
    try {
      const res = await phpPharmacieAPI.create({
        patientId: patient.id, consultationId: consultationId || null, datePrescription: date,
        lignes: filled.map(({ produit, source, quantitePrescrite, quantiteServie }) => ({
          produit, source, quantitePrescrite: Number(quantitePrescrite), quantiteServie: Number(quantiteServie),
        })),
      });
      toast.success(res.data.message || t('Ordonnance enregistrée.'));
      onSaved(date);
    } catch (err) {
      toast.error(err.response?.data?.message || t('Enregistrement impossible.'));
    } finally { setSaving(false); }
  };

  return (
    <Modal wide title={t('Nouvelle ordonnance')} onClose={onClose}
      footer={<>
        <button style={btn} onClick={onClose}>{t('Annuler')}</button>
        <button style={{ ...primary, opacity: saving || !patient || !filled.length ? 0.6 : 1 }} disabled={saving || !patient || !filled.length} onClick={save}>
          {saving ? <Loader size={14} className="animate-spin" /> : <Check size={14} />} {t('Enregistrer')}
        </button>
      </>}>
      <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
        <label className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>
          {t('Matricule du patient')}
          <div className="flex gap-2 mt-1">
            <input value={matricule} autoFocus inputMode="numeric" onChange={(e) => { setMatricule(e.target.value); setPatient(null); setNotFound(false); }}
              onKeyDown={(e) => e.key === 'Enter' && search()} style={{ ...input, flex: 1 }} placeholder="700925" />
            <button style={btn} onClick={search} disabled={searching}>{searching ? <Loader size={14} className="animate-spin" /> : <Search size={14} />} {t('Rechercher')}</button>
          </div>
        </label>
        <label className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>
          {t('Date')}
          <input type="date" value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ ...input, display: 'block', marginTop: 4 }} />
        </label>
      </div>
      {notFound && <p className="text-xs" style={{ color: 'var(--danger)' }}>{t('Aucun patient avec ce matricule. Enregistrez-le d\'abord depuis l\'accueil du module PHP.')}</p>}
      {patient && (
        <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--success-soft)', color: 'var(--fg)' }}>
          <b>{fullName(patient)}</b>
          <span className="text-xs ml-2" style={{ color: 'var(--fg-muted)' }}>{[patient.secteur?.nom, patient.infirmerie?.nom].filter(Boolean).join(' · ')}</span>
          <div className="mt-1.5">
            <select value={consultationId} onChange={(e) => setConsultationId(e.target.value)} style={{ ...input, fontSize: 12, padding: '4px 8px' }}>
              <option value="">{t('Sans consultation ce jour-là')}</option>
              {consultations.map(c => (
                <option key={c.id} value={c.id}>{t('Consultation')} {c.numeroOrdre ? `n° ${c.numeroOrdre} ` : ''}— {[c.typeVisite, c.serviceName].filter(Boolean).join(' ')}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <datalist id="php-produits">{suggestions.map(p => <option key={p} value={p} />)}</datalist>
      <div className="space-y-2">
        <div className="hidden sm:grid grid-cols-[1fr_150px_64px_64px_28px] gap-2 text-[11px] font-semibold" style={{ color: 'var(--fg-muted)' }}>
          <span>{t('Produit')}</span><span>{t('Source')}</span><span className="text-center">{t('Qté')}</span><span className="text-center">{t('Servi')}</span><span />
        </div>
        {lignes.map((l) => (
          <div key={l.key} className="grid grid-cols-[1fr_64px_64px_28px] sm:grid-cols-[1fr_150px_64px_64px_28px] gap-2 items-center">
            <input list="php-produits" value={l.produit} placeholder={t('Nom du produit')} className="col-span-4 sm:col-span-1"
              onChange={(e) => { setLigne(l.key, { produit: e.target.value }); suggest(e.target.value); }} style={input} />
            <select value={l.source} onChange={(e) => setLigne(l.key, { source: e.target.value })} style={{ ...input, padding: '6px 4px' }}>
              {SOURCES.map(s => <option key={s.id} value={s.id}>{t(s.label)}</option>)}
            </select>
            <input type="number" min={1} max={9999} value={l.quantitePrescrite} title={t('Quantité prescrite')}
              onChange={(e) => setLigne(l.key, { quantitePrescrite: Math.max(1, Number(e.target.value) || 1) })} style={{ ...input, textAlign: 'center' }} />
            <input type="number" min={0} max={l.quantitePrescrite} value={l.quantiteServie} title={t('Quantité servie')}
              onChange={(e) => setLigne(l.key, { quantiteServie: Math.min(l.quantitePrescrite, Math.max(0, Number(e.target.value) || 0)) })} style={{ ...input, textAlign: 'center' }} />
            <button onClick={() => setLignes(ls => (ls.length > 1 ? ls.filter(x => x.key !== l.key) : [emptyLigne()]))} className="p-1 rounded" style={{ color: 'var(--fg-muted)' }} title={t('Retirer')}><Trash2 size={14} /></button>
          </div>
        ))}
        {lignes.length < 30 && (
          <button style={{ ...btn, padding: '5px 10px', fontSize: 12 }} onClick={() => setLignes(ls => [...ls, { ...emptyLigne(), source: ls.at(-1)?.source || 'hsjm' }])}>
            <Plus size={13} /> {t('Ajouter un produit')}
          </button>
        )}
        <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{t('« Servi » = quantité remise au patient ; la différence reste à servir et pourra être complétée plus tard depuis le registre.')}</p>
      </div>
    </Modal>
  );
}

function EditLigne({ ligne, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ produit: ligne.produit, source: ligne.source, quantitePrescrite: ligne.quantitePrescrite, quantiteServie: ligne.quantiteServie });
  const [saving, setSaving] = useState(false);
  const [suggestions, suggest] = useProduitSuggestions();
  const save = async () => {
    setSaving(true);
    try {
      await phpPharmacieAPI.update(ligne.id, { ...form, quantitePrescrite: Number(form.quantitePrescrite), quantiteServie: Number(form.quantiteServie) });
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Enregistrement impossible.'));
    } finally { setSaving(false); }
  };
  const label = 'text-xs font-semibold block';
  return (
    <Modal title={`${fullName(ligne)} — ${frDay(ligne.datePrescription)}`} onClose={onClose}
      footer={<>
        <button style={btn} onClick={onClose}>{t('Annuler')}</button>
        <button style={primary} disabled={saving || !form.produit.trim()} onClick={save}>{saving ? <Loader size={14} className="animate-spin" /> : <Check size={14} />} {t('Enregistrer')}</button>
      </>}>
      <datalist id="php-produits-edit">{suggestions.map(p => <option key={p} value={p} />)}</datalist>
      <label className={label} style={{ color: 'var(--fg-muted)' }}>{t('Produit')}
        <input list="php-produits-edit" value={form.produit} onChange={(e) => { setForm(f => ({ ...f, produit: e.target.value })); suggest(e.target.value); }} style={{ ...input, width: '100%', marginTop: 4 }} />
      </label>
      <label className={label} style={{ color: 'var(--fg-muted)' }}>{t('Source')}
        <select value={form.source} onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))} style={{ ...input, width: '100%', marginTop: 4 }}>
          {SOURCES.map(s => <option key={s.id} value={s.id}>{t(s.label)}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={label} style={{ color: 'var(--fg-muted)' }}>{t('Quantité prescrite')}
          <input type="number" min={1} max={9999} value={form.quantitePrescrite} onChange={(e) => setForm(f => ({ ...f, quantitePrescrite: Math.max(1, Number(e.target.value) || 1) }))} style={{ ...input, width: '100%', marginTop: 4 }} />
        </label>
        <label className={label} style={{ color: 'var(--fg-muted)' }}>{t('Quantité servie')}
          <input type="number" min={0} max={form.quantitePrescrite} value={form.quantiteServie} onChange={(e) => setForm(f => ({ ...f, quantiteServie: Math.max(0, Number(e.target.value) || 0) }))} style={{ ...input, width: '100%', marginTop: 4 }} />
        </label>
      </div>
      {Number(form.quantiteServie) > Number(form.quantitePrescrite) && <p className="text-xs" style={{ color: 'var(--danger)' }}>{t('La quantité servie ne peut pas dépasser la quantité prescrite.')}</p>}
    </Modal>
  );
}
