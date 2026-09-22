// frontend/src/pages/GMAOPage.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gmaoAPI, listsAPI } from '../services/api';
import { useConfirm } from '../components/ConfirmModal';
import i18n from '../i18n/config';

const BCP47_LOCALES = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', ar: 'ar-SA' };
import {
  Wrench, Plus, Edit2, Trash2, X, Save, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle, Clock, BarChart2, Calendar, List,
  RefreshCw, Search, Filter, Package,
  AlertTriangle, PlayCircle, RotateCcw, ChevronDown, ChevronUp,
  User, XCircle, FileText, Download,
  Users, TrendingUp, DollarSign, Zap, PieChart, Settings2,
  ArrowUpRight, ArrowDownRight, Layers, ShoppingCart, Receipt
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const SERVICES = ['ANES', 'BOP', 'SAU', 'PED', 'GO', 'CHI', 'NN', 'MED', 'DENT', 'LAB', 'PHARMA', 'ADMIN'];

const SERVICE_COLORS = {
  ANES:   { bg: 'var(--svc-anes-bg)',   text: 'var(--svc-anes-text)',   chip: 'var(--svc-anes-chip)' },
  BOP:    { bg: 'var(--svc-bop-bg)',    text: 'var(--svc-bop-text)',    chip: 'var(--svc-bop-chip)' },
  SAU:    { bg: 'var(--svc-sau-bg)',    text: 'var(--svc-sau-text)',    chip: 'var(--svc-sau-chip)' },
  PED:    { bg: 'var(--svc-ped-bg)',    text: 'var(--svc-ped-text)',    chip: 'var(--svc-ped-chip)' },
  GO:     { bg: 'var(--svc-go-bg)',     text: 'var(--svc-go-text)',     chip: 'var(--svc-go-chip)' },
  CHI:    { bg: 'var(--svc-chi-bg)',    text: 'var(--svc-chi-text)',    chip: 'var(--svc-chi-chip)' },
  NN:     { bg: 'var(--svc-nn-bg)',     text: 'var(--svc-nn-text)',     chip: 'var(--svc-nn-chip)' },
  MED:    { bg: 'var(--svc-med-bg)',    text: 'var(--svc-med-text)',    chip: 'var(--svc-med-chip)' },
  DENT:   { bg: 'var(--svc-dent-bg)',   text: 'var(--svc-dent-text)',   chip: 'var(--svc-dent-chip)' },
  LAB:    { bg: 'var(--svc-lab-bg)',    text: 'var(--svc-lab-text)',    chip: 'var(--svc-lab-chip)' },
  PHARMA: { bg: 'var(--svc-pharma-bg)', text: 'var(--svc-pharma-text)', chip: 'var(--svc-pharma-chip)' },
  ADMIN:  { bg: 'var(--svc-admin-bg)',  text: 'var(--svc-admin-text)',  chip: 'var(--svc-admin-chip)' },
};

const getServiceColor = (service) => SERVICE_COLORS[service] || { bg: 'var(--surface-2)', text: 'var(--fg-muted)', chip: 'var(--fg-subtle)' };

const MONTH_LABELS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
const MONTH_FULL   = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const STATUT_CONFIG = {
  actif:        { label: 'Actif',         style: { background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success)' } },
  en_reparation:{ label: 'En réparation', style: { background: 'var(--warning-soft)', color: 'var(--warning)', border: '1px solid var(--warning)' } },
  hors_service: { label: 'Hors service',  style: { background: 'var(--danger-soft)',  color: 'var(--danger)',  border: '1px solid var(--danger)'  } },
};

const EMPTY_EQ = {
  nom: '', reference: '', numero_serie: '', service: '', type_equipement: '',
  marque: '', modele: '', date_mise_en_service: '', statut: 'actif', notes: '',
  matricule: '', origine: '', fournisseur: '', date_mise_au_rebus: ''
};

// Calcule le statut d'amortissement d'un équipement
const getAmortissementStatus = (eq) => {
  if (!eq.date_mise_au_rebus) return null;
  const today = new Date();
  const rebus = new Date(eq.date_mise_au_rebus);
  const diffDays = Math.ceil((rebus - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)   return { label: 'Amorti',       style: { background: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db' }, urgent: false };
  if (diffDays <= 90) return { label: `${diffDays}j`,  style: { background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger)' }, urgent: true  };
  if (diffDays <= 365)return { label: `${Math.ceil(diffDays/30)}m`, style: { background: 'var(--warning-soft)', color: 'var(--warning)', border: '1px solid var(--warning)' }, urgent: true };
  return null;
};

const EMPTY_PLAN = {
  equipement_id: '', mois: [], jour_du_mois: 1, duree_estimee: '', technicien_id: '', notes: '', actif: true
};

const EMPTY_INTERVENTION_FORM = {
  equipement_id: '',
  type: 'preventive',
  statut: 'planifiee',
  priorite: 'normal',
  date_planifiee: '',
  technicien_id: '',
  description: '',
  signale_par: '',
};

const EMPTY_COMPLETE_FORM = {
  actions_effectuees: '',
  pieces_remplacees: '',
  duree_reelle: '',
  observations: '',
};

const INTERVENTION_STATUT_CONFIG = {
  planifiee:  { label: 'Planifiée',  style: { background: 'var(--brand-soft)',   color: 'var(--brand)',   border: '1px solid var(--brand)'   } },
  en_cours:   { label: 'En cours',   style: { background: 'var(--warning-soft)', color: 'var(--warning)', border: '1px solid var(--warning)' } },
  terminee:   { label: 'Terminée',   style: { background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success)' } },
  reportee:   { label: 'Reportée',   style: { background: 'rgba(234,88,12,0.1)', color: '#c2410c',        border: '1px solid #f97316'        } },
};

const PRIORITE_CONFIG = {
  faible:  { label: 'Faible',  style: { background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success)' } },
  normal:  { label: 'Normal',  style: { background: 'var(--surface-2)',    color: 'var(--fg-muted)', border: '1px solid var(--border)'  } },
  urgent:  { label: 'Urgent',  style: { background: 'var(--danger-soft)',  color: 'var(--danger)',   border: '1px solid var(--danger)'  } },
};

// ─── STAT CARD ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 'var(--radius-3)', padding: 16, display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'var(--shadow-1)' }}>
      <div style={{ padding: 10, borderRadius: 'var(--radius-2)', background: 'var(--surface)' }}>
        <Icon style={{ width: 20, height: 20, color }} />
      </div>
      <div>
        <p style={{ fontSize: 24, fontWeight: 700, color }}>{value}</p>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 500 }}>{label}</p>
      </div>
    </div>
  );
}

// ─── EQUIPMENT MODAL ─────────────────────────────────────────────────────────

function EquipementModal({ open, onClose, initial, onSave, services = [] }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial || EMPTY_EQ);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(initial || EMPTY_EQ);
    setError('');
  }, [initial, open]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) { setError(t('Le nom est requis.')); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', borderRadius: 'var(--radius-4)' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
            {initial?.id ? t("Modifier l'équipement") : t('Ajouter un équipement')}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg p-3 flex items-center space-x-2" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>
                {t('Nom')} <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.nom}
                onChange={e => set('nom', e.target.value)}
                placeholder={t('Ex: Moniteur multi-paramètres')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Référence')}</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.reference}
                onChange={e => set('reference', e.target.value)}
                placeholder="REF-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Numéro de série')}</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.numero_serie}
                onChange={e => set('numero_serie', e.target.value)}
                placeholder="SN-XXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Service')}</label>
              <select
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.service}
                onChange={e => set('service', e.target.value)}
              >
                <option value="">{t('-- Sélectionner --')}</option>
                {form.service && !services.includes(form.service) && (
                  <option value={form.service}>{t('{{service}} (ancien)', { service: form.service })}</option>
                )}
                {services.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t("Type d'équipement")}</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.type_equipement}
                onChange={e => set('type_equipement', e.target.value)}
                placeholder={t('Ex: Monitoring, Respirateur...')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Marque')}</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.marque}
                onChange={e => set('marque', e.target.value)}
                placeholder={t('Ex: Philips, GE, Mindray...')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Modèle')}</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.modele}
                onChange={e => set('modele', e.target.value)}
                placeholder="Ex: IntelliVue MX450"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Date mise en service')}</label>
              <input
                type="date"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.date_mise_en_service}
                onChange={e => {
                  const val = e.target.value;
                  set('date_mise_en_service', val);
                  // Auto-calcul date de mise au rebus (+10 ans)
                  if (val) {
                    const d = new Date(val);
                    d.setFullYear(d.getFullYear() + 10);
                    set('date_mise_au_rebus', d.toISOString().split('T')[0]);
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Statut')}</label>
              <select
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.statut}
                onChange={e => set('statut', e.target.value)}
              >
                <option value="actif">{t('Actif')}</option>
                <option value="en_reparation">{t('En réparation')}</option>
                <option value="hors_service">{t('Hors service')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Matricule')}</label>
              <input
                name="matricule"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.matricule || ''}
                onChange={e => set('matricule', e.target.value)}
                placeholder="Ex: 01MILA1H8"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Origine')}</label>
              <select
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.origine || ''}
                onChange={e => set('origine', e.target.value)}
              >
                <option value="">{t('-- Sélectionner --')}</option>
                <option value="achat">{t('Achat')}</option>
                <option value="don">{t('Don')}</option>
                <option value="transfert">{t('Transfert')}</option>
                <option value="autre">{t('Autre')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Fournisseur')}</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.fournisseur || ''}
                onChange={e => set('fournisseur', e.target.value)}
                placeholder={t('Ex: BIOECOMS, Philips...')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>
                {t('Date de mise au rebus')}
                <span className="ml-2 text-xs font-normal" style={{ color: 'var(--brand)' }}>({t('auto : mise en service + 10 ans')})</span>
              </label>
              <input
                type="date"
                name="date_mise_au_rebus"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.date_mise_au_rebus || ''}
                onChange={e => set('date_mise_au_rebus', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Notes')}</label>
              <textarea
                rows={3}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder={t('Remarques, localisation précise...')}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors" style={{ color: 'var(--fg-muted)', background: 'var(--surface-2)' }}
            >
              {t('Annuler')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-5 py-2 text-sm font-medium rounded-lg disabled:opacity-60 transition-colors" style={{ background: 'var(--brand)', color: '#fff' }}
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? t('Sauvegarde...') : t('Enregistrer')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── PLAN MODAL ──────────────────────────────────────────────────────────────

function PlanModal({ open, onClose, initial, equipements, onSave }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial || EMPTY_PLAN);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(initial || EMPTY_PLAN);
    setError('');
  }, [initial, open]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleMois = (m) => {
    setForm(f => {
      const arr = Array.isArray(f.mois) ? f.mois : [];
      return { ...f, mois: arr.includes(m) ? arr.filter(x => x !== m) : [...arr, m].sort((a,b) => a-b) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipement_id) { setError(t('Veuillez sélectionner un équipement.')); return; }
    if (!form.mois || form.mois.length === 0) { setError(t('Sélectionnez au moins un mois.')); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ ...form, equipement_id: parseInt(form.equipement_id), jour_du_mois: parseInt(form.jour_du_mois), duree_estimee: form.duree_estimee ? parseFloat(form.duree_estimee) : null, technicien_id: form.technicien_id ? parseInt(form.technicien_id) : null });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  };

  const selectedMois = Array.isArray(form.mois) ? form.mois : [];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', borderRadius: 'var(--radius-4)' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
            {initial?.id ? t('Modifier le plan') : t('Nouveau plan de maintenance')}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg p-3 flex items-center space-x-2" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>
              {t('Équipement')} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <select
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={form.equipement_id}
              onChange={e => set('equipement_id', e.target.value)}
            >
              <option value="">{t('-- Sélectionner un équipement --')}</option>
              {equipements.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nom} {eq.service ? `(${eq.service})` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>
              {t('Mois de maintenance')} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {MONTH_LABELS.map((lbl, idx) => {
                const m = idx + 1;
                const selected = selectedMois.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMois(m)}
                    className="py-1.5 text-xs font-semibold rounded-lg transition-colors"
                    style={selected
                      ? { background: 'var(--brand)', border: '2px solid var(--brand)', color: '#fff' }
                      : { background: 'var(--surface)', border: '2px solid var(--border)', color: 'var(--fg-muted)' }}
                  >
                    {t(lbl)}
                  </button>
                );
              })}
            </div>
            {selectedMois.length > 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--fg-subtle)' }}>
                {t('{{count}} mois sélectionné(s) — fréquence : {{freq}}', {
                  count: selectedMois.length,
                  freq: selectedMois.length === 1 ? t('annuelle') : selectedMois.length === 2 ? t('semestrielle') : selectedMois.length === 3 ? t('trimestrielle') : selectedMois.length === 4 ? t('trimestrielle') : selectedMois.length === 12 ? t('mensuelle') : t('personnalisée'),
                })}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>
                {t('Jour du mois')}
              </label>
              <input
                type="number"
                min="1"
                max="31"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.jour_du_mois}
                onChange={e => set('jour_du_mois', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>
                {t('Durée estimée (h)')}
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.duree_estimee}
                onChange={e => set('duree_estimee', e.target.value)}
                placeholder="Ex: 2.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Notes')}</label>
            <textarea
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder={t('Instructions de maintenance, matériel requis...')}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg transition-colors" style={{ color: 'var(--fg-muted)', background: 'var(--surface-2)' }}>
              {t('Annuler')}
            </button>
            <button type="submit" disabled={saving} className="flex items-center space-x-2 px-5 py-2 text-sm font-medium rounded-lg disabled:opacity-60 transition-colors" style={{ background: 'var(--brand)', color: '#fff' }}>
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? t('Sauvegarde...') : t('Enregistrer')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── INTERVENTION MODAL ───────────────────────────────────────────────────────

function InterventionModal({ open, onClose, equipements, forcedType, onSave }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ ...EMPTY_INTERVENTION_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_INTERVENTION_FORM, type: forcedType || 'preventive' });
      setError('');
    }
  }, [open, forcedType]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipement_id) { setError(t('Veuillez sélectionner un équipement.')); return; }
    if (!form.date_planifiee) { setError(t('La date planifiée est requise.')); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ ...form, equipement_id: parseInt(form.equipement_id) });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  };

  const isCorrective = form.type === 'corrective';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', borderRadius: 'var(--radius-4)' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
            {isCorrective ? t('Déclarer une panne') : t('Nouvelle intervention')}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg p-3 flex items-center space-x-2" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Type')}</label>
            <select
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={form.type}
              onChange={e => set('type', e.target.value)}
              disabled={!!forcedType}
            >
              <option value="preventive">{t('Préventive')}</option>
              <option value="corrective">{t('Corrective')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>
              {t('Équipement')} <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <select
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={form.equipement_id}
              onChange={e => set('equipement_id', e.target.value)}
            >
              <option value="">{t('-- Sélectionner un équipement --')}</option>
              {equipements.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nom}{eq.service ? ` (${eq.service})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Priorité')}</label>
              <select
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.priorite}
                onChange={e => set('priorite', e.target.value)}
              >
                <option value="faible">{t('Faible')}</option>
                <option value="normal">{t('Normal')}</option>
                <option value="urgent">{t('Urgent')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>
                {t('Date planifiée')} <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="date"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.date_planifiee}
                onChange={e => set('date_planifiee', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Technicien')}</label>
            <input
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={form.technicien_id}
              onChange={e => set('technicien_id', e.target.value)}
              placeholder={t('Nom du technicien...')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Description')}</label>
            <textarea
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder={t("Description de l'intervention...")}
            />
          </div>

          {isCorrective && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Signalé par')}</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.signale_par}
                onChange={e => set('signale_par', e.target.value)}
                placeholder={t('Nom de la personne ayant signalé la panne...')}
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg transition-colors" style={{ color: 'var(--fg-muted)', background: 'var(--surface-2)' }}>
              {t('Annuler')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-5 py-2 text-sm font-medium rounded-lg disabled:opacity-60 transition-colors"
              style={{ background: isCorrective ? 'var(--danger)' : 'var(--brand)', color: '#fff' }}
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? t('Sauvegarde...') : isCorrective ? t('Déclarer') : t('Créer')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── COMPLETE MODAL ───────────────────────────────────────────────────────────

function CompleteModal({ open, onClose, intervention, onComplete }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ ...EMPTY_COMPLETE_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_COMPLETE_FORM });
      setError('');
    }
  }, [open]);

  if (!open || !intervention) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onComplete(intervention.id, {
        ...form,
        duree_reelle: form.duree_reelle ? parseFloat(form.duree_reelle) : null,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('Erreur lors de la clôture'));
    } finally {
      setSaving(false);
    }
  };

  const eqName = intervention.equipement?.nom || intervention.equipement_nom || t('Équipement');
  const datePlan = intervention.date_planifiee
    ? new Date(intervention.date_planifiee).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR')
    : '';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', borderRadius: 'var(--radius-4)' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>{t("Clôturer l'intervention")}</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--fg-subtle)' }}>{eqName}{datePlan ? ` — ${datePlan}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg p-3 flex items-center space-x-2" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Actions effectuées')}</label>
            <textarea
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={form.actions_effectuees}
              onChange={e => set('actions_effectuees', e.target.value)}
              placeholder={t('Décrivez les actions réalisées...')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Pièces/consommables remplacés')}</label>
            <textarea
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={form.pieces_remplacees}
              onChange={e => set('pieces_remplacees', e.target.value)}
              placeholder={t('Pièces, filtres, consommables remplacés...')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Durée réelle (heures)')}</label>
            <input
              type="number"
              min="0"
              step="0.5"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={form.duree_reelle}
              onChange={e => set('duree_reelle', e.target.value)}
              placeholder="Ex: 2.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Observations')}</label>
            <textarea
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={form.observations}
              onChange={e => set('observations', e.target.value)}
              placeholder={t('Remarques, recommandations...')}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg transition-colors" style={{ color: 'var(--fg-muted)', background: 'var(--surface-2)' }}>
              {t('Annuler')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-5 py-2 text-sm font-medium rounded-lg disabled:opacity-60 transition-colors" style={{ background: 'var(--success)', color: '#fff' }}
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              <span>{saving ? t('Clôture...') : t('Clôturer')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── INTERVENTION CARD ────────────────────────────────────────────────────────

function InterventionCard({ intervention, onStatusChange, onComplete, onDelete }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [actioning, setActioning] = useState(false);
  const { confirm, ConfirmModalRenderer } = useConfirm();

  const eq = intervention.equipement || {};
  const eqName = eq.nom || intervention.equipement_nom || t('Équipement inconnu');
  const service = eq.service || intervention.service || '';
  const sc = getServiceColor(service);

  const stCfg = INTERVENTION_STATUT_CONFIG[intervention.statut] || INTERVENTION_STATUT_CONFIG.planifiee;
  const prCfg = PRIORITE_CONFIG[intervention.priorite] || PRIORITE_CONFIG.normal;

  const isPreventive = intervention.type === 'preventive';
  const datePlan = intervention.date_planifiee
    ? new Date(intervention.date_planifiee).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR')
    : '—';
  const dateReal = intervention.date_realisation
    ? new Date(intervention.date_realisation).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR')
    : null;

  const doStatusChange = async (newStatut) => {
    setActioning(true);
    try { await onStatusChange(intervention.id, newStatut); }
    catch (e) { toast(e.response?.data?.message || e.message); }
    finally { setActioning(false); }
  };

  const doDelete = async () => {
    if (!(await confirm({ title: t("Supprimer l'intervention"), message: t('Supprimer cette intervention ?'), confirmLabel: t('Supprimer'), variant: 'danger' }))) return;
    setActioning(true);
    try { await onDelete(intervention.id); }
    catch (e) { toast(e.response?.data?.message || e.message); }
    finally { setActioning(false); }
  };

  return (
    <>
    {ConfirmModalRenderer}
    <div className="rounded-lg shadow-sm hover:shadow-md transition-shadow" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="p-4">
        {/* Top row */}
        <div className="flex flex-wrap items-start gap-2 mb-3">
          <span className="font-semibold text-sm flex-1 min-w-0 truncate" style={{ color: 'var(--fg)' }}>{eqName}</span>
          <div className="flex flex-wrap gap-1.5 flex-shrink-0">
            {service && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: sc.bg, color: sc.text }}>
                {service}
              </span>
            )}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border" style={isPreventive ? { background: 'var(--brand-soft)', color: 'var(--brand)', border: '1px solid var(--brand)' } : { background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
              {isPreventive ? t('Préventive') : t('Corrective')}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={prCfg.style}>
              {prCfg.label}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={stCfg.style}>
              {stCfg.label}
            </span>
          </div>
        </div>

        {/* Middle info row */}
        <div className="flex flex-wrap gap-4 text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {datePlan}
          </span>
          {intervention.technicien_id && (
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {intervention.technicien_id}
            </span>
          )}
          {intervention.description && (
            <span className="flex-1 min-w-0 truncate">{intervention.description}</span>
          )}
        </div>

        {/* Terminée details accordion */}
        {intervention.statut === 'terminee' && dateReal && (
          <div className="mb-3">
            <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--success)' }}>
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{t('Terminée le {{date}}', { date: dateReal })}</span>
            </div>
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--brand)' }}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? t('Masquer les détails') : t('Voir les détails')}
            </button>
            {expanded && (
              <div className="mt-2 p-3 rounded-lg space-y-2 text-xs" style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>
                {intervention.actions_effectuees && (
                  <div><span className="font-medium">{t('Actions effectuées')} :</span> {intervention.actions_effectuees}</div>
                )}
                {intervention.pieces_remplacees && (
                  <div><span className="font-medium">{t('Pièces remplacées')} :</span> {intervention.pieces_remplacees}</div>
                )}
                {intervention.duree_reelle != null && (
                  <div><span className="font-medium">{t('Durée réelle')} :</span> {intervention.duree_reelle}h</div>
                )}
                {intervention.observations && (
                  <div><span className="font-medium">{t('Observations')} :</span> {intervention.observations}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {intervention.statut === 'planifiee' && (
            <>
              <button
                onClick={() => doStatusChange('en_cours')}
                disabled={actioning}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}
              >
                <PlayCircle className="w-3.5 h-3.5" />
                {t('Démarrer')}
              </button>
              <button
                onClick={() => onComplete(intervention)}
                disabled={actioning}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {t('Terminer')}
              </button>
              <button
                onClick={() => doStatusChange('reportee')}
                disabled={actioning}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50" style={{ background: 'rgba(234,88,12,0.1)', color: '#c2410c' }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('Reporter')}
              </button>
            </>
          )}
          {intervention.statut === 'en_cours' && (
            <>
              <button
                onClick={() => onComplete(intervention)}
                disabled={actioning}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {t('Terminer')}
              </button>
              <button
                onClick={() => doStatusChange('reportee')}
                disabled={actioning}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50" style={{ background: 'rgba(234,88,12,0.1)', color: '#c2410c' }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('Reporter')}
              </button>
            </>
          )}
          {intervention.statut === 'reportee' && (
            <button
              onClick={() => doStatusChange('planifiee')}
              disabled={actioning}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
            >
              <Calendar className="w-3.5 h-3.5" />
              {t('Réplanifier')}
            </button>
          )}
          <button
            onClick={doDelete}
            disabled={actioning}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ml-auto" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
          >
            {actioning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {t('Supprimer')}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// ─── INTERVENTIONS TAB ────────────────────────────────────────────────────────

function InterventionsTab({ equipements, services = [] }) {
  const { t } = useTranslation();
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ type: '', statut: '', service: '' });
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState(null);
  const [forcedType, setForcedType] = useState(null);
  const [generating, setGenerating] = useState(false);
  const { confirm, ConfirmModalRenderer } = useConfirm();

  const fetchInterventions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.statut) params.statut = filters.statut;
      if (filters.service) params.service = filters.service;
      const res = await gmaoAPI.getInterventions(params);
      setInterventions(res.data.data || res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('Erreur de chargement'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchInterventions(); }, [fetchInterventions]);

  const handleCreateIntervention = async (data) => {
    await gmaoAPI.createIntervention(data);
    await fetchInterventions();
  };

  const handleCompleteIntervention = async (id, data) => {
    await gmaoAPI.completeIntervention(id, data);
    await fetchInterventions();
  };

  const handleDeleteIntervention = async (id) => {
    await gmaoAPI.deleteIntervention(id);
    await fetchInterventions();
  };

  const handleStatusChange = async (id, newStatut) => {
    await gmaoAPI.updateIntervention(id, { statut: newStatut });
    await fetchInterventions();
  };

  const handleGenerateInterventions = async () => {
    const year = new Date().getFullYear();
    if (!(await confirm({ title: t('Générer les interventions'), message: t('Générer les interventions préventives pour {{year}} depuis les plans de maintenance ?', { year }), confirmLabel: t('Générer'), variant: 'info' }))) return;
    setGenerating(true);
    try {
      const res = await gmaoAPI.generatePreventiveInterventions({ annee: year });
      const count = res.data?.created || res.data?.count || 0;
      toast(t('{{count}} intervention(s) préventive(s) générée(s) pour {{year}}.', { count, year }));
      await fetchInterventions();
    } catch (err) {
      toast(err.response?.data?.message || err.message || t('Erreur lors de la génération'));
    } finally {
      setGenerating(false);
    }
  };

  const openCorrectiveModal = () => {
    setForcedType('corrective');
    setShowInterventionModal(true);
  };

  const openCompleteModal = (intervention) => {
    setSelectedIntervention(intervention);
    setShowCompleteModal(true);
  };

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  // Stats counters
  const countByStatut = {
    planifiee: interventions.filter(i => i.statut === 'planifiee').length,
    en_cours:  interventions.filter(i => i.statut === 'en_cours').length,
    terminee:  interventions.filter(i => i.statut === 'terminee').length,
    reportee:  interventions.filter(i => i.statut === 'reportee').length,
  };

  return (
    <>
    {ConfirmModalRenderer}
    <div className="space-y-6">
      {/* Mini stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t('Planifiées')} value={countByStatut.planifiee} icon={Calendar} color="var(--brand)" bg="var(--brand-soft)" />
        <StatCard label={t('En cours')} value={countByStatut.en_cours} icon={PlayCircle} color="var(--warning)" bg="var(--warning-soft)" />
        <StatCard label={t('Terminées')} value={countByStatut.terminee} icon={CheckCircle} color="var(--success)" bg="var(--success-soft)" />
        <StatCard label={t('Reportées')} value={countByStatut.reportee} icon={RotateCcw} color="var(--info)" bg="var(--info-soft)" />
      </div>

      {/* Top action bar */}
      <div className="rounded-lg shadow-sm p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={openCorrectiveModal}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ background: 'var(--danger)', color: '#fff' }}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{t('Déclarer une panne')}</span>
          </button>

          <button
            onClick={handleGenerateInterventions}
            disabled={generating}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors" style={{ background: 'var(--brand)', color: '#fff' }}
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>{t('Générer préventives')}</span>
          </button>

          <div className="flex items-center space-x-2 ml-auto">
            <Filter className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--fg-subtle)' }} />
            <select
              className="rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={filters.type}
              onChange={e => setFilter('type', e.target.value)}
            >
              <option value="">{t('Toutes (types)')}</option>
              <option value="preventive">{t('Préventive')}</option>
              <option value="corrective">{t('Corrective')}</option>
            </select>
            <select
              className="rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={filters.statut}
              onChange={e => setFilter('statut', e.target.value)}
            >
              <option value="">{t('Tous (statuts)')}</option>
              <option value="planifiee">{t('Planifiée')}</option>
              <option value="en_cours">{t('En cours')}</option>
              <option value="terminee">{t('Terminée')}</option>
              <option value="reportee">{t('Reportée')}</option>
            </select>
            <select
              className="rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={filters.service}
              onChange={e => setFilter('service', e.target.value)}
            >
              <option value="">{t('Tous (services)')}</option>
              {services.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg p-4 flex items-center space-x-3" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cards list */}
      {loading ? (
        <div className="flex items-center justify-center py-16" style={{ color: 'var(--fg-muted)' }}>
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Chargement des interventions...</span>
        </div>
      ) : interventions.length === 0 ? (
        <div className="rounded-lg p-12 flex flex-col items-center justify-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg-subtle)' }}>
          <Wrench className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium" style={{ color: 'var(--fg-muted)' }}>Aucune intervention</p>
          <p className="text-sm mt-1 text-center">
            Cliquez sur &quot;Générer préventives&quot; pour créer les interventions depuis les plans.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {interventions.map(intervention => (
            <InterventionCard
              key={intervention.id}
              intervention={intervention}
              onStatusChange={handleStatusChange}
              onComplete={openCompleteModal}
              onDelete={handleDeleteIntervention}
            />
          ))}
        </div>
      )}

      {interventions.length > 0 && (
        <div className="text-xs text-center" style={{ color: 'var(--fg-subtle)' }}>
          {interventions.length} intervention{interventions.length > 1 ? 's' : ''} affichée{interventions.length > 1 ? 's' : ''}
        </div>
      )}

      {/* Modals */}
      <InterventionModal
        open={showInterventionModal}
        onClose={() => { setShowInterventionModal(false); setForcedType(null); }}
        equipements={equipements}
        forcedType={forcedType}
        onSave={handleCreateIntervention}
      />

      <CompleteModal
        open={showCompleteModal}
        onClose={() => { setShowCompleteModal(false); setSelectedIntervention(null); }}
        intervention={selectedIntervention}
        onComplete={handleCompleteIntervention}
      />
    </div>
    </>
  );
}

// ─── EQUIPEMENTS TAB ─────────────────────────────────────────────────────────

function EquipementsTab({ equipements, stats, loading, onRefresh, services = [], onViewFiche }) {
  const [search, setSearch] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planTarget, setPlanTarget] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { confirm, ConfirmModalRenderer } = useConfirm();

  const filtered = equipements.filter(eq => {
    if (filterService && eq.service !== filterService) return false;
    if (filterStatut && eq.statut !== filterStatut) return false;
    if (search) {
      const q = search.toLowerCase();
      return (eq.nom || '').toLowerCase().includes(q) ||
             (eq.reference || '').toLowerCase().includes(q) ||
             (eq.marque || '').toLowerCase().includes(q) ||
             (eq.modele || '').toLowerCase().includes(q);
    }
    return true;
  });

  const handleSaveEq = async (form) => {
    if (editTarget?.id) {
      await gmaoAPI.updateEquipement(editTarget.id, form);
    } else {
      await gmaoAPI.createEquipement(form);
    }
    onRefresh();
  };

  const handleDelete = async (id) => {
    if (!(await confirm({ title: 'Supprimer l\'équipement', message: 'Supprimer cet équipement et tous ses plans de maintenance ?', confirmLabel: 'Supprimer', variant: 'danger' }))) return;
    setDeleting(id);
    try {
      await gmaoAPI.deleteEquipement(id);
      onRefresh();
    } catch (err) {
      toast(err.response?.data?.message || err.message);
    } finally {
      setDeleting(null);
    }
  };

  const finDeVie = equipements.filter(e => {
    const s = getAmortissementStatus(e);
    return s && s.urgent;
  });

  return (
    <>
    {ConfirmModalRenderer}
    <div className="space-y-6">
      {/* Bannière alerte fin de vie */}
      {finDeVie.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(234,88,12,0.08)', border: '1px solid #f97316', color: '#c2410c' }}>
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#f97316' }} />
          <div>
            <span className="font-semibold">{finDeVie.length} équipement{finDeVie.length > 1 ? 's' : ''} en fin d'amortissement</span>
            <span className="ml-2" style={{ color: '#ea580c' }}>— {finDeVie.map(e => e.nom).join(', ')}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total équipements" value={stats?.totalEquipements ?? equipements.length} icon={Package} color="var(--brand)" bg="var(--brand-soft)" />
        <StatCard label="Actifs" value={stats?.actifs ?? equipements.filter(e => e.statut === 'actif').length} icon={CheckCircle} color="var(--success)" bg="var(--success-soft)" />
        <StatCard label="En réparation" value={stats?.enReparation ?? equipements.filter(e => e.statut === 'en_reparation').length} icon={Clock} color="var(--warning)" bg="var(--warning-soft)" />
        <StatCard label="Hors service" value={stats?.horsService ?? equipements.filter(e => e.statut === 'hors_service').length} icon={AlertCircle} color="var(--danger)" bg="var(--danger-soft)" />
        <StatCard label="Fin de vie ≤1 an" value={finDeVie.length} icon={AlertTriangle} color="var(--warning)" bg="var(--warning-soft)" />
      </div>

      {/* Filter bar */}
      <div className="rounded-lg shadow-sm p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--fg-subtle)' }} />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              placeholder="Rechercher équipement, référence, marque..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4" style={{ color: 'var(--fg-subtle)' }} />
            <select
              className="rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={filterService}
              onChange={e => setFilterService(e.target.value)}
            >
              <option value="">Tous services</option>
              {services.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              className="rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={filterStatut}
              onChange={e => setFilterStatut(e.target.value)}
            >
              <option value="">Tous statuts</option>
              <option value="actif">Actif</option>
              <option value="en_reparation">En réparation</option>
              <option value="hors_service">Hors service</option>
            </select>
          </div>

          <button
            onClick={() => { setEditTarget(null); setModalOpen(true); }}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ml-auto" style={{ background: 'var(--brand)', color: '#fff' }}
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16" style={{ color: 'var(--fg-muted)' }}>
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Chargement...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--fg-subtle)' }}>
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">Aucun équipement trouvé</p>
            <p className="text-sm mt-1">Ajoutez votre premier équipement via le bouton ci-dessus</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--fg-muted)' }}>Nom</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--fg-muted)' }}>Référence</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--fg-muted)' }}>Service</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--fg-muted)' }}>Type</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--fg-muted)' }}>Marque / Modèle</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--fg-muted)' }}>Statut</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--fg-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(eq => {
                  const sc = getServiceColor(eq.service);
                  const stCfg = STATUT_CONFIG[eq.statut] || STATUT_CONFIG.actif;
                  const amort = getAmortissementStatus(eq);
                  return (
                    <tr key={eq.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)', background: amort?.urgent ? 'rgba(234,88,12,0.04)' : undefined }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium" style={{ color: 'var(--fg)' }}>{eq.nom}</p>
                          {amort && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold" style={amort.style} title={`Mise au rebus : ${new Date(eq.date_mise_au_rebus).toLocaleDateString('fr-FR')}`}>
                              <AlertTriangle className="w-3 h-3" />{amort.label}
                            </span>
                          )}
                        </div>
                        {eq.numero_serie && <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>SN: {eq.numero_serie}</p>}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--fg-muted)' }}>{eq.reference || <span style={{ color: 'var(--fg-subtle)' }}>—</span>}</td>
                      <td className="px-4 py-3">
                        {eq.service ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: sc.bg, color: sc.text }}>{eq.service}</span>
                        ) : <span style={{ color: 'var(--fg-subtle)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--fg-muted)' }}>{eq.type_equipement || <span style={{ color: 'var(--fg-subtle)' }}>—</span>}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--fg-muted)' }}>
                        {eq.marque || eq.modele ? `${eq.marque || ''} ${eq.modele || ''}`.trim() : <span style={{ color: 'var(--fg-subtle)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={stCfg.style}>
                          {stCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onViewFiche && onViewFiche(eq.id)}
                            className="p-1.5 rounded transition-colors" style={{ color: '#6366f1' }}
                            title="Fiche de vie"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditTarget(eq); setModalOpen(true); }}
                            className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--brand)' }}
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setPlanTarget(eq); setPlanModalOpen(true); }}
                            className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--success)' }}
                            title="Ajouter un plan de maintenance"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(eq.id)}
                            disabled={deleting === eq.id}
                            className="p-1.5 rounded-lg transition-colors disabled:opacity-40" style={{ color: 'var(--danger)' }}
                            title="Supprimer"
                          >
                            {deleting === eq.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-subtle)' }}>
              {filtered.length} équipement{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
              {filtered.length !== equipements.length && ` sur ${equipements.length} au total`}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <EquipementModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        initial={editTarget}
        onSave={handleSaveEq}
        services={services}
      />

      <PlanModal
        open={planModalOpen}
        onClose={() => { setPlanModalOpen(false); setPlanTarget(null); }}
        initial={planTarget ? { ...EMPTY_PLAN, equipement_id: planTarget.id } : null}
        equipements={equipements}
        onSave={async (form) => {
          await gmaoAPI.createPlan(form);
          onRefresh();
        }}
      />
    </div>
    </>
  );
}

