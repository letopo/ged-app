// frontend/src/components/vehicles/ChecklistEditor.jsx
// Onglet « Check-list » : sections (Véhicule → chauffeur, Matériel → soignant)
// et points de contrôle, modifiables sans développement. Les contrôles déjà
// faits gardent la version de la check-list utilisée ce jour-là.
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Loader } from 'lucide-react';
import { vehiclesAPI } from '../../services/api';

const newId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export default function ChecklistEditor() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState(null);
  const [tpl, setTpl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    vehiclesAPI.templates().then((r) => {
      const list = r.data.data || [];
      setTemplates(list);
      if (list[0]) setTpl(JSON.parse(JSON.stringify(list[0])));
    }).catch(() => setTemplates([]));
  }, []);

  if (!templates) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Loader className="animate-spin" /></div>;
  if (!tpl) return <div className="ged-card" style={{ padding: 24, color: 'var(--fg-muted)', fontSize: 13 }}>{t('Aucune check-list.')}</div>;

  const update = (fn) => { setTpl((prev) => { const next = JSON.parse(JSON.stringify(prev)); fn(next); return next; }); setDirty(true); };
  const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };

  const save = async () => {
    setSaving(true);
    try {
      const res = await vehiclesAPI.updateTemplate(tpl.id, { name: tpl.name, sections: tpl.sections });
      setTpl(JSON.parse(JSON.stringify(res.data.data)));
      setDirty(false);
      toast.success(t('Check-list enregistrée.'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur serveur.'));
    } finally {
      setSaving(false);
    }
  };

  const input = { height: 34, padding: '0 9px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, boxSizing: 'border-box' };
  const iconBtn = { width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
        {t('Chaque section est contrôlée et signée séparément (ex. Véhicule par le chauffeur, Matériel médical par l\'infirmier). Un point « critique » en anomalie au retour rend le véhicule indisponible.')}
      </div>
      {tpl.sections.map((s, si) => (
        <div key={s.key} className="ged-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
            <input value={s.label} onChange={(e) => update((n) => { n.sections[si].label = e.target.value; })} style={{ ...input, flex: '1 1 180px', fontWeight: 700 }} aria-label={t('Nom de la section')} />
            <input value={s.role || ''} onChange={(e) => update((n) => { n.sections[si].role = e.target.value; })} placeholder={t('Fait par (ex : Chauffeur)')} style={{ ...input, flex: '1 1 160px' }} aria-label={t('Fait par')} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg)' }}>
              <input type="checkbox" checked={!!s.askMileage} onChange={(e) => update((n) => { n.sections[si].askMileage = e.target.checked; })} /> {t('Demander le kilométrage')}
            </label>
          </div>
          {s.items.map((it, ii) => (
            <div key={it.id} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '6px 0', borderTop: '1px solid var(--surface-3)' }}>
              <span style={{ fontSize: 11, color: 'var(--fg-subtle)', width: 20 }}>{ii + 1}.</span>
              <input value={it.label} onChange={(e) => update((n) => { n.sections[si].items[ii].label = e.target.value; })} style={{ ...input, flex: '1 1 220px' }} aria-label={t('Point de contrôle')} />
              <select value={it.kind} onChange={(e) => update((n) => { n.sections[si].items[ii].kind = e.target.value; if (e.target.value === 'level' && n.sections[si].items[ii].min === undefined) n.sections[si].items[ii].min = 50; })} style={input} aria-label={t('Type')}>
                <option value="check">{t('OK / Pas OK / Absent')}</option>
                <option value="level">{t('Niveau en %')}</option>
              </select>
              {it.kind === 'level' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
                  {t('min.')}<input type="number" min="0" max="100" value={it.min ?? 0} onChange={(e) => update((n) => { n.sections[si].items[ii].min = Number(e.target.value); })} style={{ ...input, width: 64 }} />%
                </label>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: it.critical ? '#b91c1c' : 'var(--fg-muted)' }}>
                <input type="checkbox" checked={!!it.critical} onChange={(e) => update((n) => { n.sections[si].items[ii].critical = e.target.checked; })} /> {t('Critique')}
              </label>
              <button type="button" style={iconBtn} onClick={() => update((n) => move(n.sections[si].items, ii, -1))} aria-label={t('Monter')}><ArrowUp size={13} /></button>
              <button type="button" style={iconBtn} onClick={() => update((n) => move(n.sections[si].items, ii, 1))} aria-label={t('Descendre')}><ArrowDown size={13} /></button>
              <button type="button" style={{ ...iconBtn, color: 'var(--danger)' }} onClick={() => update((n) => { n.sections[si].items.splice(ii, 1); })} aria-label={t('Supprimer')}><Trash2 size={13} /></button>
            </div>
          ))}
          <button type="button" onClick={() => update((n) => { n.sections[si].items.push({ id: newId(), label: '', kind: 'check', critical: false }); })}
            style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: 'var(--brand)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 }}>
            <Plus size={14} /> {t('Ajouter un point')}
          </button>
        </div>
      ))}
      <div style={{ position: 'sticky', bottom: 0, display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center', padding: '10px 0', background: 'linear-gradient(transparent, var(--bg, #f6f7f9) 40%)' }}>
        {dirty && <span style={{ fontSize: 12, color: '#b45309' }}>{t('Modifications non enregistrées')}</span>}
        <button type="button" onClick={save} disabled={saving || !dirty}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--brand)', color: '#fff', fontWeight: 700, cursor: saving || !dirty ? 'not-allowed' : 'pointer', opacity: saving || !dirty ? 0.6 : 1 }}>
          {saving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />} {t('Enregistrer la check-list')}
        </button>
      </div>
    </div>
  );
}
