// frontend/src/pages/NouveautesPage.jsx — historique des notes « Nouveautés »
// + rédaction par les administrateurs (brouillon / publiée, modifier, supprimer).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, PenLine, Pencil, Trash2, X, Loader, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { releaseNotesAPI } from '../services/api';
import { isNoteForUser, useReleaseNotes } from '../components/ReleaseNotes';
import { useConfirm } from '../components/ConfirmModal';

// Où la note s'affiche (les pages correspondent aux routes de l'application)
const TARGET_OPTIONS = [
  { value: 'app', label: "Toute l'application — fenêtre à l'ouverture" },
  { group: 'Une page — bulle à la 1re ouverture', options: [
    ['/dashboard', 'Accueil (tableau de bord)'], ['/documents', 'Documents'], ['/upload', 'Upload'],
    ['/archives', 'Archives'], ['/my-tasks', 'Mes tâches'], ['/workflow-dashboard', 'Workflow'],
    ['/chat', 'Discussion'], ['/statistiques', 'Statistiques'], ['/user-management', 'Utilisateurs'],
    ['/employees', 'Employés'], ['/schedules', 'Plannings'], ['/portail', 'Portail'],
    ['/accueil', 'Accueil patients'], ['/caisse', 'Caisse'], ['/demandes-achat', "Demandes d'achat"],
    ['/compta', 'Comptabilité'], ['/invoices', 'Factures'], ['/php', 'Module PHP'],
    ['/kanban', 'Suivi technique'], ['/gmao', 'GMAO'], ['/forms', 'Formulaires'],
  ]},
  { group: 'Un formulaire — bulle à la 1re ouverture', options: [
    ['form:piece-de-caisse', 'Pièce de caisse'],
  ]},
];
const targetLabel = (target) => {
  if (target === 'app') return "Toute l'application";
  for (const g of TARGET_OPTIONS) {
    const hit = g.options?.find(([v]) => v === target);
    if (hit) return target.startsWith('form:') ? `Formulaire ${hit[1]}` : `Page ${hit[1]}`;
  }
  return target;
};

const EMPTY = { title: '', text: '', target: 'app', audience: 'all' };