// ─── CALENDAR TAB ─────────────────────────────────────────────────────────────

function CalendarTab({ stats }) {
  const { t } = useTranslation();
  const [year, setYear] = useState(new Date().getFullYear());
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tooltip, setTooltip] = useState(null); // { entries, x, y }

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await gmaoAPI.getCalendar(year);
      setCalendarData(res.data.data || {});
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  // Count total scheduled interventions
  const totalInterventions = Object.values(calendarData).reduce((acc, monthData) => {
    return acc + Object.values(monthData).reduce((a, entries) => a + entries.length, 0);
  }, 0);

  const daysInMonth = (month) => new Date(year, month, 0).getDate();

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="rounded-lg shadow-sm p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 rounded-lg p-1" style={{ background: 'var(--surface-2)' }}>
              <button
                onClick={() => setYear(y => y - 1)}
                className="p-1.5 rounded-md transition-colors" style={{ color: 'var(--fg-muted)' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-sm font-bold min-w-16 text-center" style={{ color: 'var(--fg)' }}>{year}</span>
              <button
                onClick={() => setYear(y => y + 1)}
                className="p-1.5 rounded-md transition-colors" style={{ color: 'var(--fg-muted)' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1 rounded-lg text-sm font-semibold" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                {t('{{count}} intervention(s) planifiée(s)', { count: totalInterventions })}
              </div>
              {stats && (
                <div className="px-3 py-1 rounded-lg text-sm font-semibold" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                  {t('{{count}} plan(s) actif(s)', { count: stats.totalPlans ?? 0 })}
                </div>
              )}
            </div>
          </div>

          {/* Service legend */}
          <div className="flex flex-wrap gap-2">
            {SERVICES.slice(0, 8).map(s => {
              const c = getServiceColor(s);
              return (
                <span key={s} className="flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-medium" style={{ background: c.bg, color: c.text }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: c.chip }}></span>
                  <span>{s}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg p-4 flex items-center space-x-2" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Calendar grid */}
      <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20" style={{ color: 'var(--fg-muted)' }}>
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>{t('Chargement du calendrier...')}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 px-3 py-3 text-center font-semibold min-w-12" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', color: 'var(--fg-muted)' }}>J</th>
                  {MONTH_LABELS.map((lbl, idx) => (
                    <th key={idx} className="px-2 py-3 text-center font-bold min-w-28" style={{ borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', color: 'var(--fg-muted)', background: 'var(--surface-2)' }}>
                      <div>{lbl}</div>
                      <div className="font-normal text-xs" style={{ color: 'var(--fg-subtle)' }}>{year}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <tr key={day} className="transition-colors">
                    <td className="sticky left-0 z-10 px-3 py-1.5 text-center font-semibold text-xs" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', color: 'var(--fg-subtle)' }}>
                      {day}
                    </td>
                    {Array.from({ length: 12 }, (_, mIdx) => {
                      const month = mIdx + 1;
                      const maxDay = daysInMonth(month);
                      const entries = calendarData[month]?.[day] || [];
                      const isInvalid = day > maxDay;

                      return (
                        <td
                          key={month}
                          className="px-1 py-1 align-top"
                          style={{ minHeight: '2rem', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', background: isInvalid ? 'var(--surface-2)' : undefined }}
                        >
                          {isInvalid ? (
                            <span className="block w-full h-4 rounded opacity-30" style={{ background: 'var(--border)' }}></span>
                          ) : entries.length > 0 ? (
                            <div className="space-y-0.5">
                              {entries.map((entry, eIdx) => {
                                const sc = getServiceColor(entry.service);
                                const truncated = entry.nom.length > 14 ? entry.nom.slice(0, 13) + '…' : entry.nom;
                                return (
                                  <div
                                    key={eIdx}
                                    title={`${entry.nom}\n${t('Service')}: ${entry.service || 'N/A'}\n${t('Durée')}: ${entry.duree ? entry.duree + 'h' : 'N/A'}${entry.notes ? '\n' + entry.notes : ''}`}
                                    className="flex items-center px-1.5 py-0.5 rounded text-xs font-medium cursor-default truncate"
                                    style={{ background: sc.chip, color: '#fff', fontSize: '10px', lineHeight: '1.4' }}
                                  >
                                    {truncated}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Plans list summary */}
      {!loading && totalInterventions > 0 && (
        <div className="rounded-lg shadow-sm p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold mb-3 flex items-center space-x-2" style={{ color: 'var(--fg)' }}>
            <List className="w-4 h-4" style={{ color: 'var(--brand)' }} />
            <span>{t('Répartition par mois')}</span>
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
              const monthData = calendarData[m] || {};
              const count = Object.values(monthData).reduce((a, arr) => a + arr.length, 0);
              return (
                <div key={m} className="rounded-lg p-2.5 text-center" style={{ background: count > 0 ? 'var(--brand-soft)' : 'var(--surface-2)' }}>
                  <p className="text-xs font-semibold" style={{ color: count > 0 ? 'var(--brand)' : 'var(--fg-subtle)' }}>{MONTH_LABELS[m - 1]}</p>
                  <p className="text-xl font-bold mt-0.5" style={{ color: count > 0 ? 'var(--brand)' : 'var(--fg-subtle)' }}>{count}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ANALYSE TAB ─────────────────────────────────────────────────────────────

const MONTH_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const AnalyseTab = ({ analytics, loading, onViewRapport, equipements }) => {
  const { t } = useTranslation();
  const [selectedEquipement, setSelectedEquipement] = useState('');

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8" style={{ borderBottom: '2px solid var(--brand)' }} /></div>;
  if (!analytics) return null;

  const maxMonth = Math.max(...analytics.byMonth.map(m => m.total), 1);
  const maxService = Math.max(...analytics.byService.map(s => s.total), 1);
  const totalTypes = analytics.preventiveCount + analytics.correctiveCount;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Taux de conformité */}
        <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{t('Taux de conformité')}</span>
            <CheckCircle className="w-4 h-4" style={{ color: 'var(--success)' }} />
          </div>
          <div className="text-3xl font-bold" style={{ color: 'var(--success)' }}>{analytics.tauxConformite}%</div>
          <div className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{t('{{done}} / {{total}} préventives', { done: analytics.termineeThisYear, total: analytics.totalThisYear })}</div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${analytics.tauxConformite}%`, background: 'var(--success)' }} />
          </div>
        </div>

        {/* En retard */}
        <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{t('En retard')}</span>
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
          </div>
          <div className="text-3xl font-bold" style={{ color: analytics.enRetard > 0 ? 'var(--danger)' : 'var(--fg-subtle)' }}>{analytics.enRetard}</div>
          <div className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{t('interventions en retard')}</div>
        </div>

        {/* En cours */}
        <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{t('En cours')}</span>
            <PlayCircle className="w-4 h-4" style={{ color: 'var(--warning)' }} />
          </div>
          <div className="text-3xl font-bold" style={{ color: 'var(--warning)' }}>{analytics.enCours}</div>
          <div className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{t('en cours actuellement')}</div>
        </div>

        {/* Durée moyenne */}
        <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{t('Durée moy. réalisation')}</span>
            <Clock className="w-4 h-4" style={{ color: 'var(--brand)' }} />
          </div>
          <div className="text-3xl font-bold" style={{ color: 'var(--brand)' }}>{analytics.avgDuree ?? '—'}{analytics.avgDuree ? 'h' : ''}</div>
          <div className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{t('par intervention terminée')}</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart: Interventions par mois */}
        <div className="lg:col-span-2 rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg-muted)' }}>{t('Interventions par mois ({{year}})', { year: new Date().getFullYear() })}</h3>
          <div className="flex items-end gap-1 h-32">
            {analytics.byMonth.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center justify-end" style={{ height: '96px' }}>
                  <div
                    className="w-full rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-default relative"
                    style={{ height: `${maxMonth > 0 ? Math.max((m.total / maxMonth) * 96, m.total > 0 ? 4 : 0) : 0}px`, background: 'var(--brand)' }}
                    title={t('{{count}} interventions', { count: m.total })}
                  >
                    {m.corrective > 0 && (
                      <div
                        className="w-full rounded-t absolute bottom-0"
                        style={{ height: `${(m.corrective / m.total) * 100}%`, background: 'var(--danger)' }}
                      />
                    )}
                    {m.total > 0 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap" style={{ color: 'var(--fg-muted)' }}>{m.total}</span>
                    )}
                  </div>
                </div>
                <span className="text-[9px]" style={{ color: 'var(--fg-subtle)' }}>{MONTH_SHORT[m.month - 1]}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ background: 'var(--brand)' }}/><span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{t('Préventive')}</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ background: 'var(--danger)' }}/><span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{t('Corrective')}</span></div>
          </div>
        </div>

        {/* Preventive vs Corrective donut-style */}
        <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg-muted)' }}>{t('Répartition par type')}</h3>
          {totalTypes > 0 ? (
            <>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium" style={{ color: 'var(--brand)' }}>{t('Préventives')}</span>
                    <span style={{ color: 'var(--fg-subtle)' }}>{analytics.preventiveCount} ({Math.round(analytics.preventiveCount/totalTypes*100)}%)</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(analytics.preventiveCount/totalTypes)*100}%`, background: 'var(--brand)' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium" style={{ color: 'var(--danger)' }}>{t('Correctives')}</span>
                    <span style={{ color: 'var(--fg-subtle)' }}>{analytics.correctiveCount} ({Math.round(analytics.correctiveCount/totalTypes*100)}%)</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(analytics.correctiveCount/totalTypes)*100}%`, background: 'var(--danger)' }} />
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="text-center text-2xl font-bold" style={{ color: 'var(--fg-muted)' }}>{totalTypes}</div>
                <div className="text-center text-xs" style={{ color: 'var(--fg-subtle)' }}>{t('total interventions {{year}}', { year: new Date().getFullYear() })}</div>
              </div>
            </>
          ) : (
            <div className="text-center text-sm mt-8" style={{ color: 'var(--fg-subtle)' }}>{t('Aucune donnée')}</div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Service distribution */}
        <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg-muted)' }}>{t('Interventions par service')}</h3>
          {analytics.byService.length > 0 ? (
            <div className="space-y-2">
              {analytics.byService.slice(0, 8).map(s => {
                const color = SERVICE_COLORS[s.service] || SERVICE_COLORS['ADMIN'];
                const pct = Math.round((s.terminee / s.total) * 100);
                return (
                  <div key={s.service}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="font-medium" style={{ color: color.text }}>{s.service}</span>
                      <span style={{ color: 'var(--fg-subtle)' }}>{t('{{total}} ({{pct}}% terminées)', { total: s.total, pct })}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(s.total / maxService) * 100}%`, background: color.chip }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-sm mt-8" style={{ color: 'var(--fg-subtle)' }}>{t('Aucune donnée')}</div>
          )}
        </div>

        {/* Top équipements défaillants */}
        <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg-muted)' }}>{t('Top équipements défaillants')}</h3>
          {analytics.topDefaillants.length > 0 ? (
            <div className="space-y-2">
              {analytics.topDefaillants.slice(0, 6).map((item, idx) => {
                const color = SERVICE_COLORS[item.equipement?.service] || SERVICE_COLORS['ADMIN'];
                return (
                  <div key={item.equipement?.id} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold" style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: 'var(--fg-muted)' }}>{item.equipement?.nom}</div>
                      <span className="text-[10px] px-1 rounded" style={{ background: color.bg, color: color.text }}>{item.equipement?.service}</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: 'var(--danger)' }}>{t('{{count}} pannes', { count: item.nbPannes })}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-sm mt-8" style={{ color: 'var(--fg-subtle)' }}>{t('Aucune panne enregistrée')}</div>
          )}
        </div>
      </div>

      {/* Overdue interventions */}
      {analytics.overdueList?.length > 0 && (
        <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--danger)' }}>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--danger)' }}>
            <AlertTriangle className="w-4 h-4" />
            {t('Interventions en retard ({{count}})', { count: analytics.enRetard })}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left" style={{ borderBottom: '1px solid var(--border)', color: 'var(--fg-subtle)' }}>
                <th className="pb-2">{t('Équipement')}</th><th className="pb-2">{t('Service')}</th><th className="pb-2">{t('Type')}</th><th className="pb-2">{t('Date planifiée')}</th><th className="pb-2">{t('Retard')}</th>
              </tr></thead>
              <tbody>
                {analytics.overdueList.map(i => {
                  const days = Math.floor((new Date() - new Date(i.date_planifiee)) / 86400000);
                  return (
                    <tr key={i.id} style={{ borderBottom: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
                      <td className="py-1.5 font-medium" style={{ color: 'var(--fg)' }}>{i.equipement?.nom}</td>
                      <td className="py-1.5">{i.equipement?.service}</td>
                      <td className="py-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px]" style={i.type === 'corrective' ? { background: 'var(--danger-soft)', color: 'var(--danger)' } : { background: 'var(--brand-soft)', color: 'var(--brand)' }}>{i.type}</span>
                      </td>
                      <td className="py-1.5">{new Date(i.date_planifiee).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR')}</td>
                      <td className="py-1.5 font-bold" style={{ color: 'var(--danger)' }}>{days}j</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rapport PDF section */}
      <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
          <FileText className="w-4 h-4" />
          {t('Rapport par équipement')}
        </h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <select
              value={selectedEquipement}
              onChange={e => setSelectedEquipement(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
            >
              <option value="">{t('-- Sélectionner un équipement --')}</option>
              {equipements.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nom} ({eq.service})</option>
              ))}
            </select>
          </div>
          <button
            disabled={!selectedEquipement}
            onClick={() => onViewRapport(selectedEquipement)}
            className="px-4 py-2 text-sm rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2" style={{ background: 'var(--brand)', color: '#fff' }}
          >
            <FileText className="w-4 h-4" />
            {t('Générer rapport')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── RAPPORT MODAL ────────────────────────────────────────────────────────────

const RapportModal = ({ rapport, loading, onClose }) => {
  const { t } = useTranslation();
  const rapportRef = useRef(null);

  const handlePrint = async () => {
    if (!rapportRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF } = await import('jspdf');
    const canvas = await html2canvas(rapportRef.current, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Rapport_${rapport?.equipement?.nom?.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="fixed inset-0 flex items-start justify-center z-50 p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="rounded-lg shadow-2xl w-full max-w-4xl my-4" style={{ background: 'var(--surface)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <FileText className="w-5 h-5" style={{ color: 'var(--brand)' }} />
            {t("Rapport d'équipement")}
          </h2>
          <div className="flex gap-2">
            {rapport && (
              <button onClick={handlePrint} className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-1" style={{ background: 'var(--brand)', color: '#fff' }}>
                <Download className="w-4 h-4" /> {t('Exporter PDF')}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--fg-muted)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8" style={{ borderBottom: '2px solid var(--brand)' }} />
          </div>
        ) : rapport ? (
          <div ref={rapportRef} className="p-6" style={{ background: '#ffffff' }}>
            {/* Equipment info */}
            <div className="mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>{rapport.equipement.nom}</h1>
                  <p style={{ color: '#6b7280' }}>{rapport.equipement.reference} • {rapport.equipement.service}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-medium" style={rapport.equipement.statut === 'actif' ? { background: '#d1fae5', color: '#065f46' } : rapport.equipement.statut === 'en_reparation' ? { background: '#fef9c3', color: '#854d0e' } : { background: '#fee2e2', color: '#991b1b' }}>
                  {t(rapport.equipement.statut)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {rapport.equipement.marque && <div><span style={{ color: '#9ca3af' }}>{t('Marque')}:</span> <span className="font-medium">{rapport.equipement.marque}</span></div>}
                {rapport.equipement.modele && <div><span style={{ color: '#9ca3af' }}>{t('Modèle')}:</span> <span className="font-medium">{rapport.equipement.modele}</span></div>}
                {rapport.equipement.numero_serie && <div><span style={{ color: '#9ca3af' }}>{t('N° Série')}:</span> <span className="font-medium">{rapport.equipement.numero_serie}</span></div>}
                {rapport.equipement.date_mise_en_service && <div><span style={{ color: '#9ca3af' }}>{t('Mise en service')}:</span> <span className="font-medium">{new Date(rapport.equipement.date_mise_en_service).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR')}</span></div>}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: t('Total interventions'), value: rapport.stats.total, bg: '#f9fafb', color: '#374151' },
                { label: t('Terminées'), value: rapport.stats.terminee, bg: '#d1fae5', color: '#065f46' },
                { label: t('Correctives'), value: rapport.stats.corrective, bg: '#fee2e2', color: '#991b1b' },
                { label: t('Durée moy.'), value: rapport.stats.avgDuree ? `${rapport.stats.avgDuree}h` : '—', bg: '#dbeafe', color: '#1e40af' },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-3" style={{ background: s.bg, color: s.color }}>
                  <div className="text-xl font-bold">{s.value}</div>
                  <div className="text-xs">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Interventions table */}
            <h3 className="font-semibold mb-3" style={{ color: '#111827' }}>{t('Historique des interventions')}</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {[t('Date'), t('Type'), t('Statut'), t('Technicien'), t('Durée'), t('Actions / Observations')].map(h => (
                    <th key={h} className="text-left p-2 font-medium" style={{ border: '1px solid #e5e7eb', color: '#4b5563' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rapport.interventions.map(i => (
                  <tr key={i.id}>
                    <td className="p-2" style={{ border: '1px solid #e5e7eb' }}>{new Date(i.date_planifiee).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR')}</td>
                    <td className="p-2" style={{ border: '1px solid #e5e7eb' }}>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={i.type === 'corrective' ? { background: '#fee2e2', color: '#991b1b' } : { background: '#dbeafe', color: '#1e40af' }}>{t(i.type)}</span>
                    </td>
                    <td className="p-2" style={{ border: '1px solid #e5e7eb' }}>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={i.statut === 'terminee' ? { background: '#d1fae5', color: '#065f46' } : i.statut === 'en_cours' ? { background: '#fef9c3', color: '#854d0e' } : i.statut === 'reportee' ? { background: '#ffedd5', color: '#9a3412' } : { background: '#f3f4f6', color: '#4b5563' }}>{t(i.statut)}</span>
                    </td>
                    <td className="p-2" style={{ border: '1px solid #e5e7eb' }}>{i.technicien ? `${i.technicien.firstName} ${i.technicien.lastName}` : '—'}</td>
                    <td className="p-2" style={{ border: '1px solid #e5e7eb' }}>{i.duree_reelle ? `${i.duree_reelle}h` : '—'}</td>
                    <td className="p-2 max-w-[200px]" style={{ border: '1px solid #e5e7eb' }}>
                      <div className="truncate">{i.actions_effectuees || i.observations || i.description || '—'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-xs text-right" style={{ color: '#9ca3af' }}>{t('Rapport généré le {{date}} — HSJM Workflow', { date: new Date().toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR') })}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ─── PANORAMA PANEL ──────────────────────────────────────────────────────────

function PanoramaPanel({ equipements = [], onRefresh }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [rapport, setRapport] = useState(null);
  const [loadingR, setLoadingR] = useState(false);

  const filtered = equipements.filter(eq =>
    !search || [eq.nom, eq.reference, eq.matricule, eq.service].some(v =>
      (v || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const loadRapport = async (id) => {
    setSelectedId(id);
    setLoadingR(true);
    try {
      const res = await gmaoAPI.getRapportEquipement(id);
      setRapport(res.data.data);
    } catch { setRapport(null); }
    finally { setLoadingR(false); }
  };

  const eq = rapport?.equipement;

  const STATUT_STYLE = {
    actif: { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' },
    en_reparation: { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' },
    hors_service: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
  };

  return (
    <div className="flex h-full min-h-[500px]">
      {/* Liste équipements */}
      <div className="w-72 flex flex-col flex-shrink-0" style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4" style={{ color: 'var(--fg-subtle)' }} />
            <input
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              placeholder={t('Rechercher un équipement…')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--fg-subtle)' }}>{t('Aucun équipement')}</div>
          ) : filtered.map(eq => {
            const col = STATUT_CONFIG[eq.statut] || STATUT_CONFIG.actif;
            const isSelected = selectedId === eq.id;
            return (
              <button
                key={eq.id}
                onClick={() => loadRapport(eq.id)}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{ borderBottom: '1px solid var(--border)', background: isSelected ? 'var(--brand-soft)' : undefined, borderLeft: isSelected ? '4px solid var(--brand)' : '4px solid transparent' }}
              >
                <div className="font-medium text-sm truncate" style={{ color: 'var(--fg)' }}>{eq.nom}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{eq.service || '—'}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={col.style}>
                    {col.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-2 text-center text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-subtle)' }}>
          {t('{{count}} équipement(s)', { count: filtered.length })}
        </div>
      </div>

      {/* Fiche équipement */}
      <div className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--surface-2)' }}>
        {!selectedId ? (
          <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: 'var(--fg-subtle)' }}>
            <Package className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">{t('Sélectionnez un équipement')}</p>
            <p className="text-xs mt-1">{t("pour afficher sa fiche d'identité")}</p>
          </div>
        ) : loadingR ? (
          <div className="flex justify-center items-center h-full">
            <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-teal)' }} />
          </div>
        ) : !rapport ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--fg-subtle)' }}>
            <AlertCircle className="w-8 h-8 mb-2" style={{ color: 'var(--danger)' }} />
            <p className="text-sm">{t('Erreur de chargement')}</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Header */}
            <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>{eq.nom}</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    {eq.service && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                        {eq.service}
                      </span>
                    )}
                    {eq.statut && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={STATUT_STYLE[eq.statut] || { background: 'var(--surface-2)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                        {STATUT_CONFIG[eq.statut]?.label || eq.statut}
                      </span>
                    )}
                    {eq.origine && (
                      <span className="text-xs px-2.5 py-1 rounded-full capitalize" style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>
                        {eq.origine}
                      </span>
                    )}
                  </div>
                </div>
                {eq.matricule && (
                  <div className="text-right">
                    <div className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{t('Matricule')}</div>
                    <div className="font-mono font-bold text-sm" style={{ color: 'var(--fg-muted)' }}>{eq.matricule}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Spécifications techniques */}
            <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                <FileText className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} /> {t('Spécifications')}
              </h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {[
                  [t('Marque'), eq.marque], [t('Modèle'), eq.modele],
                  [t('Type'), eq.type_equipement], [t('Référence'), eq.reference],
                  [t('N° Série'), eq.numero_serie], [t('Fournisseur'), eq.fournisseur],
                ].map(([label, val]) => val ? (
                  <div key={label}>
                    <span className="text-xs block" style={{ color: 'var(--fg-subtle)' }}>{label}</span>
                    <span className="font-medium" style={{ color: 'var(--fg)' }}>{val}</span>
                  </div>
                ) : null)}
              </div>
            </div>

            {/* Dates importantes */}
            <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                <Calendar className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} /> {t('Dates')}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs block" style={{ color: 'var(--fg-subtle)' }}>{t('Mise en service')}</span>
                  <span className="font-medium" style={{ color: 'var(--fg)' }}>
                    {eq.date_mise_en_service
                      ? new Date(eq.date_mise_en_service).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR')
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-xs block" style={{ color: 'var(--fg-subtle)' }}>{t('Fin de vie estimée')}</span>
                  <span className="font-medium" style={{ color: eq.date_mise_au_rebus && new Date(eq.date_mise_au_rebus) < new Date() ? 'var(--danger)' : 'var(--fg)' }}>
                    {eq.date_mise_au_rebus
                      ? new Date(eq.date_mise_au_rebus).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR')
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats maintenance */}
            {rapport.stats && (
              <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                  <Wrench className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} /> {t('Bilan Maintenance')}
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: t('Total'), val: rapport.stats.total, bg: 'var(--brand-soft)', color: 'var(--brand)' },
                    { label: t('Terminées'), val: rapport.stats.terminee, bg: 'var(--success-soft)', color: 'var(--success)' },
                    { label: t('Correctives'), val: rapport.stats.corrective, bg: 'rgba(234,88,12,0.1)', color: '#c2410c' },
                    { label: t('Préventives'), val: rapport.stats.preventive, bg: 'var(--accent-teal-soft)', color: 'var(--accent-teal)' },
                  ].map(({ label, val, bg, color }) => (
                    <div key={label} className="rounded-lg p-3 text-center" style={{ background: bg, color }}>
                      <div className="text-2xl font-bold">{val}</div>
                      <div className="text-xs font-medium mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
                {rapport.stats.avgDuree && (
                  <p className="text-xs mt-3 text-center" style={{ color: 'var(--fg-subtle)' }}>
                    {t("Durée moyenne d'intervention")} : <span className="font-semibold" style={{ color: 'var(--fg-muted)' }}>{rapport.stats.avgDuree}h</span>
                  </p>
                )}
              </div>
            )}

            {/* Historique des 5 dernières interventions */}
            {rapport.interventions?.length > 0 && (
              <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                  <Clock className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} /> {t('Dernières interventions')}
                </h3>
                <div className="space-y-2">
                  {rapport.interventions.slice(0, 5).map(iv => {
                    const sc = INTERVENTION_STATUT_CONFIG[iv.statut] || INTERVENTION_STATUT_CONFIG.planifiee;
                    return (
                      <div key={iv.id} className="flex items-center gap-3 p-2.5 rounded-lg text-sm" style={{ background: 'var(--surface-2)' }}>
                        <span className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--fg-subtle)' }}>
                          {iv.date_planifiee ? new Date(iv.date_planifiee).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR') : '—'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={sc.style}>
                          {sc.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded flex-shrink-0" style={iv.type === 'corrective' ? { background: 'rgba(234,88,12,0.1)', color: '#c2410c' } : { background: 'var(--accent-teal-soft)', color: 'var(--accent-teal)' }}>
                          {t(iv.type)}
                        </span>
                        <span className="truncate" style={{ color: 'var(--fg-muted)' }}>{iv.description || '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            {eq.notes && (
              <div className="rounded-lg p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>{t('Notes')}</h3>
                <p className="text-sm" style={{ color: '#92400e' }}>{eq.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LOCALISATION PANEL ───────────────────────────────────────────────────────

function LocalisationPanel({ equipements = [] }) {
  const { t } = useTranslation();
  const [filterStatut, setFilterStatut] = useState('');
  const [search, setSearch] = useState('');

  const filtered = equipements.filter(eq => {
    if (filterStatut && eq.statut !== filterStatut) return false;
    if (search && ![eq.nom, eq.service, eq.matricule, eq.reference].some(v =>
      (v || '').toLowerCase().includes(search.toLowerCase())
    )) return false;
    return true;
  });

  // Group by service
  const byService = {};
  filtered.forEach(eq => {
    const svc = eq.service || t('Non assigné');
    if (!byService[svc]) byService[svc] = [];
    byService[svc].push(eq);
  });
  const services = Object.keys(byService).sort();

  const STATUT_DOT_COLOR = {
    actif: 'var(--success)',
    en_reparation: 'var(--warning)',
    hors_service: 'var(--danger)',
  };

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4" style={{ color: 'var(--fg-subtle)' }} />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
            placeholder={t('Rechercher…')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="text-sm rounded-lg px-3 py-2 focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value)}
        >
          <option value="">{t('Tous les statuts')}</option>
          <option value="actif">{t('Actif')}</option>
          <option value="en_reparation">{t('En réparation')}</option>
          <option value="hors_service">{t('Hors service')}</option>
        </select>
        <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>{t('{{count}} équipement(s)', { count: filtered.length })}</span>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 mb-5">
        {[['actif', t('Actif'), 'var(--success)'], ['en_reparation', t('En réparation'), 'var(--warning)'], ['hors_service', t('Hors service'), 'var(--danger)']].map(([key, label, color]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--fg-muted)' }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>

      {/* Grille par service */}
      {services.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--fg-subtle)' }}>{t('Aucun équipement trouvé')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map(svc => {
            const eqs = byService[svc];
            const actifs = eqs.filter(e => e.statut === 'actif').length;
            const enRep = eqs.filter(e => e.statut === 'en_reparation').length;
            const hors = eqs.filter(e => e.statut === 'hors_service').length;
            return (
              <div key={svc} className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {/* Service header */}
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#1e293b' }}>
                  <span className="font-semibold text-sm" style={{ color: '#fff' }}>{svc}</span>
                  <span className="text-xs font-medium" style={{ color: '#cbd5e1' }}>{eqs.length} équip.</span>
                </div>
                {/* Mini stats */}
                <div className="grid grid-cols-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  {[['Actifs', actifs, 'var(--success)'], ['Répar.', enRep, 'var(--warning)'], ['H.S.', hors, 'var(--danger)']].map(([label, count, color], i) => (
                    <div key={label} className="py-2 text-center" style={i < 2 ? { borderRight: '1px solid var(--border)' } : {}}>
                      <div className="text-lg font-bold" style={{ color }}>{count}</div>
                      <div className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>{label}</div>
                    </div>
                  ))}
                </div>
                {/* Equipment list */}
                <div className="max-h-48 overflow-y-auto">
                  {eqs.map(eq => (
                    <div key={eq.id} className="flex items-center gap-2.5 px-4 py-2.5 transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUT_DOT_COLOR[eq.statut] || 'var(--fg-subtle)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{eq.nom}</div>
                        {eq.matricule && (
                          <div className="text-xs font-mono" style={{ color: 'var(--fg-subtle)' }}>{eq.matricule}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── HISTORIQUE PANEL ─────────────────────────────────────────────────────────

function HistoriquePanel({ equipements = [] }) {
  const [selectedId, setSelectedId] = useState('');
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('');

  const loadHistory = async (id) => {
    if (!id) return;
    setSelectedId(id);
    setLoading(true);
    try {
      const res = await gmaoAPI.getInterventions({ equipement_id: id });
      const data = res.data?.data || res.data || [];
      setInterventions(Array.isArray(data) ? data : []);
    } catch { setInterventions([]); }
    finally { setLoading(false); }
  };

  const filtered = filterType ? interventions.filter(iv => iv.type === filterType) : interventions;

  const selectedEq = equipements.find(e => String(e.id) === String(selectedId));

  return (
    <div className="p-6">
      {/* Sélection équipement */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 max-w-sm">
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--fg-subtle)' }}>
            Équipement
          </label>
          <select
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
            value={selectedId}
            onChange={e => loadHistory(e.target.value)}
          >
            <option value="">— Sélectionner un équipement —</option>
            {equipements.map(eq => (
              <option key={eq.id} value={eq.id}>{eq.nom} {eq.service ? `(${eq.service})` : ''}</option>
            ))}
          </select>
        </div>
        {interventions.length > 0 && (
          <div className="flex gap-2 mt-5">
            {['', 'preventive', 'corrective'].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={filterType === t
                  ? { background: '#1e293b', color: '#fff' }
                  : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}
              >
                {t === '' ? 'Tous' : t === 'preventive' ? 'Préventif' : 'Correctif'}
              </button>
            ))}
          </div>
        )}
      </div>

      {!selectedId ? (
        <div className="text-center py-16" style={{ color: 'var(--fg-subtle)' }}>
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Sélectionnez un équipement pour voir son historique</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-teal)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--fg-subtle)' }}>
          <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Aucune intervention enregistrée pour cet équipement</p>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>{selectedEq?.nom}</h3>
              <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{filtered.length} intervention{filtered.length > 1 ? 's' : ''}</p>
            </div>
            {/* Summary pills */}
            <div className="flex gap-2">
              {[
                { label: 'Terminées', count: interventions.filter(i => i.statut === 'terminee').length, bg: 'var(--success-soft)', color: 'var(--success)' },
                { label: 'En cours', count: interventions.filter(i => i.statut === 'en_cours').length, bg: 'var(--warning-soft)', color: 'var(--warning)' },
                { label: 'Planifiées', count: interventions.filter(i => i.statut === 'planifiee').length, bg: 'var(--brand-soft)', color: 'var(--brand)' },
              ].map(({ label, count, bg, color }) => count > 0 ? (
                <span key={label} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: bg, color }}>
                  {count} {label}
                </span>
              ) : null)}
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px" style={{ background: 'var(--border)' }} />
            <div className="space-y-3">
              {filtered.map((iv) => {
                const sc = INTERVENTION_STATUT_CONFIG[iv.statut] || INTERVENTION_STATUT_CONFIG.planifiee;
                const pc = PRIORITE_CONFIG[iv.priorite] || PRIORITE_CONFIG.normal;
                const dotColor = iv.statut === 'terminee' ? 'var(--success)' : iv.statut === 'en_cours' ? 'var(--warning)' : iv.statut === 'reportee' ? '#f97316' : 'var(--brand)';
                return (
                  <div key={iv.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className="absolute left-2.5 top-3 w-3 h-3 rounded-full" style={{ background: dotColor, border: '2px solid var(--surface)' }} />
                    <div className="rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={sc.style}>
                              {sc.label}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded" style={iv.type === 'corrective' ? { background: 'rgba(234,88,12,0.1)', color: '#c2410c' } : { background: 'var(--accent-teal-soft)', color: 'var(--accent-teal)' }}>
                              {iv.type === 'corrective' ? 'Correctif' : 'Préventif'}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded" style={pc.style}>
                              {pc.label}
                            </span>
                          </div>
                          {iv.description && (
                            <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>{iv.description}</p>
                          )}
                          {iv.actions_effectuees && (
                            <p className="mt-1 text-xs italic" style={{ color: 'var(--fg-subtle)' }}>
                              Actions : {iv.actions_effectuees}
                            </p>
                          )}
                          {iv.pieces_remplacees && (
                            <p className="mt-1 text-xs" style={{ color: 'var(--fg-subtle)' }}>
                              Pièces : {iv.pieces_remplacees}
                            </p>
                          )}
                          {(iv.technicien?.firstName || iv.signale_par) && (
                            <p className="mt-1 text-xs" style={{ color: 'var(--fg-subtle)' }}>
                              {iv.technicien ? `Technicien : ${iv.technicien.firstName} ${iv.technicien.lastName || ''}` : `Signalé par : ${iv.signale_par}`}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>
                            {iv.date_planifiee ? new Date(iv.date_planifiee).toLocaleDateString('fr-FR') : '—'}
                          </div>
                          {iv.date_realisation && (
                            <div className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
                              Réalisé : {new Date(iv.date_realisation).toLocaleDateString('fr-FR')}
                            </div>
                          )}
                          {iv.duree_reelle && (
                            <div className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{iv.duree_reelle}h</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RETRAIT PANEL ────────────────────────────────────────────────────────────

function RetraitPanel({ equipements = [], onRefresh }) {
  const [form, setForm] = useState({ equipement_id: '', motif: '', destination: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const { confirm, ConfirmModalRenderer } = useConfirm();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const enRetrait = equipements.filter(e => e.statut === 'en_reparation');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipement_id || !form.motif) { setError('Équipement et motif requis.'); return; }
    setSaving(true);
    setError('');
    try {
      const eq = equipements.find(e => String(e.id) === String(form.equipement_id));
      const notes = `[RETRAIT ${form.date}] Motif: ${form.motif}${form.destination ? ` | Destination: ${form.destination}` : ''}${eq?.notes ? '\n' + eq.notes : ''}`;
      await gmaoAPI.updateEquipement(form.equipement_id, { statut: 'en_reparation', notes });
      setSuccess(`Retrait enregistré pour : ${eq?.nom}`);
      setForm({ equipement_id: '', motif: '', destination: '', date: new Date().toISOString().split('T')[0] });
      onRefresh();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du retrait');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    {ConfirmModalRenderer}
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Formulaire de retrait */}
      <div>
        <h3 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
          <AlertTriangle className="w-4 h-4" style={{ color: '#ea580c' }} />
          Enregistrer un retrait
        </h3>
        <form onSubmit={handleSubmit} className="rounded-lg shadow-sm p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: 'var(--success-soft)', border: '1px solid var(--success)', color: 'var(--success)' }}>
              <CheckCircle className="w-4 h-4" />{success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Équipement *</label>
            <select
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={form.equipement_id}
              onChange={e => set('equipement_id', e.target.value)}
            >
              <option value="">— Sélectionner —</option>
              {equipements.filter(e => e.statut === 'actif').map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nom} ({eq.service || 'Sans service'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Date de retrait *</label>
            <input
              type="date"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={form.date}
              onChange={e => set('date', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Motif *</label>
            <select
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={form.motif}
              onChange={e => set('motif', e.target.value)}
            >
              <option value="">— Sélectionner —</option>
              <option>Maintenance préventive</option>
              <option>Panne / réparation</option>
              <option>Transfert vers un autre service</option>
              <option>Transfert vers un autre site</option>
              <option>Contrôle qualité</option>
              <option>Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Destination / Responsable</label>
            <input
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              placeholder="Ex: Atelier central, Service BOP, M. Dupont…"
              value={form.destination}
              onChange={e => set('destination', e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 font-semibold rounded-lg text-sm transition-colors disabled:opacity-50" style={{ background: '#ea580c', color: '#fff' }}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer le retrait'}
          </button>
        </form>
      </div>

      {/* Équipements actuellement en retrait */}
      <div>
        <h3 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
          <RotateCcw className="w-4 h-4" style={{ color: 'var(--warning)' }} />
          Équipements en retrait
          <span className="ml-auto text-sm font-normal" style={{ color: 'var(--fg-subtle)' }}>{enRetrait.length}</span>
        </h3>
        <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {enRetrait.length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'var(--fg-subtle)' }}>
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Aucun équipement en retrait</p>
            </div>
          ) : (
            <div>
              {enRetrait.map(eq => (
                <div key={eq.id} className="flex items-start gap-3 p-4 transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--warning)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm" style={{ color: 'var(--fg)' }}>{eq.nom}</div>
                    <div className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{eq.service || '—'}</div>
                    {eq.notes && (
                      <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--fg-muted)' }}>{eq.notes.split('\n')[0]}</div>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (!(await confirm({ title: 'Remise en service', message: `Remettre "${eq.nom}" en service ?`, confirmLabel: 'Remettre en service', variant: 'info' }))) return;
                      await gmaoAPI.updateEquipement(eq.id, { statut: 'actif' });
                      onRefresh();
                    }}
                    className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--success)' }}
                  >
                    Remettre en service
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

// ─── REFORME PANEL ────────────────────────────────────────────────────────────

function ReformePanel({ equipements = [], onRefresh }) {
  const [form, setForm] = useState({
    equipement_id: '', motif: '', date_reforme: new Date().toISOString().split('T')[0], observations: ''
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const { confirm, ConfirmModalRenderer } = useConfirm();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const reformes = equipements.filter(e => e.statut === 'hors_service');
  const disponibles = equipements.filter(e => e.statut !== 'hors_service');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipement_id || !form.motif) { setError('Équipement et motif requis.'); return; }
    if (!(await confirm({ title: 'Mise en réforme', message: 'Confirmer la mise en réforme de cet équipement ? Cette action le retire définitivement du parc actif.', confirmLabel: 'Mettre en réforme', variant: 'danger' }))) return;
    setSaving(true);
    setError('');
    try {
      const eq = equipements.find(e => String(e.id) === String(form.equipement_id));
      const notes = `[RÉFORME ${form.date_reforme}] Motif: ${form.motif}${form.observations ? ` | Observations: ${form.observations}` : ''}${eq?.notes ? '\n' + eq.notes : ''}`;
      await gmaoAPI.updateEquipement(form.equipement_id, {
        statut: 'hors_service',
        date_mise_au_rebus: form.date_reforme,
        notes,
      });
      setSuccess(`Réforme enregistrée pour : ${eq?.nom}`);
      setForm({ equipement_id: '', motif: '', date_reforme: new Date().toISOString().split('T')[0], observations: '' });
      onRefresh();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la réforme');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    {ConfirmModalRenderer}
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Formulaire */}
      <div>
        <h3 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
          <XCircle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
          Mettre en réforme
        </h3>
        <form onSubmit={handleSubmit} className="rounded-lg shadow-sm p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--danger)' }}>
          <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
            La mise en réforme retire l'équipement du parc actif de façon permanente.
          </div>

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: 'var(--success-soft)', border: '1px solid var(--success)', color: 'var(--success)' }}>
              <CheckCircle className="w-4 h-4" />{success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Équipement *</label>
            <select
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={form.equipement_id}
              onChange={e => set('equipement_id', e.target.value)}
            >
              <option value="">— Sélectionner —</option>
              {disponibles.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nom} ({eq.service || 'Sans service'}) — {STATUT_CONFIG[eq.statut]?.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Date de réforme *</label>
            <input
              type="date"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={form.date_reforme}
              onChange={e => set('date_reforme', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Motif de réforme *</label>
            <select
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={form.motif}
              onChange={e => set('motif', e.target.value)}
            >
              <option value="">— Sélectionner —</option>
              <option>Fin de vie / amortissement</option>
              <option>Panne irréparable</option>
              <option>Obsolescence technologique</option>
              <option>Coût de réparation non rentable</option>
              <option>Remplacement par un nouvel équipement</option>
              <option>Décision administrative</option>
              <option>Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Observations</label>
            <textarea
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              placeholder="Observations complémentaires…"
              value={form.observations}
              onChange={e => set('observations', e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 font-semibold rounded-lg text-sm transition-colors disabled:opacity-50" style={{ background: 'var(--danger)', color: '#fff' }}
          >
            {saving ? 'Enregistrement…' : 'Confirmer la mise en réforme'}
          </button>
        </form>
      </div>

      {/* Liste des réformés */}
      <div>
        <h3 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
          <List className="w-4 h-4" style={{ color: 'var(--danger)' }} />
          Équipements réformés
          <span className="ml-auto text-sm font-normal" style={{ color: 'var(--fg-subtle)' }}>{reformes.length}</span>
        </h3>
        <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {reformes.length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'var(--fg-subtle)' }}>
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Aucun équipement réformé</p>
            </div>
          ) : (
            <div className="max-h-[450px] overflow-y-auto">
              {reformes.map(eq => (
                <div key={eq.id} className="flex items-start gap-3 p-4" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--danger)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm" style={{ color: 'var(--fg-muted)' }}>{eq.nom}</div>
                    <div className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{eq.service || '—'}</div>
                    {eq.date_mise_au_rebus && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--danger)' }}>
                        Réformé le {new Date(eq.date_mise_au_rebus).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                    {eq.notes && (
                      <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--fg-subtle)' }}>{eq.notes.split('\n')[0]}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

// ─── CONTRATS PANEL ───────────────────────────────────────────────────────────

const getTypeContratLabels = (t) => ({
  maintenance_preventive: t('Maintenance préventive'),
  maintenance_corrective: t('Maintenance corrective'),
  maintenance_totale:     t('Maintenance totale'),
  piece_rechange:         t('Pièce de rechange'),
  calibration:            t('Calibration'),
  autre:                  t('Autre'),
});

const getStatutContrat = (t) => ({
  actif:             { label: t('Actif'),             style: { background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success)' } },
  expire:            { label: t('Expiré'),            style: { background: 'var(--danger-soft)',  color: 'var(--danger)',  border: '1px solid var(--danger)'  } },
  resilie:           { label: t('Résilié'),           style: { background: 'var(--surface-2)',    color: 'var(--fg-muted)', border: '1px solid var(--border)' } },
  en_renouvellement: { label: t('En renouvellement'), style: { background: 'var(--brand-soft)',   color: 'var(--brand)',   border: '1px solid var(--brand)'   } },
  suspendu:          { label: t('Suspendu'),          style: { background: 'var(--warning-soft)', color: 'var(--warning)', border: '1px solid var(--warning)' } },
});

function ContratsPanel() {
  const { t } = useTranslation();
  const TYPE_CONTRAT_LABELS = getTypeContratLabels(t);
  const STATUT_CONTRAT = getStatutContrat(t);
  const [contrats, setContrats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [filterStatut, setFilterStatut] = useState('');
  const EMPTY = { prestataire:'', type_contrat:'maintenance_totale', date_debut:'', date_fin:'', montant:'', periodicite:'annuel', statut:'actif', contact_prestataire:'', telephone:'', email:'', alerte_renouvellement:30, description:'', notes:'' };
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { confirm, ConfirmModalRenderer } = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await gmaoAPI.getContrats({ statut: filterStatut || undefined });
      setContrats(res.data?.data || []);
    } catch { setContrats([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatut]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openEdit = (c) => {
    setEditTarget(c);
    setForm({ ...EMPTY, ...c });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.prestataire || !form.date_debut || !form.date_fin) return;
    setSaving(true);
    try {
      if (editTarget) await gmaoAPI.updateContrat(editTarget.id, form);
      else await gmaoAPI.createContrat(form);
      setShowForm(false); setEditTarget(null); setForm(EMPTY);
      load();
    } catch (err) { toast(err.response?.data?.message || t('Erreur')); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!(await confirm({ title: t('Supprimer le contrat'), message: t('Supprimer ce contrat ?'), confirmLabel: t('Supprimer'), variant: 'danger' }))) return;
    await gmaoAPI.deleteContrat(id);
    load();
  };

  // Stats summary
  const actifs = contrats.filter(c => c.statut === 'actif').length;
  const expiresBientot = contrats.filter(c => c.expirationProche).length;
  const expires = contrats.filter(c => c.expire || c.statut === 'expire').length;
  const montantTotal = contrats.filter(c => c.statut === 'actif').reduce((s, c) => s + (c.montant || 0), 0);

  return (
    <>
    {ConfirmModalRenderer}
    <div className="p-6 space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('Contrats actifs'), val: actifs, bg: 'var(--success-soft)', color: 'var(--success)' },
          { label: t('Expirent bientôt'), val: expiresBientot, bg: expiresBientot > 0 ? 'rgba(245,158,11,0.1)' : 'var(--surface-2)', color: expiresBientot > 0 ? '#d97706' : 'var(--fg-subtle)' },
          { label: t('Expirés'), val: expires, bg: expires > 0 ? 'var(--danger-soft)' : 'var(--surface-2)', color: expires > 0 ? 'var(--danger)' : 'var(--fg-subtle)' },
          { label: t('Montant annuel total'), val: `${montantTotal.toLocaleString(BCP47_LOCALES[i18n.language] || 'fr-FR')} €`, bg: 'var(--brand-soft)', color: 'var(--brand)' },
        ].map(({ label, val, bg, color }) => (
          <div key={label} className="rounded-lg p-4" style={{ background: bg, border: `1px solid ${color}` }}>
            <div className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1" style={{ color }}>{label}</div>
            <div className="text-2xl font-bold" style={{ color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
          value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="">{t('Tous les statuts')}</option>
          {Object.entries(STATUT_CONTRAT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => { setEditTarget(null); setForm(EMPTY); setShowForm(true); }}
          className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors" style={{ background: 'var(--accent-teal)', color: '#fff' }}>
          <Plus className="w-4 h-4" /> {t('Nouveau contrat')}
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--accent-teal)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{editTarget ? t('Modifier le contrat') : t('Nouveau contrat')}</h3>
            <button onClick={() => { setShowForm(false); setEditTarget(null); }}><X className="w-4 h-4" style={{ color: 'var(--fg-subtle)' }} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-subtle)' }}>{t('Prestataire')} *</label>
              <input className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                placeholder={t('Nom du prestataire…')} value={form.prestataire} onChange={e => set('prestataire', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-subtle)' }}>{t('Type de contrat')}</label>
              <select className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.type_contrat} onChange={e => set('type_contrat', e.target.value)}>
                {Object.entries(TYPE_CONTRAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-subtle)' }}>{t('Montant (€/an)')}</label>
              <input type="number" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                placeholder="0" value={form.montant} onChange={e => set('montant', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-subtle)' }}>{t('Date début')} *</label>
              <input type="date" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.date_debut} onChange={e => set('date_debut', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-subtle)' }}>{t('Date fin')} *</label>
              <input type="date" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.date_fin} onChange={e => set('date_fin', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-subtle)' }}>{t('Contact')}</label>
              <input className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                placeholder={t('Nom du contact')} value={form.contact_prestataire} onChange={e => set('contact_prestataire', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-subtle)' }}>{t('Téléphone')}</label>
              <input className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                placeholder="+237 6XX XXX XXX" value={form.telephone} onChange={e => set('telephone', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-subtle)' }}>{t('Statut')}</label>
              <select className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.statut} onChange={e => set('statut', e.target.value)}>
                {Object.entries(STATUT_CONTRAT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-subtle)' }}>{t('Alerte renouvellement (jours avant)')}</label>
              <input type="number" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={form.alerte_renouvellement} onChange={e => set('alerte_renouvellement', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-subtle)' }}>{t('Description / Périmètre couvert')}</label>
              <textarea rows={2} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                placeholder={t('Services ou équipements couverts…')} value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditTarget(null); }}
                className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>{t('Annuler')}</button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 text-sm font-semibold rounded-lg disabled:opacity-50" style={{ background: 'var(--accent-teal)', color: '#fff' }}>
                {saving ? t('Enregistrement…') : editTarget ? t('Mettre à jour') : t('Créer le contrat')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-teal)' }} /></div>
      ) : contrats.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--fg-subtle)' }}>
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">{t('Aucun contrat enregistré')}</p>
        </div>
      ) : (
        <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs uppercase tracking-wider" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg-subtle)' }}>
                <th className="text-left px-4 py-3">{t('Prestataire')}</th>
                <th className="text-left px-4 py-3">{t('Type')}</th>
                <th className="text-left px-4 py-3">{t('Période')}</th>
                <th className="text-right px-4 py-3">{t('Montant')}</th>
                <th className="text-left px-4 py-3">{t('Statut')}</th>
                <th className="text-left px-4 py-3">{t('Échéance')}</th>
                <th className="px-4 py-3"></th>
              </tr></thead>
              <tbody>
                {contrats.map(c => {
                  const sc = STATUT_CONTRAT[c.statut] || STATUT_CONTRAT.actif;
                  return (
                    <tr key={c.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)', background: c.expirationProche ? 'rgba(245,158,11,0.05)' : c.expire ? 'var(--danger-soft)' : undefined }}>
                      <td className="px-4 py-3">
                        <div className="font-semibold" style={{ color: 'var(--fg)' }}>{c.prestataire}</div>
                        {c.contact_prestataire && <div className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{c.contact_prestataire}</div>}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--fg-muted)' }}>{TYPE_CONTRAT_LABELS[c.type_contrat] || c.type_contrat}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--fg-subtle)' }}>
                        {c.date_debut && new Date(c.date_debut).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR')} → {c.date_fin && new Date(c.date_fin).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--fg-muted)' }}>
                        {c.montant ? `${parseFloat(c.montant).toLocaleString(BCP47_LOCALES[i18n.language] || 'fr-FR')} €` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={sc.style}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {c.joursRestants > 0 ? (
                          <span className="text-xs font-semibold" style={{ color: c.expirationProche ? '#d97706' : 'var(--fg-subtle)' }}>
                            {t('{{count}}j restants', { count: c.joursRestants })}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>{t('Expiré')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(c)} className="transition-colors" style={{ color: 'var(--fg-subtle)' }}><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(c.id)} className="transition-colors" style={{ color: 'var(--fg-subtle)' }}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

// ─── PIÈCES DE RECHANGE PANEL ─────────────────────────────────────────────────

function PiecesPanel({ subSection }) {
  const { t } = useTranslation();
  const [pieces, setPieces] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [showMvtForm, setShowMvtForm] = useState(null); // piece to add mouvement to
  const [search, setSearch] = useState('');
  const [alerteOnly, setAlerteOnly] = useState(false);

  const EMPTY_PIECE = { reference:'', designation:'', categorie:'', quantite_stock:0, quantite_min:1, unite:'unité', prix_unitaire:'', fournisseur:'', localisation:'', notes:'' };
  const [form, setForm] = useState(EMPTY_PIECE);
  const [mvtForm, setMvtForm] = useState({ type:'entree', quantite:1, date: new Date().toISOString().split('T')[0], motif:'', prix_unitaire:'' });
  const [saving, setSaving] = useState(false);
  const { confirm, ConfirmModalRenderer } = useConfirm();

  const loadPieces = async () => {
    setLoading(true);
    try {
      const res = await gmaoAPI.getPieces({ search: search || undefined, alerte_stock: alerteOnly || undefined });
      setPieces(res.data?.data || []);
    } catch { setPieces([]); } finally { setLoading(false); }
  };

  const loadMouvements = async () => {
    setLoading(true);
    try {
      const res = await gmaoAPI.getMouvements();
      setMouvements(res.data?.data || []);
    } catch { setMouvements([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (subSection === 'pieces_mouvements') loadMouvements();
    else loadPieces();
  }, [subSection, search, alerteOnly]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.reference || !form.designation) return;
    setSaving(true);
    try {
      if (editTarget) await gmaoAPI.updatePiece(editTarget.id, form);
      else await gmaoAPI.createPiece(form);
      setShowForm(false); setEditTarget(null); setForm(EMPTY_PIECE);
      loadPieces();
    } catch (err) { toast(err.response?.data?.message || t('Erreur')); }
    finally { setSaving(false); }
  };

  const handleMouvement = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await gmaoAPI.createMouvement({ ...mvtForm, piece_id: showMvtForm.id });
      setShowMvtForm(null);
      setMvtForm({ type:'entree', quantite:1, date: new Date().toISOString().split('T')[0], motif:'', prix_unitaire:'' });
      loadPieces();
    } catch (err) { toast(err.response?.data?.message || t('Erreur')); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!(await confirm({ title: t('Supprimer la pièce'), message: t('Supprimer cette pièce ?'), confirmLabel: t('Supprimer'), variant: 'danger' }))) return;
    await gmaoAPI.deletePiece(id);
    loadPieces();
  };

  const MVT_TYPE = {
    entree:     { label: t('Entrée'),      style: { background: 'var(--success-soft)', color: 'var(--success)' } },
    sortie:     { label: t('Sortie'),      style: { background: 'var(--danger-soft)',  color: 'var(--danger)'  } },
    ajustement: { label: t('Ajustement'),  style: { background: 'var(--brand-soft)',   color: 'var(--brand)'   } },
    retour:     { label: t('Retour'),      style: { background: 'var(--warning-soft)', color: 'var(--warning)' } },
  };

  const stockCritiques = pieces.filter(p => p.stockCritique).length;

  // ── Listing mouvements ──
  if (subSection === 'pieces_mouvements') {
    return (
      <div className="p-6 space-y-4">
        <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
          <List className="w-5 h-5" style={{ color: 'var(--accent-teal)' }} /> {t('Listing des mouvements de stock')}
          <span className="ml-auto text-sm font-normal" style={{ color: 'var(--fg-subtle)' }}>{t('{{count}} mouvement(s)', { count: mouvements.length })}</span>
        </h3>
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-teal)' }} /></div>
        ) : mouvements.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--fg-subtle)' }}><Package className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--border)' }} /><p>{t('Aucun mouvement enregistré')}</p></div>
        ) : (
          <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs uppercase tracking-wider" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg-subtle)' }}>
                  <th className="text-left px-4 py-3">{t('Date')}</th>
                  <th className="text-left px-4 py-3">{t('Pièce')}</th>
                  <th className="text-left px-4 py-3">{t('Type')}</th>
                  <th className="text-right px-4 py-3">{t('Quantité')}</th>
                  <th className="text-left px-4 py-3">{t('Motif')}</th>
                  <th className="text-left px-4 py-3">{t('Par')}</th>
                </tr></thead>
                <tbody>
                  {mouvements.map(m => {
                    const mt = MVT_TYPE[m.type] || MVT_TYPE.entree;
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--fg-muted)' }}>{m.date ? new Date(m.date).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR') : '—'}</td>
                        <td className="px-4 py-2.5"><div className="font-medium" style={{ color: 'var(--fg)' }}>{m.piece?.designation || '—'}</div><div className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{m.piece?.reference}</div></td>
                        <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={mt.style}>{mt.label}</span></td>
                        <td className="px-4 py-2.5 text-right font-bold" style={{ color: 'var(--fg-muted)' }}>{m.quantite} {m.piece?.unite || ''}</td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--fg-muted)' }}>{m.motif || '—'}</td>
                        <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--fg-subtle)' }}>{m.auteur ? `${m.auteur.firstName} ${m.auteur.lastName || ''}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Pièces et consommables / Gestion du stock ──
  return (
    <>
    {ConfirmModalRenderer}
    <div className="p-6 space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{pieces.length}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--fg-subtle)' }}>{t('Références')}</div>
        </div>
        <div className="rounded-lg border p-4 text-center" style={stockCritiques > 0 ? { background: 'var(--danger-soft)', border: '1px solid var(--danger)' } : { background: 'var(--success-soft)', border: '1px solid var(--success)' }}>
          <div className="text-2xl font-bold" style={{ color: stockCritiques > 0 ? 'var(--danger)' : 'var(--success)' }}>{stockCritiques}</div>
          <div className="text-xs mt-0.5" style={{ color: stockCritiques > 0 ? 'var(--danger)' : 'var(--success)' }}>{t('Stock critique(s)', { count: stockCritiques })}</div>
        </div>
        <div className="rounded-lg p-4 text-center" style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--brand)' }}>
            {pieces.reduce((s, p) => s + (p.quantite_stock * (p.prix_unitaire || 0)), 0).toLocaleString(BCP47_LOCALES[i18n.language] || 'fr-FR')} €
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--brand)' }}>{t('Valeur du stock')}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4" style={{ color: 'var(--fg-subtle)' }} />
          <input className="pl-8 pr-3 py-2 text-sm rounded-lg focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
            placeholder={t('Référence, désignation…')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setAlerteOnly(a => !a)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors"
          style={alerteOnly ? { background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' } : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}
        >
          <AlertCircle className="w-4 h-4" /> {t('Stock critique seulement')}
        </button>
        <button onClick={() => { setEditTarget(null); setForm(EMPTY_PIECE); setShowForm(true); }}
          className="ml-auto flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg" style={{ background: 'var(--accent-teal)' }}>
          <Plus className="w-4 h-4" /> {t('Ajouter une pièce')}
        </button>
      </div>

      {/* Formulaire pièce */}
      {showForm && (
        <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--accent-teal)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{editTarget ? t('Modifier la pièce') : t('Nouvelle pièce de rechange')}</h3>
            <button onClick={() => { setShowForm(false); setEditTarget(null); }}><X className="w-4 h-4" style={{ color: 'var(--fg-subtle)' }} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { k:'reference', label:t('Référence *'), type:'text', placeholder:'REF-001' },
              { k:'designation', label:t('Désignation *'), type:'text', placeholder:t('Nom de la pièce…') },
              { k:'categorie', label:t('Catégorie'), type:'text', placeholder:t('Électronique, Mécanique…') },
              { k:'quantite_stock', label:t('Stock actuel'), type:'number', placeholder:'0' },
              { k:'quantite_min', label:t('Stock minimum (alerte)'), type:'number', placeholder:'1' },
              { k:'unite', label:t('Unité'), type:'text', placeholder:t('unité, lot, paire…') },
              { k:'prix_unitaire', label:t('Prix unitaire (€)'), type:'number', placeholder:'0' },
              { k:'fournisseur', label:t('Fournisseur'), type:'text', placeholder:t('Nom du fournisseur…') },
              { k:'localisation', label:t('Localisation (armoire…)'), type:'text', placeholder:t('Armoire A-1…') },
            ].map(({ k, label, type, placeholder }) => (
              <div key={k}>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>{label}</label>
                <input type={type} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                  placeholder={placeholder} value={form[k]} onChange={e => set(k, e.target.value)} />
              </div>
            ))}
            <div className="col-span-full flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditTarget(null); }}
                className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>{t('Annuler')}</button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50" style={{ background: 'var(--accent-teal)' }}>
                {saving ? t('Enregistrement…') : editTarget ? t('Mettre à jour') : t('Ajouter')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Formulaire mouvement */}
      {showMvtForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="shadow-xl p-6 w-full max-w-md" style={{ background: 'var(--surface)', borderRadius: 'var(--radius-4)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: 'var(--fg)' }}>{t('Mouvement de stock — {{name}}', { name: showMvtForm.designation })}</h3>
              <button onClick={() => setShowMvtForm(null)}><X className="w-5 h-5" style={{ color: 'var(--fg-subtle)' }} /></button>
            </div>
            <form onSubmit={handleMouvement} className="space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Type de mouvement')}</label>
                <select className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                  value={mvtForm.type} onChange={e => setMvtForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="entree">{t('Entrée (réapprovisionnement)')}</option>
                  <option value="sortie">{t('Sortie (utilisation)')}</option>
                  <option value="ajustement">{t('Ajustement inventaire')}</option>
                  <option value="retour">{t('Retour fournisseur')}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Quantité *')}</label>
                  <input type="number" min="1" className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    value={mvtForm.quantite} onChange={e => setMvtForm(f => ({ ...f, quantite: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Date')}</label>
                  <input type="date" className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    value={mvtForm.date} onChange={e => setMvtForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Motif')}</label>
                <input className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                  placeholder={t('Raison du mouvement…')} value={mvtForm.motif} onChange={e => setMvtForm(f => ({ ...f, motif: e.target.value }))} />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowMvtForm(null)} className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>{t('Annuler')}</button>
                <button type="submit" disabled={saving} className="px-5 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50" style={{ background: 'var(--accent-teal)' }}>
                  {saving ? t('Enregistrement…') : t('Enregistrer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table pièces */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-teal)' }} /></div>
      ) : pieces.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--fg-subtle)' }}><Package className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--border)' }} /><p className="text-sm">{t('Aucune pièce enregistrée')}</p></div>
      ) : (
        <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs uppercase tracking-wider" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg-subtle)' }}>
                <th className="text-left px-4 py-3">{t('Référence')}</th>
                <th className="text-left px-4 py-3">{t('Désignation')}</th>
                <th className="text-left px-4 py-3">{t('Catégorie')}</th>
                <th className="text-center px-4 py-3">{t('Stock')}</th>
                <th className="text-right px-4 py-3">{t('Prix unit.')}</th>
                <th className="text-left px-4 py-3">{t('Localisation')}</th>
                <th className="px-4 py-3"></th>
              </tr></thead>
              <tbody>
                {pieces.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: p.stockCritique ? 'var(--danger-soft)' : 'transparent' }}>
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--fg-muted)' }}>{p.reference}</td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--fg)' }}>{p.designation}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--fg-muted)' }}>{p.categorie || '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-sm px-2 py-0.5 rounded-full"
                        style={p.stockCritique ? { background: 'var(--danger-soft)', color: 'var(--danger)' } : { background: 'var(--success-soft)', color: 'var(--success)' }}>
                        {p.quantite_stock} {p.unite}
                        {p.stockCritique && <AlertCircle className="w-3 h-3" />}
                      </span>
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--fg-subtle)' }}>{t('min: {{count}}', { count: p.quantite_min })}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right" style={{ color: 'var(--fg-muted)' }}>
                      {p.prix_unitaire ? `${parseFloat(p.prix_unitaire).toLocaleString(BCP47_LOCALES[i18n.language] || 'fr-FR')} €` : '—'}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--fg-subtle)' }}>{p.localisation || '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowMvtForm(p)} title={t('Mouvement de stock')}
                          className="text-xs px-2 py-1 rounded font-medium" style={{ background: 'var(--accent-teal-soft)', color: 'var(--accent-teal)' }}>{t('±Stock')}</button>
                        <button onClick={() => { setEditTarget(p); setForm({ ...EMPTY_PIECE, ...p }); setShowForm(true); }}
                          style={{ color: 'var(--fg-subtle)' }}><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(p.id)} style={{ color: 'var(--fg-subtle)' }}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

// ─── ACQUISITION PANEL ────────────────────────────────────────────────────────

const getStatutAcq = (t) => ({
  en_attente:   { label: t('En attente'),   style: { background: 'var(--warning-soft)', color: 'var(--warning)', border: '1px solid var(--warning)' }, step: 0 },
  approuvee:    { label: t('Approuvée'),    style: { background: 'var(--brand-soft)', color: 'var(--brand)', border: '1px solid var(--brand)' },       step: 1 },
  rejetee:      { label: t('Rejetée'),      style: { background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger)' },    step: -1 },
  commandee:    { label: t('Commandée'),    style: { background: 'var(--info-soft)', color: 'var(--info)', border: '1px solid var(--info)' }, step: 2 },
  receptionnee: { label: t('Réceptionnée'), style: { background: 'var(--accent-teal-soft)', color: 'var(--accent-teal)', border: '1px solid var(--accent-teal)' },  step: 3 },
  affectee:     { label: t('Affectée'),     style: { background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success)' }, step: 4 },
});

const WORKFLOW_STEPS = ['en_attente','approuvee','commandee','receptionnee','affectee'];

function AcquisitionPanel() {
  const { t } = useTranslation();
  const STATUT_ACQ = getStatutAcq(t);
  const [acquisitions, setAcquisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterStatut, setFilterStatut] = useState('');
  const EMPTY = { designation:'', type_equipement:'', quantite:1, service_demandeur:'', priorite:'normale', motif:'', specifications:'', budget_estime:'', fournisseur:'', numero_commande:'', prix_achat:'', notes:'' };
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { confirm, ConfirmModalRenderer } = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await gmaoAPI.getAcquisitions({ statut: filterStatut || undefined });
      setAcquisitions(res.data?.data || []);
    } catch { setAcquisitions([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatut]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.designation) return;
    setSaving(true);
    try {
      await gmaoAPI.createAcquisition(form);
      setShowForm(false); setForm(EMPTY);
      load();
    } catch (err) { toast(err.response?.data?.message || t('Erreur')); }
    finally { setSaving(false); }
  };

  const handleStatutChange = async (acq, newStatut) => {
    const updates = { statut: newStatut };
    if (newStatut === 'rejetee') {
      const motif = prompt(t('Motif de rejet (optionnel):'));
      if (motif !== null) updates.motif_rejet = motif;
    }
    if (newStatut === 'commandee') {
      updates.fournisseur = selected?.fournisseur || acq.fournisseur || '';
      updates.numero_commande = selected?.numero_commande || acq.numero_commande || '';
    }
    if (newStatut === 'affectee' && !acq.prix_achat) {
      const prix = prompt(t("Prix d'achat final (€):"));
      if (prix) updates.prix_achat = parseFloat(prix);
    }
    await gmaoAPI.updateAcquisition(acq.id, updates);
    load();
    if (selected?.id === acq.id) setSelected({ ...acq, ...updates });
  };

  const PRIORITE_BADGE = {
    normale:  { background: 'var(--surface-2)', color: 'var(--fg-muted)' },
    urgente:  { background: 'rgba(234,88,12,0.12)', color: '#ea580c' },
    critique: { background: 'var(--danger-soft)', color: 'var(--danger)' },
  };

  const counts = {
    en_attente: acquisitions.filter(a => a.statut === 'en_attente').length,
    approuvee:  acquisitions.filter(a => a.statut === 'approuvee').length,
    commandee:  acquisitions.filter(a => a.statut === 'commandee').length,
    total:      acquisitions.length,
  };

  return (
    <>
    {ConfirmModalRenderer}
    <div className="flex h-full min-h-[500px]">
      {/* Panneau gauche — liste */}
      <div className="w-80 flex flex-col flex-shrink-0" style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)' }}>
        {/* Stats rapides */}
        <div className="grid grid-cols-3" style={{ borderBottom: '1px solid var(--border)' }}>
          {[[t('En attente'), counts.en_attente, 'var(--warning)'],[t('Approuvées'), counts.approuvee, 'var(--brand)'],[t('Commandées'), counts.commandee, '#6366f1']].map(([label, count, color]) => (
            <div key={label} className="py-3 text-center" style={{ borderRight: '1px solid var(--border)' }}>
              <div className="text-xl font-bold" style={{ color }}>{count}</div>
              <div className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>{label}</div>
            </div>
          ))}
        </div>
        {/* Filtres */}
        <div className="p-3 flex gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <select className="flex-1 rounded-lg px-2 py-1.5 text-xs focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
            value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
            <option value="">{t('Tous')}</option>
            {Object.entries(STATUT_ACQ).filter(([k]) => k !== 'rejetee').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            <option value="rejetee">{t('Rejetées')}</option>
          </select>
          <button onClick={() => { setShowForm(true); setSelected(null); }}
            className="flex items-center gap-1 px-2 py-1.5 text-white text-xs font-semibold rounded-lg" style={{ background: 'var(--accent-teal)' }}>
            <Plus className="w-3 h-3" /> {t('Nouvelle')}
          </button>
        </div>
        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--accent-teal)' }} /></div>
          ) : acquisitions.length === 0 ? (
            <div className="text-center py-8 text-xs" style={{ color: 'var(--fg-subtle)' }}>{t('Aucune demande')}</div>
          ) : acquisitions.map(a => {
            const sc = STATUT_ACQ[a.statut] || STATUT_ACQ.en_attente;
            const isSelected = selected?.id === a.id;
            return (
              <button key={a.id} onClick={() => { setSelected(a); setShowForm(false); }}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{ borderBottom: '1px solid var(--border)', background: isSelected ? 'var(--accent-teal-soft)' : 'transparent', borderLeft: isSelected ? '4px solid var(--accent-teal)' : '4px solid transparent' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-xs truncate flex-1" style={{ color: 'var(--fg)' }}>{a.designation}</div>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={sc.style}>{sc.label}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono" style={{ color: 'var(--fg-subtle)' }}>{a.reference || '—'}</span>
                  <span className="text-[10px] px-1 py-0.5 rounded" style={PRIORITE_BADGE[a.priorite] || {}}>{a.priorite}</span>
                  {a.service_demandeur && <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>{a.service_demandeur}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Panneau droit — détail / formulaire */}
      <div className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--surface-2)' }}>
        {showForm ? (
          <div className="rounded-lg shadow-sm p-6 max-w-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="text-base font-bold mb-5" style={{ color: 'var(--fg)' }}>{t("Nouvelle demande d'acquisition")}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>{t("Désignation de l'équipement *")}</label>
                  <input className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    placeholder={t("Nom de l'équipement demandé…")} value={form.designation} onChange={e => set('designation', e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>{t("Type d'équipement")}</label>
                  <input className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    placeholder={t('Moniteur, Défibrillateur…')} value={form.type_equipement} onChange={e => set('type_equipement', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Quantité')}</label>
                  <input type="number" min="1" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    value={form.quantite} onChange={e => set('quantite', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Service demandeur')}</label>
                  <select className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    value={form.service_demandeur} onChange={e => set('service_demandeur', e.target.value)}>
                    <option value="">{t('— Sélectionner —')}</option>
                    {SERVICES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Priorité')}</label>
                  <select className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    value={form.priorite} onChange={e => set('priorite', e.target.value)}>
                    <option value="normale">{t('Normale')}</option>
                    <option value="urgente">{t('Urgente')}</option>
                    <option value="critique">{t('Critique')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Budget estimé (€)')}</label>
                  <input type="number" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    placeholder="0" value={form.budget_estime} onChange={e => set('budget_estime', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Motif / Justification')}</label>
                  <textarea rows={2} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    placeholder={t('Pourquoi cet équipement est-il nécessaire ?')} value={form.motif} onChange={e => set('motif', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>{t('Spécifications techniques')}</label>
                  <textarea rows={2} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    placeholder={t('Caractéristiques techniques requises…')} value={form.specifications} onChange={e => set('specifications', e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>{t('Annuler')}</button>
                <button type="submit" disabled={saving} className="px-5 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50" style={{ background: 'var(--accent-teal)' }}>
                  {saving ? t('Enregistrement…') : t('Soumettre la demande')}
                </button>
              </div>
            </form>
          </div>
        ) : selected ? (
          <div className="max-w-2xl space-y-5">
            {/* Header */}
            <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono" style={{ color: 'var(--fg-subtle)' }}>{selected.reference || '—'}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={(STATUT_ACQ[selected.statut] || STATUT_ACQ.en_attente).style}>
                      {(STATUT_ACQ[selected.statut] || STATUT_ACQ.en_attente).label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={PRIORITE_BADGE[selected.priorite] || {}}>{selected.priorite}</span>
                  </div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>{selected.designation}</h2>
                  <div className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>{selected.type_equipement} — {selected.service_demandeur || '—'} — {t('Qté: {{count}}', { count: selected.quantite })}</div>
                </div>
                <button onClick={async () => { if (await confirm({ title: t('Supprimer la demande'), message: t('Supprimer cette demande ?'), confirmLabel: t('Supprimer'), variant: 'danger' })) { gmaoAPI.deleteAcquisition(selected.id); setSelected(null); load(); } }}
                  style={{ color: 'var(--fg-subtle)' }}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Stepper workflow */}
            {selected.statut !== 'rejetee' && (
              <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--fg-muted)' }}>{t('Progression')}</h3>
                <div className="flex items-center gap-0">
                  {WORKFLOW_STEPS.map((step, i) => {
                    const sc = STATUT_ACQ[step];
                    const currentStep = STATUT_ACQ[selected.statut]?.step ?? 0;
                    const done = i < currentStep;
                    const active = i === currentStep;
                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div className={`flex flex-col items-center ${i < WORKFLOW_STEPS.length - 1 ? 'flex-1' : ''}`}>
                          <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all"
                            style={done ? { background: 'var(--accent-teal)', borderColor: 'var(--accent-teal)', color: '#fff' } : active ? { background: 'var(--surface)', borderColor: 'var(--accent-teal)', color: 'var(--accent-teal)' } : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg-subtle)' }}>
                            {done ? '✓' : i + 1}
                          </div>
                          <span className="text-[9px] mt-1 text-center"
                            style={{ color: active ? 'var(--accent-teal)' : done ? 'var(--fg-muted)' : 'var(--fg-subtle)', fontWeight: active ? 700 : 400 }}>
                            {sc.label}
                          </span>
                        </div>
                        {i < WORKFLOW_STEPS.length - 1 && (
                          <div className="h-0.5 flex-1 mb-4" style={{ background: i < currentStep ? 'var(--accent-teal)' : 'var(--border)' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions workflow */}
            <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>{t('Actions')}</h3>
              <div className="flex flex-wrap gap-2">
                {selected.statut === 'en_attente' && <>
                  <button onClick={() => handleStatutChange(selected, 'approuvee')} className="px-4 py-2 text-white text-sm font-semibold rounded-lg" style={{ background: 'var(--brand)' }}>✓ {t('Approuver')}</button>
                  <button onClick={() => handleStatutChange(selected, 'rejetee')} className="px-4 py-2 text-white text-sm font-semibold rounded-lg" style={{ background: 'var(--danger)' }}>✗ {t('Rejeter')}</button>
                </>}
                {selected.statut === 'approuvee' && (
                  <button onClick={() => handleStatutChange(selected, 'commandee')} className="px-4 py-2 text-white text-sm font-semibold rounded-lg" style={{ background: '#6366f1' }}>📦 {t('Marquer commandé')}</button>
                )}
                {selected.statut === 'commandee' && (
                  <button onClick={() => handleStatutChange(selected, 'receptionnee')} className="px-4 py-2 text-white text-sm font-semibold rounded-lg" style={{ background: 'var(--accent-teal)' }}>✓ {t('Marquer réceptionné')}</button>
                )}
                {selected.statut === 'receptionnee' && (
                  <button onClick={() => handleStatutChange(selected, 'affectee')} className="px-4 py-2 text-white text-sm font-semibold rounded-lg" style={{ background: 'var(--success)' }}>✓ {t('Affecter au service')}</button>
                )}
                {selected.statut === 'rejetee' && (
                  <button onClick={() => handleStatutChange(selected, 'en_attente')} className="px-4 py-2 text-white text-sm font-semibold rounded-lg" style={{ background: 'var(--fg-subtle)' }}>↺ {t('Remettre en attente')}</button>
                )}
              </div>
            </div>

            {/* Détails */}
            <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>{t('Détails')}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  [t('Budget estimé'), selected.budget_estime ? `${parseFloat(selected.budget_estime).toLocaleString(BCP47_LOCALES[i18n.language] || 'fr-FR')} €` : '—'],
                  [t("Prix d'achat final"), selected.prix_achat ? `${parseFloat(selected.prix_achat).toLocaleString(BCP47_LOCALES[i18n.language] || 'fr-FR')} €` : '—'],
                  [t('Fournisseur'), selected.fournisseur || '—'],
                  [t('N° commande'), selected.numero_commande || '—'],
                  [t('Date demande'), selected.date_demande ? new Date(selected.date_demande).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR') : '—'],
                  [t('Date approbation'), selected.date_approbation ? new Date(selected.date_approbation).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR') : '—'],
                  [t('Date commande'), selected.date_commande ? new Date(selected.date_commande).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR') : '—'],
                  [t('Date réception'), selected.date_reception ? new Date(selected.date_reception).toLocaleDateString(BCP47_LOCALES[i18n.language] || 'fr-FR') : '—'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <span className="text-xs block" style={{ color: 'var(--fg-subtle)' }}>{label}</span>
                    <span className="font-medium" style={{ color: 'var(--fg)' }}>{val}</span>
                  </div>
                ))}
              </div>
              {selected.motif && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="text-xs block mb-1" style={{ color: 'var(--fg-subtle)' }}>{t('Motif / Justification')}</span>
                  <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{selected.motif}</p>
                </div>
              )}
              {selected.specifications && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="text-xs block mb-1" style={{ color: 'var(--fg-subtle)' }}>{t('Spécifications')}</span>
                  <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{selected.specifications}</p>
                </div>
              )}
              {selected.motif_rejet && (
                <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)' }}>
                  <span className="text-xs font-semibold block mb-1" style={{ color: 'var(--danger)' }}>{t('Motif de rejet')}</span>
                  <p className="text-sm" style={{ color: 'var(--danger)' }}>{selected.motif_rejet}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--fg-subtle)' }}>
            <ShoppingCart className="w-12 h-12 mb-3" style={{ color: 'var(--border)' }} />
            <p className="text-sm">{t('Sélectionnez une demande ou créez-en une nouvelle')}</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

// ─── BUDGET PANEL API (migration localStorage → BDD) ─────────────────────────

function BudgetPanelAPI({ subSection }) {
  const anneeActuelle = new Date().getFullYear();
  const [annee, setAnnee] = useState(anneeActuelle);
  const [lignes, setLignes] = useState([]);
  const [achats, setAchats] = useState([]);
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState('');
  const { confirm, ConfirmModalRenderer } = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await gmaoAPI.getBudget(annee);
      const d = res.data?.data || {};
      setLignes(d.lignes || []);
      setAchats(d.achats || []);
      setFactures(d.factures || []);
    } catch { setLignes([]); setAchats([]); setFactures([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [annee]);

  const CATEGORIES = ['Préventif','Correctif','Pièces de rechange','Contrats externes','Consommables','Formation','Outillage','Autre'];

  const totalAlloue  = lignes.reduce((s, l) => s + (parseFloat(l.montant) || 0), 0);
  const totalAchats  = achats.reduce((s, a) => s + (parseFloat(a.montant) || 0), 0);
  const totalFact    = factures.reduce((s, f) => s + (parseFloat(f.montant) || 0), 0);
  const totalDepenses = totalAchats + totalFact;
  const solde         = totalAlloue - totalDepenses;
  const pctConsomme  = totalAlloue > 0 ? Math.round((totalDepenses / totalAlloue) * 100) : 0;

  // Formulaires
  const [formLigne, setFormLigne] = useState({ categorie: '', montant: '', description: '' });
  const [formAchat, setFormAchat] = useState({ date: new Date().toISOString().split('T')[0], description: '', categorie: '', montant: '', fournisseur: '' });
  const [formFact, setFormFact] = useState({ date: new Date().toISOString().split('T')[0], description: '', fournisseur: '', numero_facture: '', montant_ht: '', tva: '18', montant: '', statut_facture: 'en_attente' });
  const [saving, setSaving] = useState(false);

  // Migration localStorage → BDD
  const handleMigrate = async () => {
    const stored = localStorage.getItem('gmao_budget_data');
    if (!stored) { setMigrateMsg('Aucune donnée locale à migrer.'); return; }
    const data = JSON.parse(stored);
    const keyLignes   = data[`${annee}_lignes`] || [];
    const keyAchats   = data[`${annee}_achats`] || [];
    const keyFactures = data[`${annee}_factures`] || [];
    if (!keyLignes.length && !keyAchats.length && !keyFactures.length) {
      setMigrateMsg(`Aucune donnée locale pour ${annee}.`); return;
    }
    if (!(await confirm({ title: 'Migration budget', message: `Migrer ${keyLignes.length} lignes, ${keyAchats.length} achats, ${keyFactures.length} factures de ${annee} vers la base de données ?`, confirmLabel: 'Migrer', variant: 'info' }))) return;
    setMigrating(true);
    try {
      const res = await gmaoAPI.migrateBudget({ annee, lignes: keyLignes, achats: keyAchats, factures: keyFactures });
      setMigrateMsg(res.data?.message || 'Migration OK');
      load();
    } catch (err) { setMigrateMsg(err.response?.data?.message || 'Erreur de migration'); }
    finally { setMigrating(false); }
  };

  const addLigne = async (e) => {
    e.preventDefault();
    if (!formLigne.categorie || !formLigne.montant) return;
    setSaving(true);
    try { await gmaoAPI.createBudgetLigne({ ...formLigne, annee }); setFormLigne({ categorie:'', montant:'', description:'' }); load(); }
    catch (err) { toast(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const addAchat = async (e) => {
    e.preventDefault();
    if (!formAchat.description || !formAchat.montant) return;
    setSaving(true);
    try { await gmaoAPI.createBudgetDepense({ ...formAchat, annee, type: 'achat' }); setFormAchat({ date: new Date().toISOString().split('T')[0], description:'', categorie:'', montant:'', fournisseur:'' }); load(); }
    catch (err) { toast(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const addFacture = async (e) => {
    e.preventDefault();
    if (!formFact.fournisseur || !formFact.montant) return;
    setSaving(true);
    try { await gmaoAPI.createBudgetDepense({ ...formFact, annee, type: 'facture', description: formFact.fournisseur }); setFormFact({ date: new Date().toISOString().split('T')[0], description:'', fournisseur:'', numero_facture:'', montant_ht:'', tva:'18', montant:'', statut_facture:'en_attente' }); load(); }
    catch (err) { toast(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const delLigne   = async (id) => { await gmaoAPI.deleteBudgetLigne(id); load(); };
  const delDepense = async (id) => { await gmaoAPI.deleteBudgetDepense(id); load(); };

  const FACT_STATUT = {
    en_attente: { label:'En attente', style: { background: 'var(--warning-soft)', color: 'var(--warning)' } },
    payee:      { label:'Payée',      style: { background: 'var(--success-soft)', color: 'var(--success)' } },
    contestee:  { label:'Contestée',  style: { background: 'var(--danger-soft)',  color: 'var(--danger)'  } },
  };

  const SH = ({ icon, title }) => (
    <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>{icon}{title}</h3>
  );

  const MigrateBar = () => (
    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand)' }}>
      <div className="flex-1 text-xs" style={{ color: 'var(--brand)' }}>
        {migrateMsg ? <span className="font-semibold">{migrateMsg}</span> : 'Vous avez des données budgétaires stockées localement ?'}
      </div>
      <button onClick={handleMigrate} disabled={migrating}
        className="px-3 py-1.5 text-white text-xs font-semibold rounded-lg disabled:opacity-50" style={{ background: 'var(--brand)' }}>
        {migrating ? 'Migration…' : '↑ Migrer depuis localStorage'}
      </button>
    </div>
  );

  const renderLigneBudgetaire = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <SH icon={<DollarSign className="w-4 h-4" style={{ color: 'var(--brand)' }} />} title="Ajouter une ligne budgétaire" />
        <form onSubmit={addLigne} className="space-y-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>Catégorie *</label>
            <select className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={formLigne.categorie} onChange={e => setFormLigne(f => ({ ...f, categorie: e.target.value }))}>
              <option value="">— Sélectionner —</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>Montant alloué (€) *</label>
            <input type="number" min="0" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={formLigne.montant} onChange={e => setFormLigne(f => ({ ...f, montant: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>Description</label>
            <input className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              placeholder="Optionnel…" value={formLigne.description} onChange={e => setFormLigne(f => ({ ...f, description: e.target.value }))} />
          </div>
          <button type="submit" disabled={saving} className="w-full py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50" style={{ background: 'var(--brand)' }}>
            {saving ? 'Enregistrement…' : 'Ajouter la ligne'}
          </button>
        </form>
      </div>
      <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--fg-muted)' }}>Lignes budgétaires {annee}</span>
          <span className="text-sm font-bold" style={{ color: 'var(--brand)' }}>{totalAlloue.toLocaleString('fr-FR')} €</span>
        </div>
        {loading ? <div className="flex justify-center p-6"><RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--accent-teal)' }} /></div> : lignes.length === 0 ? (
          <div className="p-6 text-center text-sm" style={{ color: 'var(--fg-subtle)' }}>Aucune ligne</div>
        ) : (
          <div>
            {lignes.map(l => (
              <div key={l.id} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{l.categorie}</div>
                  {l.description && <div className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{l.description}</div>}
                </div>
                <span className="font-bold" style={{ color: 'var(--brand)' }}>{parseFloat(l.montant).toLocaleString('fr-FR')} €</span>
                <button onClick={() => delLigne(l.id)} style={{ color: 'var(--fg-subtle)' }}><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderAchats = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <SH icon={<ShoppingCart className="w-4 h-4" style={{ color: '#ea580c' }} />} title="Enregistrer un achat / dépense" />
        <form onSubmit={addAchat} className="space-y-3">
          {[
            { k:'date', label:'Date', type:'date' },
            { k:'description', label:'Description *', type:'text', placeholder:'Nature de la dépense…' },
            { k:'fournisseur', label:'Fournisseur', type:'text', placeholder:'Nom du fournisseur…' },
            { k:'montant', label:'Montant (€) *', type:'number', placeholder:'0' },
          ].map(({ k, label, type, placeholder }) => (
            <div key={k}>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>{label}</label>
              <input type={type} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                placeholder={placeholder} value={formAchat[k]} onChange={e => setFormAchat(f => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>Catégorie</label>
            <select className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={formAchat.categorie} onChange={e => setFormAchat(f => ({ ...f, categorie: e.target.value }))}>
              <option value="">— Catégorie —</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" disabled={saving} className="w-full py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50" style={{ background: '#ea580c' }}>
            {saving ? 'Enregistrement…' : 'Enregistrer la dépense'}
          </button>
        </form>
      </div>
      <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--fg-muted)' }}>Achats & Dépenses {annee}</span>
          <span className="text-sm font-bold" style={{ color: '#ea580c' }}>{totalAchats.toLocaleString('fr-FR')} €</span>
        </div>
        {loading ? <div className="flex justify-center p-6"><RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--accent-teal)' }} /></div> : achats.length === 0 ? (
          <div className="p-6 text-center text-sm" style={{ color: 'var(--fg-subtle)' }}>Aucun achat</div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {achats.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--fg-subtle)' }}>{new Date(a.date).toLocaleDateString('fr-FR')}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{a.description}</div>
                  {a.fournisseur && <div className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{a.fournisseur}</div>}
                </div>
                <span className="font-bold flex-shrink-0" style={{ color: '#ea580c' }}>{parseFloat(a.montant).toLocaleString('fr-FR')} €</span>
                <button onClick={() => delDepense(a.id)} className="flex-shrink-0" style={{ color: 'var(--fg-subtle)' }}><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderFactures = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <SH icon={<Receipt className="w-4 h-4" style={{ color: '#9333ea' }} />} title="Enregistrer une facture" />
        <form onSubmit={addFacture} className="space-y-3">
          {[
            { k:'date', label:'Date facture', type:'date' },
            { k:'numero_facture', label:'N° Facture', type:'text', placeholder:'FAC-2026-001' },
            { k:'fournisseur', label:'Prestataire *', type:'text', placeholder:'Nom…' },
            { k:'montant_ht', label:'Montant HT (€)', type:'number', placeholder:'0' },
            { k:'tva', label:'TVA (%)', type:'number', placeholder:'18' },
            { k:'montant', label:'Montant TTC (€) *', type:'number', placeholder:'0' },
          ].map(({ k, label, type, placeholder }) => (
            <div key={k}>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>{label}</label>
              <input type={type} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                placeholder={placeholder} value={formFact[k]} onChange={e => setFormFact(f => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>Statut</label>
            <select className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={formFact.statut_facture} onChange={e => setFormFact(f => ({ ...f, statut_facture: e.target.value }))}>
              <option value="en_attente">En attente</option><option value="payee">Payée</option><option value="contestee">Contestée</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="w-full py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50" style={{ background: '#9333ea' }}>
            {saving ? 'Enregistrement…' : 'Enregistrer la facture'}
          </button>
        </form>
      </div>
      <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--fg-muted)' }}>Factures {annee}</span>
          <span className="text-sm font-bold" style={{ color: '#9333ea' }}>{totalFact.toLocaleString('fr-FR')} €</span>
        </div>
        {loading ? <div className="flex justify-center p-6"><RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--accent-teal)' }} /></div> : factures.length === 0 ? (
          <div className="p-6 text-center text-sm" style={{ color: 'var(--fg-subtle)' }}>Aucune facture</div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {factures.map(f => {
              const sc = FACT_STATUT[f.statut_facture] || FACT_STATUT.en_attente;
              return (
                <div key={f.id} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{f.fournisseur || f.description}</span>
                      {f.numero_facture && <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{f.numero_facture}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{new Date(f.date).toLocaleDateString('fr-FR')}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={sc.style}>{sc.label}</span>
                    </div>
                  </div>
                  <span className="font-bold flex-shrink-0" style={{ color: '#9333ea' }}>{parseFloat(f.montant).toLocaleString('fr-FR')} €</span>
                  <button onClick={() => delDepense(f.id)} className="flex-shrink-0" style={{ color: 'var(--fg-subtle)' }}><X className="w-3.5 h-3.5" /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderEtat = () => {
    const barBg = pctConsomme > 90 ? 'var(--danger)' : pctConsomme > 70 ? 'var(--warning)' : 'var(--success)';
    return (
      <div className="space-y-6">
        <div className="rounded-lg shadow-sm p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--fg-muted)' }}>État du Budget {annee}</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label:'Budget alloué', val: totalAlloue, color: 'var(--brand)' },
              { label:'Total dépenses', val: totalDepenses, color: 'var(--danger)' },
              { label:'Solde disponible', val: solde, color: solde >= 0 ? 'var(--success)' : 'var(--danger)' },
            ].map(({ label, val, color }) => (
              <div key={label} className="text-center p-4 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                <div className="text-2xl font-bold" style={{ color }}>{val.toLocaleString('fr-FR')} €</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--fg-subtle)' }}>{label}</div>
              </div>
            ))}
          </div>
          <div className="mb-2 flex justify-between text-sm">
            <span style={{ color: 'var(--fg-muted)' }}>Consommation</span>
            <span className="font-bold" style={{ color: barBg }}>{pctConsomme}%</span>
          </div>
          <div className="h-6 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pctConsomme)}%`, background: barBg }} />
          </div>
          {pctConsomme > 90 && <div className="mt-3 flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--danger)' }}><AlertTriangle className="w-4 h-4" /> Budget presque épuisé</div>}
        </div>
        {lignes.length > 0 && (
          <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}><span className="text-sm font-bold" style={{ color: 'var(--fg-muted)' }}>Détail par catégorie</span></div>
            <table className="w-full text-sm">
              <thead><tr className="text-xs uppercase" style={{ borderBottom: '1px solid var(--border)', color: 'var(--fg-subtle)' }}>
                <th className="text-left px-5 py-2">Catégorie</th>
                <th className="text-right px-5 py-2">Alloué</th>
                <th className="text-right px-5 py-2">Dépensé</th>
                <th className="text-right px-5 py-2">Reste</th>
              </tr></thead>
              <tbody>
                {lignes.map(l => {
                  const spent = [...achats, ...factures].filter(d => d.categorie === l.categorie).reduce((s, d) => s + (parseFloat(d.montant) || 0), 0);
                  const reste = parseFloat(l.montant) - spent;
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-5 py-2.5 font-medium" style={{ color: 'var(--fg-muted)' }}>{l.categorie}</td>
                      <td className="px-5 py-2.5 text-right font-semibold" style={{ color: 'var(--brand)' }}>{parseFloat(l.montant).toLocaleString('fr-FR')} €</td>
                      <td className="px-5 py-2.5 text-right" style={{ color: '#ea580c' }}>{spent.toLocaleString('fr-FR')} €</td>
                      <td className="px-5 py-2.5 text-right font-bold" style={{ color: reste < 0 ? 'var(--danger)' : 'var(--success)' }}>{reste.toLocaleString('fr-FR')} €</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
    {ConfirmModalRenderer}
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--fg-muted)' }}>Année budgétaire</label>
          <select className="rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
            value={annee} onChange={e => setAnnee(Number(e.target.value))}>
            {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="ml-auto"><MigrateBar /></div>
      </div>
      {subSection === 'budget_lignes'   && renderLigneBudgetaire()}
      {subSection === 'budget_achats'   && renderAchats()}
      {subSection === 'budget_factures' && renderFactures()}
      {subSection === 'budget_etat'     && renderEtat()}
    </div>
    </>
  );
}

// ─── STATS PERSONNELS PANEL ───────────────────────────────────────────────────

function StatsPersonnelsPanel() {
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [annee, setAnnee] = useState(new Date().getFullYear());

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await gmaoAPI.getInterventions({
          date_debut: `${annee}-01-01`,
          date_fin:   `${annee}-12-31`,
        });
        const data = res.data?.data || res.data || [];
        setInterventions(Array.isArray(data) ? data : []);
      } catch { setInterventions([]); }
      finally { setLoading(false); }
    })();
  }, [annee]);

  // Group by technician
  const techMap = {};
  interventions.forEach(iv => {
    const tech = iv.technicien;
    const key  = tech ? `${tech.firstName} ${tech.lastName || ''}`.trim() : 'Non assigné';
    if (!techMap[key]) techMap[key] = { nom: key, total: 0, terminees: 0, correctives: 0, preventives: 0, heures: 0 };
    techMap[key].total++;
    if (iv.statut === 'terminee')    techMap[key].terminees++;
    if (iv.type === 'corrective')    techMap[key].correctives++;
    if (iv.type === 'preventive')    techMap[key].preventives++;
    if (iv.duree_reelle)             techMap[key].heures += parseFloat(iv.duree_reelle);
  });

  const techs = Object.values(techMap).sort((a, b) => b.total - a.total);
  const maxTotal = Math.max(...techs.map(t => t.total), 1);
  const totalInterventions = interventions.length;
  const leader = techs[0];

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-teal)' }} />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--fg-muted)' }}>Année</label>
          <select
            className="rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
            value={annee}
            onChange={e => setAnnee(Number(e.target.value))}
          >
            {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="ml-auto text-sm" style={{ color: 'var(--fg-subtle)' }}>
          {totalInterventions} intervention{totalInterventions > 1 ? 's' : ''} — {techs.length} technicien{techs.length > 1 ? 's' : ''}
        </div>
      </div>

      {techs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--fg-subtle)' }}>
          <Users className="w-12 h-12 mb-3" style={{ color: 'var(--border)' }} />
          <p className="text-sm">Aucune donnée pour {annee}</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Technicien le + actif', val: leader?.nom, sub: `${leader?.total} interventions`, bg: 'var(--accent-teal-soft)', border: 'var(--accent-teal)', color: 'var(--accent-teal)', icon: <Users className="w-5 h-5" /> },
              { label: 'Total heures estimées', val: `${techs.reduce((s,t) => s + t.heures, 0).toFixed(1)}h`, sub: 'durée réelle cumulée', bg: 'var(--brand-soft)', border: 'var(--brand)', color: 'var(--brand)', icon: <Clock className="w-5 h-5" /> },
              { label: 'Taux de complétion', val: `${totalInterventions ? Math.round(interventions.filter(i=>i.statut==='terminee').length/totalInterventions*100) : 0}%`, sub: 'interventions terminées', bg: 'var(--success-soft)', border: 'var(--success)', color: 'var(--success)', icon: <CheckCircle className="w-5 h-5" /> },
            ].map(({ label, val, sub, bg, border, color, icon }) => (
              <div key={label} className="rounded-lg p-4" style={{ background: bg, border: `1px solid ${border}`, color }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</span>
                  {icon}
                </div>
                <div className="text-2xl font-bold">{val || '—'}</div>
                <div className="text-xs opacity-70 mt-0.5">{sub}</div>
              </div>
            ))}
          </div>

          {/* Alerte surcharge */}
          {leader && totalInterventions > 0 && leader.total / totalInterventions > 0.5 && (
            <div className="flex items-start gap-3 p-4 rounded-lg" style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid #d97706' }}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#d97706' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#92400e' }}>Risque de surcharge détecté</p>
                <p className="text-xs mt-0.5" style={{ color: '#b45309' }}>
                  <strong>{leader.nom}</strong> réalise {Math.round(leader.total/totalInterventions*100)}% des interventions.
                  Envisagez de redistribuer la charge ou de recruter un technicien supplémentaire.
                </p>
              </div>
            </div>
          )}

          {/* Tableau des techniciens */}
          <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                <Users className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} /> Classement par activité — {annee}
              </h3>
            </div>
            <div>
              {techs.map((t, i) => {
                const pct = Math.round(t.total / maxTotal * 100);
                const share = Math.round(t.total / totalInterventions * 100);
                const rankStyle = i === 0 ? { background: 'var(--warning-soft)', color: 'var(--warning)' }
                  : i === 1 ? { background: 'var(--surface-2)', color: 'var(--fg-muted)' }
                  : i === 2 ? { background: 'rgba(234,88,12,0.12)', color: '#ea580c' }
                  : { background: 'var(--surface-2)', color: 'var(--fg-subtle)' };
                return (
                  <div key={t.nom} className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={rankStyle}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>{t.nom}</div>
                        <div className="flex items-center gap-3 text-xs mt-0.5" style={{ color: 'var(--fg-subtle)' }}>
                          <span>{t.total} interventions ({share}%)</span>
                          <span style={{ color: 'var(--accent-teal)' }}>{t.preventives} prév.</span>
                          <span style={{ color: '#ea580c' }}>{t.correctives} corr.</span>
                          <span style={{ color: 'var(--success)' }}>{t.terminees} terminées</span>
                          {t.heures > 0 && <span>{t.heures.toFixed(1)}h</span>}
                        </div>
                      </div>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--fg-muted)' }}>{t.total}</span>
                    </div>
                    {/* Barre de progression */}
                    <div className="ml-10 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: i === 0 ? 'var(--accent-teal)' : 'var(--border)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── STATS FINANCE PANEL ──────────────────────────────────────────────────────

function StatsFinancePanel({ analytics }) {
  const { t } = useTranslation();
  const locale = BCP47_LOCALES[i18n.language] || 'fr-FR';
  const RATE_KEY = 'gmao_taux_horaire';
  const [tauxHoraire, setTauxHoraire] = useState(() => {
    return parseFloat(localStorage.getItem(RATE_KEY) || '50');
  });
  const [editRate, setEditRate] = useState(false);
  const [tmpRate, setTmpRate] = useState(tauxHoraire);

  const saveRate = () => {
    const v = parseFloat(tmpRate) || 50;
    setTauxHoraire(v);
    localStorage.setItem(RATE_KEY, String(v));
    setEditRate(false);
  };

  if (!analytics) return (
    <div className="flex justify-center items-center h-64">
      <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-teal)' }} />
    </div>
  );

  const MONTHS = [t('Jan'),t('Fév'),t('Mar'),t('Avr'),t('Mai'),t('Jun'),t('Jul'),t('Aoû'),t('Sep'),t('Oct'),t('Nov'),t('Déc')];

  const monthCosts = analytics.byMonth.map(m => ({
    ...m,
    cout: Math.round(m.terminee * (analytics.avgDuree || 2) * tauxHoraire),
  }));
  const maxCout = Math.max(...monthCosts.map(m => m.cout), 1);
  const totalCout = monthCosts.reduce((s, m) => s + m.cout, 0);
  const coutPrev = Math.round(analytics.preventiveCount * (analytics.avgDuree || 2) * tauxHoraire);
  const coutCorr = Math.round(analytics.correctiveCount * (analytics.avgDuree || 2) * tauxHoraire);
  const totalTypes = coutPrev + coutCorr || 1;

  const serviceCosts = analytics.byService.map(s => ({
    ...s,
    cout: Math.round(s.terminee * (analytics.avgDuree || 2) * tauxHoraire),
  })).sort((a,b) => b.cout - a.cout);
  const maxSvcCout = Math.max(...serviceCosts.map(s => s.cout), 1);

  return (
    <div className="p-6 space-y-6">
      {/* Header + taux horaire */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold" style={{ color: 'var(--fg)' }}>{t('Analyse Financière de la Maintenance')}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-subtle)' }}>{t('Estimation basée sur la durée réelle × taux horaire configuré')}</p>
        </div>
        <div className="flex items-center gap-2">
          {editRate ? (
            <>
              <input
                type="number" min="1"
                className="w-24 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                value={tmpRate}
                onChange={e => setTmpRate(e.target.value)}
              />
              <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>€/h</span>
              <button onClick={saveRate} className="px-3 py-1.5 text-white text-xs font-semibold rounded-lg" style={{ background: 'var(--accent-teal)' }}>{t('OK')}</button>
              <button onClick={() => setEditRate(false)} className="px-3 py-1.5 text-xs rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>{t('Annuler')}</button>
            </>
          ) : (
            <button
              onClick={() => { setTmpRate(tauxHoraire); setEditRate(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors" style={{ border: '1px solid var(--border)', color: 'var(--fg-muted)' }}
            >
              <Settings2 className="w-3.5 h-3.5" />
              {t('Taux : {{taux}} €/h', { taux: tauxHoraire })}
            </button>
          )}
        </div>
      </div>

      {/* KPIs financiers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('Coût total estimé'), val: `${totalCout.toLocaleString(locale)} €`, icon: <DollarSign className="w-5 h-5" style={{ color: 'var(--brand)' }} />, bg: 'var(--brand-soft)', border: 'var(--brand)', color: 'var(--brand)' },
          { label: t('Coût préventif'), val: `${coutPrev.toLocaleString(locale)} €`, icon: <TrendingUp className="w-5 h-5" style={{ color: 'var(--accent-teal)' }} />, bg: 'var(--accent-teal-soft)', border: 'var(--accent-teal)', color: 'var(--accent-teal)', sub: t('{{pct}}% du total', { pct: Math.round(coutPrev/totalTypes*100) }) },
          { label: t('Coût correctif'), val: `${coutCorr.toLocaleString(locale)} €`, icon: <AlertTriangle className="w-5 h-5" style={{ color: '#ea580c' }} />, bg: 'rgba(234,88,12,0.1)', border: '#ea580c', color: '#ea580c', sub: t('{{pct}}% du total', { pct: Math.round(coutCorr/totalTypes*100) }) },
          { label: t('Durée moy / inter.'), val: analytics.avgDuree ? `${analytics.avgDuree}h` : '—', icon: <Clock className="w-5 h-5" style={{ color: 'var(--fg-muted)' }} />, bg: 'var(--surface-2)', border: 'var(--border)', color: 'var(--fg-muted)', sub: t('durée réelle moyenne') },
        ].map(({ label, val, icon, bg, border, color, sub }) => (
          <div key={label} className="rounded-lg p-4" style={{ background: bg, border: `1px solid ${border}` }}>
            <div className="flex items-center justify-between mb-1">{icon}<span className="text-xs" style={{ color }}>{label}</span></div>
            <div className="text-xl font-bold mt-1" style={{ color }}>{val}</div>
            {sub && <div className="text-xs mt-0.5" style={{ color }}>{sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution mensuelle du coût */}
        <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
            <BarChart2 className="w-4 h-4" style={{ color: 'var(--brand)' }} /> {t('Coût mensuel estimé')}
          </h3>
          <div className="flex items-end gap-1 h-32">
            {monthCosts.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-t-sm transition-all"
                  style={{ height: `${m.cout ? Math.max(4, (m.cout / maxCout) * 100) : 0}%`, background: 'var(--brand)' }}
                  title={t('{{month}} : {{cout}} €', { month: MONTHS[i], cout: m.cout.toLocaleString(locale) })}
                />
                <span className="text-[9px]" style={{ color: 'var(--fg-subtle)' }}>{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Répartition préventif / correctif */}
        <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
            <PieChart className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} /> {t('Répartition du coût')}
          </h3>
          <div className="space-y-3 mt-4">
            {[
              { label: t('Préventif'), val: coutPrev, barColor: 'var(--accent-teal)', pct: Math.round(coutPrev/totalTypes*100) },
              { label: t('Correctif'), val: coutCorr, barColor: '#ea580c', pct: Math.round(coutCorr/totalTypes*100) },
            ].map(({ label, val, barColor, pct }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium" style={{ color: 'var(--fg-muted)' }}>{label}</span>
                  <span className="font-bold" style={{ color: 'var(--fg)' }}>{val.toLocaleString(locale)} € <span className="font-normal text-xs" style={{ color: 'var(--fg-subtle)' }}>({pct}%)</span></span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 text-xs italic" style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-subtle)' }}>
            {t('* Estimation : nb interventions × durée moy ({{duree}}h) × {{taux}} €/h', { duree: analytics.avgDuree || 2, taux: tauxHoraire })}
          </div>
        </div>
      </div>

      {/* Coût par service */}
      {serviceCosts.length > 0 && (
        <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
            <Layers className="w-4 h-4" style={{ color: '#9333ea' }} /> {t('Coût par service')}
          </h3>
          <div className="space-y-2.5">
            {serviceCosts.slice(0,8).map((s) => (
              <div key={s.service} className="flex items-center gap-3">
                <span className="text-sm w-24 truncate flex-shrink-0" style={{ color: 'var(--fg-muted)' }}>{s.service}</span>
                <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(s.cout / maxSvcCout) * 100}%`, background: '#9333ea' }}
                  />
                </div>
                <span className="text-sm font-semibold w-28 text-right flex-shrink-0" style={{ color: 'var(--fg-muted)' }}>
                  {s.cout.toLocaleString(locale)} €
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TOOL PANORAMA PIÈCES PANEL ───────────────────────────────────────────────

function ToolPanoramaPiecesPanel() {
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await gmaoAPI.getInterventions({ statut: 'terminee' });
        const data = res.data?.data || res.data || [];
        setInterventions(Array.isArray(data) ? data : []);
      } catch { setInterventions([]); }
      finally { setLoading(false); }
    })();
  }, []);

  // Parse pieces_remplacees field (free text, comma-separated)
  const piecesMap = {};
  const servicesPiecesMap = {};
  interventions.forEach(iv => {
    if (!iv.pieces_remplacees) return;
    const service = iv.equipement?.service || 'Non assigné';
    const parts = iv.pieces_remplacees.split(/[,;\/\n]+/).map(p => p.trim()).filter(Boolean);
    parts.forEach(piece => {
      const key = piece.toLowerCase().substring(0, 50);
      if (!piecesMap[key]) piecesMap[key] = { nom: piece, count: 0 };
      piecesMap[key].count++;
      if (!servicesPiecesMap[service]) servicesPiecesMap[service] = 0;
      servicesPiecesMap[service]++;
    });
  });

  const topPieces = Object.values(piecesMap).sort((a,b) => b.count - a.count).slice(0, 12);
  const topServices = Object.entries(servicesPiecesMap).sort((a,b) => b[1]-a[1]).slice(0, 8);
  const maxCount = Math.max(...topPieces.map(p => p.count), 1);
  const maxSvc   = Math.max(...topServices.map(s => s[1]), 1);
  const totalPieces = Object.values(piecesMap).reduce((s, p) => s + p.count, 0);
  const ivWithPieces = interventions.filter(i => i.pieces_remplacees).length;

  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  // Consumption by month
  const byMonth = Array.from({ length: 12 }, (_, i) => {
    const count = interventions.filter(iv => {
      if (!iv.pieces_remplacees || !iv.date_planifiee) return false;
      return new Date(iv.date_planifiee).getMonth() === i;
    }).length;
    return { month: i, count };
  });
  const maxMonth = Math.max(...byMonth.map(m => m.count), 1);

  if (loading) return <div className="flex justify-center items-center h-64"><RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-teal)' }} /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--fg)' }}>Panorama des Pièces & Consommables</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-subtle)' }}>Analyse des pièces remplacées lors des interventions terminées</p>
        </div>
        <div className="flex gap-3">
          {[
            { val: totalPieces, label: 'pièces utilisées' },
            { val: ivWithPieces, label: 'interventions concernées' },
            { val: topPieces.length, label: 'références distinctes' },
          ].map(({ val, label }) => (
            <div key={label} className="text-center rounded-lg px-4 py-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xl font-bold" style={{ color: 'var(--fg)' }}>{val}</div>
              <div className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {topPieces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--fg-subtle)' }}>
          <Package className="w-12 h-12 mb-3" style={{ color: 'var(--border)' }} />
          <p className="text-sm">Aucune pièce enregistrée dans les interventions</p>
          <p className="text-xs mt-1">Renseignez le champ "Pièces remplacées" lors de la clôture d'interventions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top pièces */}
          <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
              <Package className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} /> Top pièces utilisées
            </h3>
            <div className="space-y-2.5">
              {topPieces.map((p, i) => (
                <div key={p.nom} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={i < 3 ? { background: 'var(--accent-teal-soft)', color: 'var(--accent-teal)' } : { background: 'var(--surface-2)', color: 'var(--fg-subtle)' }}>
                    {i+1}
                  </span>
                  <span className="text-sm flex-1 truncate capitalize" style={{ color: 'var(--fg-muted)' }}>{p.nom}</span>
                  <div className="w-24 h-2.5 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(p.count/maxCount)*100}%`, background: i < 3 ? 'var(--accent-teal)' : 'var(--border)' }} />
                  </div>
                  <span className="text-sm font-bold w-8 text-right flex-shrink-0" style={{ color: 'var(--fg-muted)' }}>{p.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Services les plus consommateurs */}
          <div className="space-y-4">
            <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                <Layers className="w-4 h-4" style={{ color: '#9333ea' }} /> Services consommateurs
              </h3>
              <div className="space-y-2.5">
                {topServices.map(([svc, count]) => (
                  <div key={svc} className="flex items-center gap-3">
                    <span className="text-sm w-20 truncate flex-shrink-0" style={{ color: 'var(--fg-muted)' }}>{svc}</span>
                    <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(count/maxSvc)*100}%`, background: '#9333ea' }} />
                    </div>
                    <span className="text-sm font-bold w-8 text-right flex-shrink-0" style={{ color: 'var(--fg-muted)' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fréquence mensuelle */}
            <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                <BarChart2 className="w-4 h-4" style={{ color: 'var(--brand)' }} /> Fréquence mensuelle
              </h3>
              <div className="flex items-end gap-1 h-16">
                {byMonth.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-t-sm transition-colors"
                      style={{ height: `${m.count ? Math.max(4, (m.count/maxMonth)*100) : 0}%`, background: 'var(--brand)' }}
                      title={`${MONTHS[i]} : ${m.count}`}
                    />
                    <span className="text-[8px]" style={{ color: 'var(--fg-subtle)' }}>{MONTHS[i].substring(0,1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TOOL ANALYSE 20/80 PANEL ─────────────────────────────────────────────────

function ToolAnalyse2080Panel({ analytics }) {
  if (!analytics) return <div className="flex justify-center items-center h-64"><RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-teal)' }} /></div>;

  const defaillants = analytics.topDefaillants || [];
  const totalPannes = defaillants.reduce((s, d) => s + d.nbPannes, 0) || 1;

  let cumul = 0;
  const pareto = defaillants.map((d, i) => {
    cumul += d.nbPannes;
    return {
      ...d,
      pct: Math.round(d.nbPannes / totalPannes * 100),
      pctCumul: Math.round(cumul / totalPannes * 100),
      rank: i + 1,
    };
  });

  const seuil80 = pareto.findIndex(p => p.pctCumul >= 80);
  const nb20pct = seuil80 >= 0 ? seuil80 + 1 : pareto.length;
  const pct20equip = pareto.length > 0 ? Math.round(nb20pct / pareto.length * 100) : 0;
  const maxPannes = Math.max(...pareto.map(p => p.nbPannes), 1);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
          <Zap className="w-5 h-5" style={{ color: 'var(--warning)' }} />
          Analyse 20/80 — Budget de Maintenance
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--fg-subtle)' }}>
          Les {pct20equip}% d'équipements les plus défaillants concentrent 80% des interventions correctives
        </p>
      </div>

      {pareto.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--fg-subtle)' }}>
          <Zap className="w-12 h-12 mb-3" style={{ color: 'var(--border)' }} />
          <p className="text-sm">Aucune intervention corrective enregistrée</p>
        </div>
      ) : (
        <>
          {/* Résumé Pareto */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Équipements critiques', val: nb20pct, sub: `représentent 80% des pannes`, bg: 'var(--danger-soft)', border: 'var(--danger)', color: 'var(--danger)' },
              { label: 'Total pannes correctives', val: totalPannes, sub: 'sur tous les équipements', bg: 'rgba(234,88,12,0.1)', border: '#ea580c', color: '#ea580c' },
              { label: 'Équipement le + défaillant', val: pareto[0]?.equipement?.nom || '—', sub: `${pareto[0]?.nbPannes || 0} pannes`, bg: 'var(--warning-soft)', border: 'var(--warning)', color: 'var(--warning)' },
            ].map(({ label, val, sub, bg, border, color }) => (
              <div key={label} className="rounded-lg p-4" style={{ background: bg, border: `1px solid ${border}`, color }}>
                <div className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-2">{label}</div>
                <div className="text-xl font-bold truncate">{val}</div>
                <div className="text-xs opacity-70 mt-0.5">{sub}</div>
              </div>
            ))}
          </div>

          {/* Graphe Pareto */}
          <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-5 flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
              <BarChart2 className="w-4 h-4" style={{ color: '#ea580c' }} /> Diagramme de Pareto
            </h3>
            <div className="relative">
              {/* Barre seuil 80% */}
              <div
                className="absolute top-0 bottom-8 border-l-2 border-dashed z-10"
                style={{ left: `${seuil80 >= 0 ? ((seuil80 + 0.5) / pareto.length) * 100 : 80}%`, borderColor: 'var(--danger)' }}
              >
                <span className="absolute -top-5 -translate-x-1/2 text-[10px] font-bold whitespace-nowrap px-1" style={{ color: 'var(--danger)', background: 'var(--surface)' }}>
                  seuil 80%
                </span>
              </div>
              <div className="flex items-end gap-1 h-40">
                {pareto.map((p, i) => {
                  const isAbove80 = i < nb20pct;
                  return (
                    <div key={p.equipement?.id || i} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full rounded-t-sm transition-all"
                        style={{ height: `${Math.max(4, (p.nbPannes / maxPannes) * 100)}%`, background: isAbove80 ? 'var(--danger)' : 'var(--border)' }}
                        title={`${p.equipement?.nom}: ${p.nbPannes} pannes (${p.pctCumul}% cumulé)`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tableau détaillé */}
          <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Classement détaillé</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider" style={{ borderBottom: '1px solid var(--border)', color: 'var(--fg-subtle)' }}>
                    <th className="text-left px-4 py-2">Rang</th>
                    <th className="text-left px-4 py-2">Équipement</th>
                    <th className="text-left px-4 py-2">Service</th>
                    <th className="text-right px-4 py-2">Pannes</th>
                    <th className="text-right px-4 py-2">% Cumulé</th>
                    <th className="text-left px-4 py-2">Zone</th>
                  </tr>
                </thead>
                <tbody>
                  {pareto.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i < nb20pct ? 'var(--danger-soft)' : 'transparent' }}>
                      <td className="px-4 py-2.5 font-bold" style={{ color: 'var(--fg-muted)' }}>#{p.rank}</td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--fg)' }}>{p.equipement?.nom || '—'}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--fg-muted)' }}>{p.equipement?.service || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-bold" style={{ color: '#ea580c' }}>{p.nbPannes}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-semibold" style={{ color: p.pctCumul >= 80 ? 'var(--danger)' : 'var(--fg-muted)' }}>{p.pctCumul}%</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {i < nb20pct ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>Critique</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--fg-subtle)' }}>Normal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── TOOL CONSOMMATION BUDGET PANEL ──────────────────────────────────────────


// ─── TOOL CONSOMMATION BUDGET PANEL ──────────────────────────────────────────

function ToolConsoBudgetPanel({ analytics }) {
  if (!analytics) return <div className="flex justify-center items-center h-64"><RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-teal)' }} /></div>;

  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  const totalTypes = (analytics.preventiveCount + analytics.correctiveCount) || 1;
  const maxMonth = Math.max(...analytics.byMonth.map(m => m.total), 1);
  const maxService = Math.max(...analytics.byService.map(s => s.total), 1);

  const SERVICE_BAR_COLORS = ['var(--accent-teal)','var(--brand)','#9333ea','#ea580c','#ec4899','#6366f1','var(--warning)','var(--danger)'];

  const recs = [];
  if (analytics.tauxConformite < 70)
    recs.push({ type: 'warning', msg: `Taux de conformité bas (${analytics.tauxConformite}%) — renforcer la planification préventive.` });
  if (analytics.enRetard > 5)
    recs.push({ type: 'danger', msg: `${analytics.enRetard} interventions en retard — mobiliser des ressources supplémentaires.` });
  const pctCorr = Math.round(analytics.correctiveCount / totalTypes * 100);
  if (pctCorr > 40)
    recs.push({ type: 'warning', msg: `Part corrective élevée (${pctCorr}%) — investir davantage en préventif pour réduire les pannes.` });
  if (analytics.byService.length > 0) {
    const top = analytics.byService[0];
    recs.push({ type: 'info', msg: `Le service ${top.service} concentre le plus d'activité (${top.total} interventions).` });
  }
  if (recs.length === 0)
    recs.push({ type: 'success', msg: 'Vos indicateurs de maintenance sont dans les normes. Continuez sur cette lancée !' });

  const REC_STYLE = {
    warning: { background: 'var(--warning-soft)', border: '1px solid var(--warning)', color: '#92400e' },
    danger:  { background: 'var(--danger-soft)',  border: '1px solid var(--danger)',  color: 'var(--danger)' },
    info:    { background: 'var(--brand-soft)',    border: '1px solid var(--brand)',   color: 'var(--brand)' },
    success: { background: 'var(--success-soft)',  border: '1px solid var(--success)', color: 'var(--success)' },
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
          <PieChart className="w-5 h-5" style={{ color: '#9333ea' }} />
          Analyse de la Consommation du Budget
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--fg-subtle)' }}>Vue globale de l'efficacité de votre activité de maintenance</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Conformité', val: `${analytics.tauxConformite}%`, icon: <CheckCircle className="w-5 h-5" />, bg: analytics.tauxConformite >= 80 ? 'var(--success-soft)' : 'var(--warning-soft)', border: analytics.tauxConformite >= 80 ? 'var(--success)' : 'var(--warning)', color: analytics.tauxConformite >= 80 ? 'var(--success)' : 'var(--warning)' },
          { label: 'Interventions (année)', val: analytics.totalThisYear, icon: <Wrench className="w-5 h-5" />, bg: 'var(--brand-soft)', border: 'var(--brand)', color: 'var(--brand)' },
          { label: 'Part préventif', val: `${Math.round(analytics.preventiveCount/totalTypes*100)}%`, icon: <TrendingUp className="w-5 h-5" />, bg: 'var(--accent-teal-soft)', border: 'var(--accent-teal)', color: 'var(--accent-teal)' },
          { label: 'Retards', val: analytics.enRetard, icon: <AlertTriangle className="w-5 h-5" />, bg: analytics.enRetard > 0 ? 'var(--danger-soft)' : 'var(--success-soft)', border: analytics.enRetard > 0 ? 'var(--danger)' : 'var(--success)', color: analytics.enRetard > 0 ? 'var(--danger)' : 'var(--success)' },
        ].map(({ label, val, icon, bg, border, color }) => (
          <div key={label} className="rounded-lg p-4" style={{ background: bg, border: `1px solid ${border}`, color }}>
            <div className="flex items-center justify-between mb-2">{icon}<span className="text-xs font-semibold uppercase opacity-70">{label}</span></div>
            <div className="text-2xl font-bold">{val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition Prév / Corr */}
        <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--fg-muted)' }}>Répartition des interventions</h3>
          <div className="space-y-3">
            {[
              { label: 'Préventif', count: analytics.preventiveCount, barColor: 'var(--accent-teal)' },
              { label: 'Correctif', count: analytics.correctiveCount, barColor: '#ea580c' },
            ].map(({ label, count, barColor }) => {
              const pct = Math.round(count / totalTypes * 100);
              return (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
                    <span className="font-bold" style={{ color: 'var(--fg)' }}>{count} <span className="font-normal" style={{ color: 'var(--fg-subtle)' }}>({pct}%)</span></span>
                  </div>
                  <div className="h-4 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Terminées vs planifiées */}
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex justify-between text-sm mb-1.5">
              <span style={{ color: 'var(--fg-muted)' }}>Terminées / Planifiées</span>
              <span className="font-bold" style={{ color: 'var(--fg)' }}>{analytics.termineeThisYear} / {analytics.totalThisYear}</span>
            </div>
            <div className="h-4 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${analytics.tauxConformite}%`, background: analytics.tauxConformite >= 80 ? 'var(--success)' : analytics.tauxConformite >= 60 ? 'var(--warning)' : 'var(--danger)' }}
              />
            </div>
          </div>
        </div>

        {/* Distribution par service */}
        <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--fg-muted)' }}>Distribution par service</h3>
          {analytics.byService.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--fg-subtle)' }}>Aucune donnée</div>
          ) : (
            <div className="space-y-2.5">
              {analytics.byService.slice(0,6).map((s, i) => (
                <div key={s.service} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: SERVICE_BAR_COLORS[i % SERVICE_BAR_COLORS.length] }} />
                  <span className="text-sm w-20 truncate flex-shrink-0" style={{ color: 'var(--fg-muted)' }}>{s.service}</span>
                  <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(s.total/maxService)*100}%`, background: SERVICE_BAR_COLORS[i % SERVICE_BAR_COLORS.length] }} />
                  </div>
                  <span className="text-xs font-semibold w-8 text-right" style={{ color: 'var(--fg-muted)' }}>{s.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Évolution mensuelle */}
      <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
          <BarChart2 className="w-4 h-4" style={{ color: 'var(--brand)' }} /> Activité mensuelle (année en cours)
        </h3>
        <div className="flex items-end gap-1 h-28">
          {analytics.byMonth.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex flex-col items-stretch" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div
                  className="w-full transition-colors"
                  style={{ height: `${m.terminee ? Math.max(2, (m.terminee/maxMonth)*80) : 0}%`, background: 'var(--accent-teal)' }}
                  title={`${MONTHS[i]}: ${m.terminee} terminées / ${m.total} total`}
                />
                <div
                  className="w-full"
                  style={{ height: `${(m.total - m.terminee) ? Math.max(2, ((m.total-m.terminee)/maxMonth)*80) : 0}%`, background: 'var(--border)' }}
                />
              </div>
              <span className="text-[9px]" style={{ color: 'var(--fg-subtle)' }}>{MONTHS[i]}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--fg-subtle)' }}>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: 'var(--accent-teal)' }} />Terminées</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: 'var(--border)' }} />En attente</div>
        </div>
      </div>

      {/* Recommandations */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
          <Zap className="w-4 h-4" style={{ color: 'var(--warning)' }} /> Recommandations automatiques
        </h3>
        {recs.map((r, i) => (
          <div key={i} className="flex items-start gap-3 p-3.5 rounded-lg" style={REC_STYLE[r.type]}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{r.msg}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── BUDGET PANEL ─────────────────────────────────────────────────────────────

const BUDGET_STORE_KEY = 'gmao_budget_data';

function loadBudgetData() {
  try { return JSON.parse(localStorage.getItem(BUDGET_STORE_KEY) || '{}'); } catch { return {}; }
}
function saveBudgetData(data) {
  localStorage.setItem(BUDGET_STORE_KEY, JSON.stringify(data));
}

function BudgetPanel({ subSection }) {
  const anneeActuelle = new Date().getFullYear();
  const [annee, setAnnee] = useState(anneeActuelle);
  const [budget, setBudget] = useState(loadBudgetData);

  const save = (newBudget) => { setBudget(newBudget); saveBudgetData(newBudget); };
  const key = (type) => `${annee}_${type}`;

  const lignes   = budget[key('lignes')]   || [];
  const achats   = budget[key('achats')]   || [];
  const factures = budget[key('factures')] || [];

  const totalAlloue  = lignes.reduce((s, l) => s + (parseFloat(l.montant) || 0), 0);
  const totalAchats  = achats.reduce((s, a) => s + (parseFloat(a.montant) || 0), 0);
  const totalFact    = factures.reduce((s, f) => s + (parseFloat(f.montant_ttc) || 0), 0);
  const totalDepenses = totalAchats + totalFact;
  const solde        = totalAlloue - totalDepenses;
  const pctConsomme  = totalAlloue > 0 ? Math.round((totalDepenses / totalAlloue) * 100) : 0;

  const CATEGORIES = ['Préventif','Correctif','Pièces de rechange','Contrats externes','Consommables','Formation','Outillage','Autre'];

  // ── Ligne budgétaire ──
  const [formLigne, setFormLigne] = useState({ categorie: '', montant: '', description: '' });
  const addLigne = (e) => {
    e.preventDefault();
    if (!formLigne.categorie || !formLigne.montant) return;
    const newLignes = [...lignes, { ...formLigne, id: Date.now() }];
    save({ ...budget, [key('lignes')]: newLignes });
    setFormLigne({ categorie: '', montant: '', description: '' });
  };
  const delLigne = (id) => save({ ...budget, [key('lignes')]: lignes.filter(l => l.id !== id) });

  // ── Achats ──
  const [formAchat, setFormAchat] = useState({ date: new Date().toISOString().split('T')[0], description: '', categorie: '', montant: '', fournisseur: '' });
  const addAchat = (e) => {
    e.preventDefault();
    if (!formAchat.description || !formAchat.montant) return;
    const newAchats = [...achats, { ...formAchat, id: Date.now() }];
    save({ ...budget, [key('achats')]: newAchats });
    setFormAchat({ date: new Date().toISOString().split('T')[0], description: '', categorie: '', montant: '', fournisseur: '' });
  };
  const delAchat = (id) => save({ ...budget, [key('achats')]: achats.filter(a => a.id !== id) });

  // ── Factures ──
  const [formFact, setFormFact] = useState({ date_facture: new Date().toISOString().split('T')[0], numero: '', prestataire: '', montant_ht: '', tva: '18', montant_ttc: '', statut: 'en_attente' });
  const addFacture = (e) => {
    e.preventDefault();
    if (!formFact.prestataire || !formFact.montant_ttc) return;
    const newFacts = [...factures, { ...formFact, id: Date.now() }];
    save({ ...budget, [key('factures')]: newFacts });
    setFormFact({ date_facture: new Date().toISOString().split('T')[0], numero: '', prestataire: '', montant_ht: '', tva: '18', montant_ttc: '', statut: 'en_attente' });
  };
  const delFacture = (id) => save({ ...budget, [key('factures')]: factures.filter(f => f.id !== id) });

  const BP_FACT_STATUT = {
    en_attente: { label: 'En attente', style: { background: 'var(--warning-soft)', color: 'var(--warning)' } },
    payee:      { label: 'Payée',      style: { background: 'var(--success-soft)', color: 'var(--success)' } },
    contestee:  { label: 'Contestée',  style: { background: 'var(--danger-soft)',  color: 'var(--danger)'  } },
  };

  const SectionHeader = ({ icon, title }) => (
    <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>{icon}{title}</h3>
  );

  const renderLigneBudgetaire = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <SectionHeader icon={<DollarSign className="w-4 h-4" style={{ color: 'var(--brand)' }} />} title="Ajouter une ligne budgétaire" />
        <form onSubmit={addLigne} className="space-y-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>Catégorie *</label>
            <select className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={formLigne.categorie} onChange={e => setFormLigne(f => ({ ...f, categorie: e.target.value }))}>
              <option value="">— Sélectionner —</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>Montant alloué (€) *</label>
            <input type="number" min="0" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              placeholder="0" value={formLigne.montant} onChange={e => setFormLigne(f => ({ ...f, montant: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>Description</label>
            <input className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              placeholder="Optionnel…" value={formLigne.description} onChange={e => setFormLigne(f => ({ ...f, description: e.target.value }))} />
          </div>
          <button type="submit" className="w-full py-2 text-white text-sm font-semibold rounded-lg transition-colors" style={{ background: 'var(--brand)' }}>
            Ajouter la ligne
          </button>
        </form>
      </div>
      <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--fg-muted)' }}>Lignes budgétaires {annee}</span>
          <span className="text-sm font-bold" style={{ color: 'var(--brand)' }}>{totalAlloue.toLocaleString('fr-FR')} €</span>
        </div>
        {lignes.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--fg-subtle)' }}>Aucune ligne budgétaire</div>
        ) : (
          <div>
            {lignes.map(l => (
              <div key={l.id} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{l.categorie}</div>
                  {l.description && <div className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{l.description}</div>}
                </div>
                <span className="font-bold" style={{ color: 'var(--brand)' }}>{parseFloat(l.montant).toLocaleString('fr-FR')} €</span>
                <button onClick={() => delLigne(l.id)} style={{ color: 'var(--fg-subtle)' }}><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderAchats = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <SectionHeader icon={<ShoppingCart className="w-4 h-4" style={{ color: '#ea580c' }} />} title="Enregistrer un achat / dépense" />
        <form onSubmit={addAchat} className="space-y-3">
          {[
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'description', label: 'Description *', type: 'text', placeholder: 'Nature de la dépense…' },
            { key: 'fournisseur', label: 'Fournisseur', type: 'text', placeholder: 'Nom du fournisseur…' },
            { key: 'montant', label: 'Montant (€) *', type: 'number', placeholder: '0' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>{label}</label>
              <input type={type} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                placeholder={placeholder} value={formAchat[key]} onChange={e => setFormAchat(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>Catégorie</label>
            <select className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={formAchat.categorie} onChange={e => setFormAchat(f => ({ ...f, categorie: e.target.value }))}>
              <option value="">— Catégorie —</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" className="w-full py-2 text-white text-sm font-semibold rounded-lg transition-colors" style={{ background: '#ea580c' }}>
            Enregistrer la dépense
          </button>
        </form>
      </div>
      <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--fg-muted)' }}>Achats & Dépenses {annee}</span>
          <span className="text-sm font-bold" style={{ color: '#ea580c' }}>{totalAchats.toLocaleString('fr-FR')} €</span>
        </div>
        {achats.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--fg-subtle)' }}>Aucun achat enregistré</div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {[...achats].reverse().map(a => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="text-xs flex-shrink-0 w-20" style={{ color: 'var(--fg-subtle)' }}>{new Date(a.date).toLocaleDateString('fr-FR')}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{a.description}</div>
                  {a.fournisseur && <div className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{a.fournisseur}</div>}
                </div>
                <span className="font-bold flex-shrink-0" style={{ color: '#ea580c' }}>{parseFloat(a.montant).toLocaleString('fr-FR')} €</span>
                <button onClick={() => delAchat(a.id)} className="flex-shrink-0" style={{ color: 'var(--fg-subtle)' }}><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderFactures = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-lg shadow-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <SectionHeader icon={<Receipt className="w-4 h-4" style={{ color: '#9333ea' }} />} title="Enregistrer une facture" />
        <form onSubmit={addFacture} className="space-y-3">
          {[
            { key: 'date_facture', label: 'Date facture', type: 'date' },
            { key: 'numero', label: 'N° Facture', type: 'text', placeholder: 'FAC-2026-001' },
            { key: 'prestataire', label: 'Prestataire *', type: 'text', placeholder: 'Nom du prestataire…' },
            { key: 'montant_ht', label: 'Montant HT (€)', type: 'number', placeholder: '0' },
            { key: 'tva', label: 'TVA (%)', type: 'number', placeholder: '18' },
            { key: 'montant_ttc', label: 'Montant TTC (€) *', type: 'number', placeholder: '0' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>{label}</label>
              <input type={type} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                placeholder={placeholder} value={formFact[key]}
                onChange={e => setFormFact(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--fg-muted)' }}>Statut</label>
            <select className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={formFact.statut} onChange={e => setFormFact(f => ({ ...f, statut: e.target.value }))}>
              <option value="en_attente">En attente</option>
              <option value="payee">Payée</option>
              <option value="contestee">Contestée</option>
            </select>
          </div>
          <button type="submit" className="w-full py-2 text-white text-sm font-semibold rounded-lg transition-colors" style={{ background: '#9333ea' }}>
            Enregistrer la facture
          </button>
        </form>
      </div>
      <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--fg-muted)' }}>Factures {annee}</span>
          <span className="text-sm font-bold" style={{ color: '#9333ea' }}>{totalFact.toLocaleString('fr-FR')} €</span>
        </div>
        {factures.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--fg-subtle)' }}>Aucune facture enregistrée</div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {[...factures].reverse().map(f => {
              const sc = BP_FACT_STATUT[f.statut] || BP_FACT_STATUT.en_attente;
              return (
                <div key={f.id} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{f.prestataire}</span>
                      {f.numero && <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{f.numero}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{new Date(f.date_facture).toLocaleDateString('fr-FR')}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={sc.style}>{sc.label}</span>
                    </div>
                  </div>
                  <span className="font-bold flex-shrink-0" style={{ color: '#9333ea' }}>{parseFloat(f.montant_ttc).toLocaleString('fr-FR')} €</span>
                  <button onClick={() => delFacture(f.id)} className="flex-shrink-0" style={{ color: 'var(--fg-subtle)' }}><X className="w-3.5 h-3.5" /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderEtat = () => {
    const pctBar = Math.min(100, pctConsomme);
    const barBg = pctConsomme > 90 ? 'var(--danger)' : pctConsomme > 70 ? 'var(--warning)' : 'var(--success)';
    return (
      <div className="space-y-6">
        {/* Jauge budgétaire */}
        <div className="rounded-lg shadow-sm p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--fg-muted)' }}>État du Budget {annee}</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Budget alloué', val: totalAlloue, color: 'var(--brand)' },
              { label: 'Total dépenses', val: totalDepenses, color: 'var(--danger)' },
              { label: 'Solde disponible', val: solde, color: solde >= 0 ? 'var(--success)' : 'var(--danger)' },
            ].map(({ label, val, color }) => (
              <div key={label} className="text-center p-4 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                <div className="text-2xl font-bold" style={{ color }}>{val.toLocaleString('fr-FR')} €</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--fg-subtle)' }}>{label}</div>
              </div>
            ))}
          </div>
          <div className="mb-2 flex justify-between text-sm">
            <span style={{ color: 'var(--fg-muted)' }}>Consommation</span>
            <span className="font-bold" style={{ color: barBg }}>{pctConsomme}%</span>
          </div>
          <div className="h-6 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pctBar}%`, background: barBg }} />
          </div>
          {pctConsomme > 90 && (
            <div className="mt-3 flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--danger)' }}>
              <AlertTriangle className="w-4 h-4" /> Attention : budget presque épuisé
            </div>
          )}
        </div>

        {/* Détail par catégorie */}
        {lignes.length > 0 && (
          <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <span className="text-sm font-bold" style={{ color: 'var(--fg-muted)' }}>Détail par catégorie</span>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-xs uppercase" style={{ borderBottom: '1px solid var(--border)', color: 'var(--fg-subtle)' }}>
                <th className="text-left px-5 py-2">Catégorie</th>
                <th className="text-right px-5 py-2">Alloué</th>
                <th className="text-right px-5 py-2">Dépensé</th>
                <th className="text-right px-5 py-2">Reste</th>
              </tr></thead>
              <tbody>
                {lignes.map(l => {
                  const spent = [...achats, ...factures.map(f => ({ ...f, montant: f.montant_ttc }))]
                    .filter(a => a.categorie === l.categorie)
                    .reduce((s, a) => s + (parseFloat(a.montant) || 0), 0);
                  const reste = parseFloat(l.montant) - spent;
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-5 py-2.5 font-medium" style={{ color: 'var(--fg-muted)' }}>{l.categorie}</td>
                      <td className="px-5 py-2.5 text-right font-semibold" style={{ color: 'var(--brand)' }}>{parseFloat(l.montant).toLocaleString('fr-FR')} €</td>
                      <td className="px-5 py-2.5 text-right" style={{ color: '#ea580c' }}>{spent.toLocaleString('fr-FR')} €</td>
                      <td className="px-5 py-2.5 text-right font-bold" style={{ color: reste < 0 ? 'var(--danger)' : 'var(--success)' }}>{reste.toLocaleString('fr-FR')} €</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-5">
      {/* Toolbar années */}
      <div className="flex items-center gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--fg-muted)' }}>Année budgétaire</label>
          <select className="rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
            value={annee} onChange={e => setAnnee(Number(e.target.value))}>
            {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="ml-auto text-xs rounded-lg px-3 py-2" style={{ color: 'var(--warning)', background: 'var(--warning-soft)', border: '1px solid var(--warning)' }}>
          💾 Données stockées localement — export vers BDD prévu en Phase 4
        </div>
      </div>

      {subSection === 'budget_lignes'   && renderLigneBudgetaire()}
      {subSection === 'budget_achats'   && renderAchats()}
      {subSection === 'budget_factures' && renderFactures()}
      {subSection === 'budget_etat'     && renderEtat()}
    </div>
  );
}

// ─── GMAO NAVIGATION CONFIG ──────────────────────────────────────────────────

const GMAO_MODULES = [
  {
    id: 'parc',
    label: "Gestion du parc d'équipements",
    items: [
      { id: 'parc_acquisition',  label: 'Acquisition',  wip: false },
      { id: 'parc_inventaire',   label: 'Inventaire',   wip: false },
      { id: 'parc_panorama',     label: 'Panorama',     wip: false },
      { id: 'parc_localisation', label: 'Localisation', wip: false },
      { id: 'parc_retrait',      label: 'Retrait',      wip: false },
      { id: 'parc_reforme',      label: 'Réforme',      wip: false },
      { id: 'parc_historique',   label: 'Historique',   wip: false },
      { id: 'parc_doc',          label: 'Doc. Eqpt.',   wip: true  },
    ],
  },
  {
    id: 'maintenance',
    label: 'Activité de maintenance',
    items: [
      { id: 'maint_contrats',       label: 'Contrats',      wip: false },
      { id: 'maint_planification',  label: 'Planification', wip: false },
      { id: 'maint_demande',        label: 'Demande',       wip: true },
      { id: 'maint_intervention',   label: 'Intervention',  wip: false },
      { id: 'maint_listing',        label: 'Listing Op.',   wip: true },
      { id: 'maint_historique',     label: 'Historique',    wip: true },
    ],
  },
  {
    id: 'pieces',
    label: 'Gestion des pièces de rechange',
    items: [
      { id: 'pieces_liste',       label: 'Pièces et consommables',  wip: false },
      { id: 'pieces_stock',       label: 'Gestion du stock',        wip: false },
      { id: 'pieces_mouvements',  label: 'Listing des mouvements',  wip: false },
    ],
  },
  {
    id: 'budget',
    label: 'Budget de maintenance',
    items: [
      { id: 'budget_lignes',    label: 'Ligne budgétaire',          wip: false },
      { id: 'budget_achats',    label: 'Achats et autres dépenses', wip: false },
      { id: 'budget_factures',  label: 'Factures de prestation',    wip: false },
      { id: 'budget_etat',      label: 'Etat du budget',            wip: false },
    ],
  },
  {
    id: 'stats',
    label: 'Statistiques Annuelles des activités',
    items: [
      { id: 'stats_personnels',   label: 'Personnels',  wip: false },
      { id: 'stats_equipements',  label: 'Equipements', wip: false },
      { id: 'stats_finance',      label: 'Finance',     wip: false },
    ],
  },
];

const TOOLBAR_ITEMS = [
  { id: 'tool_panorama_maint',  shortLabel: 'Panorama maintenance',     label: 'Panorama de la maintenance',                   wip: false },
  { id: 'tool_panorama_pieces', shortLabel: 'Pièces & consomm.',        label: 'Panorama des pièces et consommables',           wip: false },
  { id: 'tool_2080',            shortLabel: 'Analyse 20/80',            label: 'Analyse des 20/80 du budget de maintenance',    wip: false },
  { id: 'tool_conso_budget',    shortLabel: 'Consomm. budget',          label: 'Analyse de la consommation du budget',          wip: false },
];

// ─── WIP PLACEHOLDER ──────────────────────────────────────────────────────────

function WIPPanel({ label }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: '#f1f5f9' }}>
        <Wrench className="w-9 h-9" style={{ color: '#cbd5e1' }} />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: '#64748b' }}>{label}</h3>
      <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>Ce module est en cours de développement.</p>
      <span className="px-4 py-1.5 text-xs font-semibold rounded-full" style={{ background: 'rgba(234,88,12,0.1)', color: '#ea580c', border: '1px solid rgba(234,88,12,0.3)' }}>
        Phase 2 — Prochainement disponible
      </span>
    </div>
  );
}

// ─── MINI CALENDAR ────────────────────────────────────────────────────────────

function MiniCalendar() {
  const [cur, setCur] = useState(new Date());
  const today = new Date();
  const y = cur.getFullYear();
  const m = cur.getMonth();
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const isToday = (d) => d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div style={{ color: '#fff' }}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setCur(new Date(y, m - 1, 1))} className="p-1 rounded transition-colors">
          <ChevronLeft className="w-3 h-3" style={{ color: '#94a3b8' }} />
        </button>
        <span className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>{MONTHS[m]} {y}</span>
        <button onClick={() => setCur(new Date(y, m + 1, 1))} className="p-1 rounded transition-colors">
          <ChevronRight className="w-3 h-3" style={{ color: '#94a3b8' }} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center gap-0.5">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-[9px] font-semibold py-0.5" style={{ color: '#64748b' }}>{d}</div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className="text-[10px] py-0.5 rounded leading-4"
            style={!day ? {} : isToday(day)
              ? { background: 'var(--accent-teal)', color: '#fff', fontWeight: 700 }
              : { color: '#94a3b8', cursor: 'pointer' }
            }
          >
            {day ?? ''}
          </div>
        ))}
      </div>
      <div className="mt-2 pt-1.5 text-center" style={{ borderTop: '1px solid #334155' }}>
        <span className="text-[9px]" style={{ color: '#64748b' }}>
          Today: {today.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

// ─── SIDEBAR MODULE ───────────────────────────────────────────────────────────

function SidebarModule({ module, activeSection, onSelect, expanded, onToggle }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(51,65,85,0.6)' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold flex-shrink-0" style={{ color: '#2dd4bf' }}>
            {expanded ? '«' : '»'}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide truncate" style={{ color: '#cbd5e1' }}>
            {module.label}
          </span>
        </div>
        {expanded
          ? <ChevronUp className="w-3 h-3 flex-shrink-0 ml-1" style={{ color: '#64748b' }} />
          : <ChevronDown className="w-3 h-3 flex-shrink-0 ml-1" style={{ color: '#64748b' }} />
        }
      </button>

      {expanded && (
        <div className="px-2 pb-2.5 grid grid-cols-2 gap-1.5">
          {module.items.map(item => {
            const isActive = activeSection === item.id;
            const btnStyle = isActive
              ? { background: 'var(--accent-teal)', color: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }
              : item.wip
              ? { background: 'rgba(51,65,85,0.4)', color: '#475569', cursor: 'not-allowed' }
              : { background: '#334155', color: '#cbd5e1' };
            return (
              <button
                key={item.id}
                onClick={() => !item.wip && onSelect(item.id)}
                title={item.wip ? 'En cours de développement' : item.label}
                className="px-2 py-2 rounded text-[11px] font-medium text-center leading-tight transition-all"
                style={btnStyle}
              >
                {item.label}
                {item.wip && <span className="block text-[8px] mt-0.5 leading-none" style={{ color: '#475569' }}>bientôt</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function GMAOPage() {
  const [activeSection, setActiveSection] = useState('parc_inventaire');
  const [expandedModules, setExpandedModules] = useState(new Set(['parc', 'maintenance']));
  const [equipements, setEquipements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [services, setServices] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [rapportEquipement, setRapportEquipement] = useState(null);
  const [showRapportModal, setShowRapportModal] = useState(false);
  const [rapportLoading, setRapportLoading] = useState(false);
  const [pendingInterventions, setPendingInterventions] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Services
  useEffect(() => {
    listsAPI.getServices()
      .then(res => {
        const list = res.data?.data || res.data || [];
        setServices(list.map(s => (typeof s === 'string' ? s : s.name || s.nom || s)).filter(Boolean));
      })
      .catch(() => setServices([]));
  }, []);

  // Interventions en attente pour le panneau droit
  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await gmaoAPI.getInterventions({ statut: 'planifiee' });
      const data = res.data?.data || res.data || [];
      setPendingInterventions(Array.isArray(data) ? data.slice(0, 20) : []);
    } catch {
      setPendingInterventions([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  const fetchAnalytics = useCallback(async () => {
    if (analytics) return;
    setAnalyticsLoading(true);
    try {
      const res = await gmaoAPI.getAnalytics();
      setAnalytics(res.data.data);
    } catch (err) {
      console.error('fetchAnalytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analytics]);

  const fetchRapport = async (equipementId) => {
    setRapportLoading(true);
    setShowRapportModal(true);
    try {
      const res = await gmaoAPI.getRapportEquipement(equipementId);
      setRapportEquipement(res.data.data);
    } catch (err) {
      console.error('fetchRapport:', err);
    } finally {
      setRapportLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [eqRes, statsRes] = await Promise.all([
        gmaoAPI.getEquipements(),
        gmaoAPI.getStats(),
      ]);
      setEquipements(eqRes.data.data || []);
      setStats(statsRes.data.data || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (activeSection === 'stats_equipements' || activeSection === 'tool_panorama_maint') {
      fetchAnalytics();
    }
  }, [activeSection, fetchAnalytics]);

  const toggleModule = (id) =>
    setExpandedModules(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // Résoudre le label du breadcrumb
  const getBreadcrumb = () => {
    for (const mod of GMAO_MODULES) {
      const item = mod.items.find(i => i.id === activeSection);
      if (item) return { module: mod.label, item: item.label };
    }
    const tool = TOOLBAR_ITEMS.find(t => t.id === activeSection);
    if (tool) return { module: "Outils d'analyse", item: tool.label };
    return { module: 'GMAO', item: '' };
  };

  const { module: bcModule, item: bcItem } = getBreadcrumb();

  // Rendu du contenu principal selon la section active
  const renderContent = () => {
    switch (activeSection) {
      case 'parc_inventaire':
        return (
          <EquipementsTab
            equipements={equipements}
            stats={stats}
            loading={loading}
            onRefresh={loadData}
            services={services}
            onViewFiche={fetchRapport}
          />
        );
      case 'parc_panorama':
        return <PanoramaPanel equipements={equipements} onRefresh={loadData} />;
      case 'parc_localisation':
        return <LocalisationPanel equipements={equipements} />;
      case 'parc_historique':
        return <HistoriquePanel equipements={equipements} />;
      case 'parc_retrait':
        return <RetraitPanel equipements={equipements} onRefresh={loadData} />;
      case 'parc_reforme':
        return <ReformePanel equipements={equipements} onRefresh={loadData} />;
      case 'parc_acquisition':
        return <AcquisitionPanel equipements={equipements} />;
      case 'maint_contrats':
        return <ContratsPanel />;
      case 'pieces_liste':
      case 'pieces_stock':
        return <PiecesPanel subSection={activeSection} />;
      case 'pieces_mouvements':
        return <PiecesPanel subSection="pieces_mouvements" />;
      case 'maint_planification':
        return <CalendarTab stats={stats} />;
      case 'maint_intervention':
        return <InterventionsTab equipements={equipements} services={services} />;
      case 'stats_personnels':
        return <StatsPersonnelsPanel />;
      case 'stats_finance':
        return <StatsFinancePanel analytics={analytics} />;
      case 'budget_lignes':
      case 'budget_achats':
      case 'budget_factures':
      case 'budget_etat':
        return <BudgetPanelAPI subSection={activeSection} />;
      case 'tool_panorama_pieces':
        return <ToolPanoramaPiecesPanel />;
      case 'tool_2080':
        return <ToolAnalyse2080Panel analytics={analytics} />;
      case 'tool_conso_budget':
        return <ToolConsoBudgetPanel analytics={analytics} />;
      case 'stats_equipements':
      case 'tool_panorama_maint':
        return (
          <AnalyseTab
            analytics={analytics}
            loading={analyticsLoading}
            onViewRapport={fetchRapport}
            equipements={equipements}
          />
        );
      default: {
        for (const mod of GMAO_MODULES) {
          const item = mod.items.find(i => i.id === activeSection);
          if (item) return <WIPPanel label={item.label} />;
        }
        const tool = TOOLBAR_ITEMS.find(t => t.id === activeSection);
        if (tool) return <WIPPanel label={tool.label} />;
        return <WIPPanel label="Module" />;
      }
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 4rem)', background: '#0f172a' }}>

      {/* ── BARRE SUPÉRIEURE ──────────────────────────────────────────────── */}
      <div className="px-4 py-2 flex items-center justify-between flex-shrink-0 gap-4" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>

        {/* Logo + titre */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="p-1.5 rounded" style={{ background: 'var(--accent-teal)' }}>
            <Wrench className="w-4 h-4" style={{ color: '#fff' }} />
          </div>
          <div className="leading-none">
            <div className="font-bold text-sm" style={{ color: '#fff' }}>GMAO</div>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: '#64748b' }}>Maintenance Assistée</div>
          </div>
        </div>

        {/* Séparateur */}
        <div className="h-8 w-px flex-shrink-0" style={{ background: '#334155' }} />

        {/* Outils d'analyse */}
        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
          <span className="text-[9px] uppercase tracking-widest font-semibold flex-shrink-0 mr-1" style={{ color: '#475569' }}>
            Outils d'analyse
          </span>
          {TOOLBAR_ITEMS.map(tool => {
            const tbStyle = activeSection === tool.id
              ? { background: 'var(--accent-teal)', color: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }
              : tool.wip
              ? { background: 'rgba(51,65,85,0.5)', color: '#475569', cursor: 'not-allowed' }
              : { background: '#334155', color: '#cbd5e1' };
            return (
              <button
                key={tool.id}
                onClick={() => !tool.wip && setActiveSection(tool.id)}
                title={tool.label}
                className="flex-shrink-0 px-3 py-1.5 rounded text-[11px] font-semibold transition-all whitespace-nowrap"
                style={tbStyle}
              >
                {tool.shortLabel}
                {tool.wip && <span className="ml-1 text-[8px] opacity-50">●</span>}
              </button>
            );
          })}
        </div>

        {/* Actualiser */}
        <button
          onClick={() => { loadData(); loadPending(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0"
          style={{ background: '#334155', color: '#cbd5e1' }}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* ── BREADCRUMB ────────────────────────────────────────────────────── */}
      <div className="px-4 py-1 flex items-center gap-1.5 flex-shrink-0" style={{ background: 'rgba(30,41,59,0.6)', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
        <span className="text-[10px]" style={{ color: '#475569' }}>GMAO</span>
        <ChevronRight className="w-3 h-3" style={{ color: '#1e3a5f' }} />
        <span className="text-[10px] truncate" style={{ color: '#64748b' }}>{bcModule}</span>
        {bcItem && (
          <>
            <ChevronRight className="w-3 h-3" style={{ color: '#1e3a5f' }} />
            <span className="text-[10px] font-semibold" style={{ color: '#2dd4bf' }}>{bcItem}</span>
          </>
        )}
        {error && (
          <span className="ml-auto text-[10px] flex items-center gap-1 flex-shrink-0" style={{ color: '#f87171' }}>
            <AlertCircle className="w-3 h-3" />{error}
          </span>
        )}
      </div>

      {/* ── LAYOUT PRINCIPAL 3 COLONNES ───────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* SIDEBAR GAUCHE */}
        <div className="w-60 overflow-y-auto flex-shrink-0" style={{ background: '#1e293b', borderRight: '1px solid #334155' }}>
          {GMAO_MODULES.map(mod => (
            <SidebarModule
              key={mod.id}
              module={mod}
              activeSection={activeSection}
              onSelect={setActiveSection}
              expanded={expandedModules.has(mod.id)}
              onToggle={() => toggleModule(mod.id)}
            />
          ))}
        </div>

        {/* CONTENU PRINCIPAL */}
        <div className="flex-1 overflow-y-auto" style={{ background: 'var(--surface)' }}>
          {renderContent()}
        </div>

        {/* PANNEAU DROIT */}
        <div className="w-60 flex-shrink-0 flex flex-col overflow-hidden" style={{ background: '#1e293b', borderLeft: '1px solid #334155' }}>

          {/* Mini Calendrier */}
          <div className="p-3 flex-shrink-0" style={{ borderBottom: '1px solid #334155' }}>
            <MiniCalendar />
          </div>

          {/* Interventions signalées */}
          <div className="flex-1 flex flex-col p-3 overflow-hidden">
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#94a3b8' }}>
              Intervention signalé :
            </p>
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={loadPending}
                className="px-3 py-1 text-[10px] font-bold rounded transition-colors"
                style={{ background: 'var(--accent-teal)', color: '#fff' }}
              >
                Actualiser
              </button>
              <span className="text-[10px]" style={{ color: '#64748b' }}>
                Total : <span className="font-bold" style={{ color: '#fff' }}>{pendingInterventions.length}</span>
              </span>
            </div>

            {/* En-têtes colonne */}
            <div className="grid grid-cols-3 gap-1 pb-1 mb-1" style={{ borderBottom: '1px solid #334155' }}>
              <span className="text-[9px] font-semibold uppercase" style={{ color: '#475569' }}>Date</span>
              <span className="text-[9px] font-semibold uppercase" style={{ color: '#475569' }}>Heure</span>
              <span className="text-[9px] font-semibold uppercase" style={{ color: '#475569' }}>Equipement</span>
            </div>

            {/* Liste interventions */}
            <div className="flex-1 overflow-y-auto space-y-0">
              {pendingLoading ? (
                <div className="flex justify-center py-6">
                  <RefreshCw className="w-4 h-4 animate-spin" style={{ color: '#475569' }} />
                </div>
              ) : pendingInterventions.length === 0 ? (
                <div className="text-center py-8 text-[10px]" style={{ color: '#334155' }}>
                  <CheckCircle className="w-5 h-5 mx-auto mb-1" style={{ color: '#334155' }} />
                  Aucune intervention<br />en attente
                </div>
              ) : (
                pendingInterventions.map((iv, i) => {
                  const d = iv.date_planifiee ? new Date(iv.date_planifiee) : null;
                  const dateStr = d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—';
                  const heureStr = d ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
                  const eqLabel = iv.equipement?.nom || iv.Equipement?.nom || '—';
                  return (
                    <div
                      key={iv.id || i}
                      onClick={() => setActiveSection('maint_intervention')}
                      className="grid grid-cols-3 gap-1 py-1 cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid rgba(51,65,85,0.4)' }}
                    >
                      <span className="text-[9px]" style={{ color: '#94a3b8' }}>{dateStr}</span>
                      <span className="text-[9px]" style={{ color: '#94a3b8' }}>{heureStr}</span>
                      <span className="text-[9px] truncate" style={{ color: '#64748b' }} title={eqLabel}>{eqLabel}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal rapport équipement */}
      {showRapportModal && (
        <RapportModal
          rapport={rapportEquipement}
          loading={rapportLoading}
          onClose={() => { setShowRapportModal(false); setRapportEquipement(null); }}
        />
      )}
    </div>
  );
}