function NoteEditor({ initial, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial
    ? { title: initial.title, text: initial.items.join('\n'), target: initial.target, audience: initial.audience }
    : EMPTY);
  const [saving, setSaving] = useState(false);
  const items = form.text.split('\n').map(l => l.trim()).filter(Boolean);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async (status) => {
    if (!form.title.trim()) return toast.error(t('Le titre est obligatoire.'));
    if (items.length === 0) return toast.error(t('Ajoutez au moins une ligne de contenu.'));
    setSaving(true);
    try {
      const payload = { title: form.title, items, target: form.target, audience: form.audience, status };
      if (initial) await releaseNotesAPI.update(initial.dbId, payload);
      else await releaseNotesAPI.create(payload);
      toast.success(status === 'published' ? t('Nouveauté publiée') : t('Brouillon enregistré'));
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || t("Erreur lors de l'enregistrement"));
    } finally {
      setSaving(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="rn-overlay" role="dialog" aria-modal="true" aria-labelledby="rn-editor-title">
      <div className="rn-modal rn-editor">
        <div className="rn-editor-head">
          <h2 id="rn-editor-title">{initial ? t('Modifier la nouveauté') : t('Rédiger une nouveauté')}</h2>
          <button type="button" onClick={onClose} className="rn-bubble-close" aria-label={t('Fermer')}><X size={16} /></button>
        </div>
        <div className="rn-modal-body">
          <label className="rn-field">
            <span>{t('Titre')}</span>
            <input value={form.title} onChange={set('title')} maxLength={200} placeholder={t('Ex. : Nouveau circuit des demandes d’achat')} autoFocus />
          </label>
          <label className="rn-field">
            <span>{t('Contenu')} <em>{t('— une nouveauté par ligne')}</em></span>
            <textarea value={form.text} onChange={set('text')} rows={5}
              placeholder={t('Ex. : Les demandes d’achat passent désormais par le chef de service avant la comptabilité.')} />
          </label>
          <div className="rn-field-row">
            <label className="rn-field">
              <span>{t('Où l’afficher')}</span>
              <select value={form.target} onChange={set('target')}>
                {TARGET_OPTIONS.map(o => o.group ? (
                  <optgroup key={o.group} label={t(o.group)}>
                    {o.options.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
                  </optgroup>
                ) : <option key={o.value} value={o.value}>{t(o.label)}</option>)}
              </select>
            </label>
            <label className="rn-field">
              <span>{t('Pour qui')}</span>
              <select value={form.audience} onChange={set('audience')}>
                <option value="all">{t('Tous les utilisateurs')}</option>
                <option value="admins">{t('Administrateurs seulement')}</option>
              </select>
            </label>
          </div>
          <p className="rn-hint">
            {form.target === 'app'
              ? t('S’affiche dans la fenêtre « Nouveautés » à la prochaine ouverture de l’application.')
              : t('S’affiche en bulle à la première ouverture de cet écran, uniquement pour ceux qui l’utilisent.')}
            {' '}{t('Chaque utilisateur ne la voit qu’une fois.')}
            {initial?.status === 'published' && ` ${t('Modifier une note déjà publiée ne la ré-affiche pas à ceux qui l’ont vue.')}`}
          </p>

          {(form.title.trim() || items.length > 0) && (
            <div className="rn-preview">
              <div className="rn-preview-label"><Eye size={12} /> {t('Aperçu')}</div>
              <section className="rn-note">
                <h3>{form.title || '…'}</h3>
                <ul>{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
              </section>
            </div>
          )}
        </div>
        <div className="rn-modal-foot">
          <button type="button" onClick={() => save('draft')} disabled={saving} className="rn-btn-secondary">{t('Enregistrer en brouillon')}</button>
          <button type="button" onClick={() => save('published')} disabled={saving} className="rn-btn">
            {saving && <Loader size={13} className="animate-spin" />} {t('Publier')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function NouveautesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { notes, reloadNotes } = useReleaseNotes();
  const { confirm, ConfirmModalRenderer } = useConfirm();
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);
  const [written, setWritten] = useState([]);       // notes rédigées (admin), brouillons compris
  const [editing, setEditing] = useState(null);     // null | 'new' | note

  const loadWritten = useCallback(() => {
    if (!isAdmin) return;
    releaseNotesAPI.listAdmin().then(res => setWritten(res.data.notes || [])).catch(() => setWritten([]));
  }, [isAdmin]);
  useEffect(() => { loadWritten(); }, [loadWritten]);

  const afterChange = () => { setEditing(null); loadWritten(); reloadNotes(); };

  const remove = async (note) => {
    const ok = await confirm({
      title: t('Supprimer la nouveauté'),
      message: t('« {{title}} » sera supprimée définitivement.', { title: note.title }),
      confirmLabel: t('Supprimer'),
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await releaseNotesAPI.remove(note.dbId);
      toast.success(t('Nouveauté supprimée'));
      afterChange();
    } catch { toast.error(t('Erreur lors de la suppression')); }
  };

  // Toutes les notes destinées à l'utilisateur (vues ou non), regroupées par date, plus récentes d'abord
  const byDate = useMemo(() => {
    const groups = {};
    notes.filter(n => isNoteForUser(n, user, null)).forEach(n => { (groups[n.date] ||= []).push(n); });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [notes, user]);

  const drafts = written.filter(n => n.status === 'draft');
  const scopeLabel = (target) =>
    target === 'app' ? t("Toute l'application") : target.startsWith('form:') ? t('Formulaire') : t('Page');
  const fmt = (date, opts) => new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language || 'fr-FR', opts);

  const NoteCard = ({ note, draft }) => (
    <div className="ged-card" style={{ padding: '14px 16px', display: 'flex', gap: 12 }}>
      <div style={{ width: 30, height: 30, borderRadius: 'var(--radius-2)', background: draft ? 'var(--surface-3)' : 'var(--brand-soft)', color: draft ? 'var(--fg-muted)' : 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {draft ? <PenLine size={15} /> : <Sparkles size={15} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{t(note.title)}</span>
          <span className="rn-tag">{isAdmin && note.dbId ? t(targetLabel(note.target)) : scopeLabel(note.target)}</span>
          {note.audience === 'admins' && <span className="rn-tag">{t('Administrateurs')}</span>}
          {draft && <span className="rn-tag is-draft">{t('Brouillon')}</span>}
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.55 }}>
          {note.items.map((it, i) => <li key={i}>{t(it)}</li>)}
        </ul>
        {isAdmin && note.dbId && (
          <div className="rn-card-actions">
            {note.author && <span>{t('Rédigée par {{name}}', { name: note.author })}</span>}
            <button type="button" onClick={() => setEditing(note)}><Pencil size={12} /> {t('Modifier')}</button>
            <button type="button" onClick={() => remove(note)} className="is-danger"><Trash2 size={12} /> {t('Supprimer')}</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="stats-page animate-pageFade" style={{ maxWidth: 760 }}>
      <div className="stats-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: '0 0 4px', letterSpacing: '-0.3px' }}>{t('Nouveautés')}</h1>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Les améliorations et ajustements apportés à l’application')}</div>
        </div>
        {isAdmin && (
          <div className="stats-actions">
            <button type="button" className="rn-btn" onClick={() => setEditing('new')}><PenLine size={14} /> {t('Rédiger')}</button>
          </div>
        )}
      </div>

      {isAdmin && drafts.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="rn-section-label">{t('Brouillons — visibles par les administrateurs seulement')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {drafts.map(n => <NoteCard key={n.id} note={n} draft />)}
          </div>
        </div>
      )}

      {byDate.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13, padding: '48px 0' }}>{t('Aucune nouveauté pour le moment.')}</div>
      ) : byDate.map(([date, list]) => (
        <div key={date} style={{ marginBottom: 24 }}>
          <div className="rn-section-label">{fmt(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map(note => <NoteCard key={note.id} note={note} />)}
          </div>
        </div>
      ))}

      {editing && <NoteEditor initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={afterChange} />}
      {ConfirmModalRenderer}
    </div>
  );
}
