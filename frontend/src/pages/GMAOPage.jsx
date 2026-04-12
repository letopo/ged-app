// frontend/src/pages/GMAOPage.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { gmaoAPI, listsAPI } from '../services/api';
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
  ANES:   { bg: 'bg-blue-100',   text: 'text-blue-800',   chip: 'bg-blue-500' },
  BOP:    { bg: 'bg-purple-100', text: 'text-purple-800', chip: 'bg-purple-500' },
  SAU:    { bg: 'bg-red-100',    text: 'text-red-800',    chip: 'bg-red-500' },
  PED:    { bg: 'bg-green-100',  text: 'text-green-800',  chip: 'bg-green-500' },
  GO:     { bg: 'bg-pink-100',   text: 'text-pink-800',   chip: 'bg-pink-500' },
  CHI:    { bg: 'bg-orange-100', text: 'text-orange-800', chip: 'bg-orange-500' },
  NN:     { bg: 'bg-yellow-100', text: 'text-yellow-800', chip: 'bg-yellow-500' },
  MED:    { bg: 'bg-teal-100',   text: 'text-teal-800',   chip: 'bg-teal-500' },
  DENT:   { bg: 'bg-cyan-100',   text: 'text-cyan-800',   chip: 'bg-cyan-500' },
  LAB:    { bg: 'bg-indigo-100', text: 'text-indigo-800', chip: 'bg-indigo-500' },
  PHARMA: { bg: 'bg-emerald-100',text: 'text-emerald-800',chip: 'bg-emerald-500' },
  ADMIN:  { bg: 'bg-gray-100',   text: 'text-gray-800',   chip: 'bg-gray-500' },
};

const getServiceColor = (service) => SERVICE_COLORS[service] || { bg: 'bg-gray-100', text: 'text-gray-800', chip: 'bg-gray-400' };

const MONTH_LABELS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
const MONTH_FULL   = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const STATUT_CONFIG = {
  actif:        { label: 'Actif',         color: 'bg-green-100 text-green-800 border-green-200' },
  en_reparation:{ label: 'En réparation', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  hors_service: { label: 'Hors service',  color: 'bg-red-100 text-red-800 border-red-200' },
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
  if (diffDays < 0)   return { label: 'Amorti',       color: 'bg-gray-100 text-gray-600 border-gray-300',      urgent: false };
  if (diffDays <= 90) return { label: `${diffDays}j`,  color: 'bg-red-100 text-red-700 border-red-300',         urgent: true  };
  if (diffDays <= 365)return { label: `${Math.ceil(diffDays/30)}m`, color: 'bg-orange-100 text-orange-700 border-orange-300', urgent: true };
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
  planifiee:  { label: 'Planifiée',  color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' },
  en_cours:   { label: 'En cours',   color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700' },
  terminee:   { label: 'Terminée',   color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' },
  reportee:   { label: 'Reportée',   color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700' },
};

const PRIORITE_CONFIG = {
  faible:  { label: 'Faible',  color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700' },
  normal:  { label: 'Normal',  color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600' },
  urgent:  { label: 'Urgent',  color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700' },
};

// ─── STAT CARD ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, colorClass, bgClass }) {
  return (
    <div className={`${bgClass} rounded-xl p-4 flex items-center space-x-4 shadow-sm border border-white/50`}>
      <div className={`p-2.5 rounded-lg bg-white/60`}>
        <Icon className={`w-5 h-5 ${colorClass}`} />
      </div>
      <div>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
        <p className="text-xs text-gray-600 font-medium">{label}</p>
      </div>
    </div>
  );
}

// ─── EQUIPMENT MODAL ─────────────────────────────────────────────────────────

function EquipementModal({ open, onClose, initial, onSave, services = [] }) {
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
    if (!form.nom.trim()) { setError('Le nom est requis.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {initial?.id ? 'Modifier l\'équipement' : 'Ajouter un équipement'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2 text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                value={form.nom}
                onChange={e => set('nom', e.target.value)}
                placeholder="Ex: Moniteur multi-paramètres"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Référence</label>
              <input
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.reference}
                onChange={e => set('reference', e.target.value)}
                placeholder="REF-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Numéro de série</label>
              <input
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.numero_serie}
                onChange={e => set('numero_serie', e.target.value)}
                placeholder="SN-XXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service</label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.service}
                onChange={e => set('service', e.target.value)}
              >
                <option value="">-- Sélectionner --</option>
                {services.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type d'équipement</label>
              <input
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.type_equipement}
                onChange={e => set('type_equipement', e.target.value)}
                placeholder="Ex: Monitoring, Respirateur..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marque</label>
              <input
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.marque}
                onChange={e => set('marque', e.target.value)}
                placeholder="Ex: Philips, GE, Mindray..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modèle</label>
              <input
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.modele}
                onChange={e => set('modele', e.target.value)}
                placeholder="Ex: IntelliVue MX450"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date mise en service</label>
              <input
                type="date"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Statut</label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.statut}
                onChange={e => set('statut', e.target.value)}
              >
                <option value="actif">Actif</option>
                <option value="en_reparation">En réparation</option>
                <option value="hors_service">Hors service</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Matricule</label>
              <input
                name="matricule"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.matricule || ''}
                onChange={e => set('matricule', e.target.value)}
                placeholder="Ex: 01MILA1H8"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Origine</label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.origine || ''}
                onChange={e => set('origine', e.target.value)}
              >
                <option value="">-- Sélectionner --</option>
                <option value="achat">Achat</option>
                <option value="don">Don</option>
                <option value="transfert">Transfert</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fournisseur</label>
              <input
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.fournisseur || ''}
                onChange={e => set('fournisseur', e.target.value)}
                placeholder="Ex: BIOECOMS, Philips..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date de mise au rebus
                <span className="ml-2 text-xs font-normal text-blue-500">(auto : mise en service + 10 ans)</span>
              </label>
              <input
                type="date"
                name="date_mise_au_rebus"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.date_mise_au_rebus || ''}
                onChange={e => set('date_mise_au_rebus', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Remarques, localisation précise..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Sauvegarde...' : 'Enregistrer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── PLAN MODAL ──────────────────────────────────────────────────────────────

function PlanModal({ open, onClose, initial, equipements, onSave }) {
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
    if (!form.equipement_id) { setError('Veuillez sélectionner un équipement.'); return; }
    if (!form.mois || form.mois.length === 0) { setError('Sélectionnez au moins un mois.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ ...form, equipement_id: parseInt(form.equipement_id), jour_du_mois: parseInt(form.jour_du_mois), duree_estimee: form.duree_estimee ? parseFloat(form.duree_estimee) : null, technicien_id: form.technicien_id ? parseInt(form.technicien_id) : null });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const selectedMois = Array.isArray(form.mois) ? form.mois : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {initial?.id ? 'Modifier le plan' : 'Nouveau plan de maintenance'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2 text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Équipement <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.equipement_id}
              onChange={e => set('equipement_id', e.target.value)}
            >
              <option value="">-- Sélectionner un équipement --</option>
              {equipements.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nom} {eq.service ? `(${eq.service})` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mois de maintenance <span className="text-red-500">*</span>
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
                    className={`py-1.5 text-xs font-semibold rounded-lg border-2 transition-colors ${
                      selected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
            {selectedMois.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedMois.length} mois sélectionné{selectedMois.length > 1 ? 's' : ''} — fréquence : {selectedMois.length === 1 ? 'annuelle' : selectedMois.length === 2 ? 'semestrielle' : selectedMois.length === 3 ? 'trimestrielle' : selectedMois.length === 4 ? 'trimestrielle' : selectedMois.length === 12 ? 'mensuelle' : 'personnalisée'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Jour du mois
              </label>
              <input
                type="number"
                min="1"
                max="31"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.jour_du_mois}
                onChange={e => set('jour_du_mois', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Durée estimée (h)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.duree_estimee}
                onChange={e => set('duree_estimee', e.target.value)}
                placeholder="Ex: 2.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              rows={2}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Instructions de maintenance, matériel requis..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Sauvegarde...' : 'Enregistrer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── INTERVENTION MODAL ───────────────────────────────────────────────────────

function InterventionModal({ open, onClose, equipements, forcedType, onSave }) {
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
    if (!form.equipement_id) { setError('Veuillez sélectionner un équipement.'); return; }
    if (!form.date_planifiee) { setError('La date planifiée est requise.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ ...form, equipement_id: parseInt(form.equipement_id) });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const isCorrective = form.type === 'corrective';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isCorrective ? 'Déclarer une panne' : 'Nouvelle intervention'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 flex items-center space-x-2 text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
              value={form.type}
              onChange={e => set('type', e.target.value)}
              disabled={!!forcedType}
            >
              <option value="preventive">Préventive</option>
              <option value="corrective">Corrective</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Équipement <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.equipement_id}
              onChange={e => set('equipement_id', e.target.value)}
            >
              <option value="">-- Sélectionner un équipement --</option>
              {equipements.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nom}{eq.service ? ` (${eq.service})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priorité</label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.priorite}
                onChange={e => set('priorite', e.target.value)}
              >
                <option value="faible">Faible</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date planifiée <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.date_planifiee}
                onChange={e => set('date_planifiee', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Technicien</label>
            <input
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.technicien_id}
              onChange={e => set('technicien_id', e.target.value)}
              placeholder="Nom du technicien..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Description de l'intervention..."
            />
          </div>

          {isCorrective && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Signalé par</label>
              <input
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.signale_par}
                onChange={e => set('signale_par', e.target.value)}
                placeholder="Nom de la personne ayant signalé la panne..."
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60 transition-colors ${isCorrective ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Sauvegarde...' : isCorrective ? 'Déclarer' : 'Créer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── COMPLETE MODAL ───────────────────────────────────────────────────────────

function CompleteModal({ open, onClose, intervention, onComplete }) {
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
      setError(err.response?.data?.message || err.message || 'Erreur lors de la clôture');
    } finally {
      setSaving(false);
    }
  };

  const eqName = intervention.equipement?.nom || intervention.equipement_nom || 'Équipement';
  const datePlan = intervention.date_planifiee
    ? new Date(intervention.date_planifiee).toLocaleDateString('fr-FR')
    : '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Clôturer l'intervention</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{eqName}{datePlan ? ` — ${datePlan}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 flex items-center space-x-2 text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Actions effectuées</label>
            <textarea
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none resize-none"
              value={form.actions_effectuees}
              onChange={e => set('actions_effectuees', e.target.value)}
              placeholder="Décrivez les actions réalisées..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pièces/consommables remplacés</label>
            <textarea
              rows={2}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none resize-none"
              value={form.pieces_remplacees}
              onChange={e => set('pieces_remplacees', e.target.value)}
              placeholder="Pièces, filtres, consommables remplacés..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Durée réelle (heures)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
              value={form.duree_reelle}
              onChange={e => set('duree_reelle', e.target.value)}
              placeholder="Ex: 2.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observations</label>
            <textarea
              rows={2}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none resize-none"
              value={form.observations}
              onChange={e => set('observations', e.target.value)}
              placeholder="Remarques, recommandations..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              <span>{saving ? 'Clôture...' : 'Clôturer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── INTERVENTION CARD ────────────────────────────────────────────────────────

function InterventionCard({ intervention, onStatusChange, onComplete, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [actioning, setActioning] = useState(false);

  const eq = intervention.equipement || {};
  const eqName = eq.nom || intervention.equipement_nom || 'Équipement inconnu';
  const service = eq.service || intervention.service || '';
  const sc = getServiceColor(service);

  const stCfg = INTERVENTION_STATUT_CONFIG[intervention.statut] || INTERVENTION_STATUT_CONFIG.planifiee;
  const prCfg = PRIORITE_CONFIG[intervention.priorite] || PRIORITE_CONFIG.normal;

  const isPreventive = intervention.type === 'preventive';
  const datePlan = intervention.date_planifiee
    ? new Date(intervention.date_planifiee).toLocaleDateString('fr-FR')
    : '—';
  const dateReal = intervention.date_realisation
    ? new Date(intervention.date_realisation).toLocaleDateString('fr-FR')
    : null;

  const doStatusChange = async (newStatut) => {
    setActioning(true);
    try { await onStatusChange(intervention.id, newStatut); }
    catch (e) { toast(e.response?.data?.message || e.message); }
    finally { setActioning(false); }
  };

  const doDelete = async () => {
    if (!window.confirm('Supprimer cette intervention ?')) return;
    setActioning(true);
    try { await onDelete(intervention.id); }
    catch (e) { toast(e.response?.data?.message || e.message); }
    finally { setActioning(false); }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Top row */}
        <div className="flex flex-wrap items-start gap-2 mb-3">
          <span className="font-semibold text-gray-900 dark:text-white text-sm flex-1 min-w-0 truncate">{eqName}</span>
          <div className="flex flex-wrap gap-1.5 flex-shrink-0">
            {service && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                {service}
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${isPreventive ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700' : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700'}`}>
              {isPreventive ? 'Préventive' : 'Corrective'}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${prCfg.color}`}>
              {prCfg.label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${stCfg.color}`}>
              {stCfg.label}
            </span>
          </div>
        </div>

        {/* Middle info row */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
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
            <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 mb-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Terminée le {dateReal}</span>
            </div>
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? 'Masquer les détails' : 'Voir les détails'}
            </button>
            {expanded && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2 text-xs text-gray-700 dark:text-gray-300">
                {intervention.actions_effectuees && (
                  <div><span className="font-medium">Actions effectuées :</span> {intervention.actions_effectuees}</div>
                )}
                {intervention.pieces_remplacees && (
                  <div><span className="font-medium">Pièces remplacées :</span> {intervention.pieces_remplacees}</div>
                )}
                {intervention.duree_reelle != null && (
                  <div><span className="font-medium">Durée réelle :</span> {intervention.duree_reelle}h</div>
                )}
                {intervention.observations && (
                  <div><span className="font-medium">Observations :</span> {intervention.observations}</div>
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
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:hover:bg-yellow-900/40 rounded-lg transition-colors disabled:opacity-50"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Démarrer
              </button>
              <button
                onClick={() => onComplete(intervention)}
                disabled={actioning}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/40 rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Terminer
              </button>
              <button
                onClick={() => doStatusChange('reportee')}
                disabled={actioning}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/40 rounded-lg transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reporter
              </button>
            </>
          )}
          {intervention.statut === 'en_cours' && (
            <>
              <button
                onClick={() => onComplete(intervention)}
                disabled={actioning}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/40 rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Terminer
              </button>
              <button
                onClick={() => doStatusChange('reportee')}
                disabled={actioning}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/40 rounded-lg transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reporter
              </button>
            </>
          )}
          {intervention.statut === 'reportee' && (
            <button
              onClick={() => doStatusChange('planifiee')}
              disabled={actioning}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40 rounded-lg transition-colors disabled:opacity-50"
            >
              <Calendar className="w-3.5 h-3.5" />
              Réplanifier
            </button>
          )}
          <button
            onClick={doDelete}
            disabled={actioning}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 ml-auto"
          >
            {actioning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── INTERVENTIONS TAB ────────────────────────────────────────────────────────

function InterventionsTab({ equipements, services = [] }) {
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ type: '', statut: '', service: '' });
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState(null);
  const [forcedType, setForcedType] = useState(null);
  const [generating, setGenerating] = useState(false);

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
      setError(err.response?.data?.message || err.message || 'Erreur de chargement');
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
    if (!window.confirm(`Générer les interventions préventives pour ${year} depuis les plans de maintenance ?`)) return;
    setGenerating(true);
    try {
      const res = await gmaoAPI.generatePreventiveInterventions({ annee: year });
      const count = res.data?.created || res.data?.count || 0;
      toast(`${count} intervention${count > 1 ? 's' : ''} préventive${count > 1 ? 's' : ''} générée${count > 1 ? 's' : ''} pour ${year}.`);
      await fetchInterventions();
    } catch (err) {
      toast(err.response?.data?.message || err.message || 'Erreur lors de la génération');
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
    <div className="space-y-6">
      {/* Mini stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Planifiées" value={countByStatut.planifiee} icon={Calendar} colorClass="text-blue-700" bgClass="bg-blue-50 dark:bg-blue-900/20" />
        <StatCard label="En cours" value={countByStatut.en_cours} icon={PlayCircle} colorClass="text-yellow-700" bgClass="bg-yellow-50 dark:bg-yellow-900/20" />
        <StatCard label="Terminées" value={countByStatut.terminee} icon={CheckCircle} colorClass="text-green-700" bgClass="bg-green-50 dark:bg-green-900/20" />
        <StatCard label="Reportées" value={countByStatut.reportee} icon={RotateCcw} colorClass="text-orange-700" bgClass="bg-orange-50 dark:bg-orange-900/20" />
      </div>

      {/* Top action bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={openCorrectiveModal}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Déclarer une panne</span>
          </button>

          <button
            onClick={handleGenerateInterventions}
            disabled={generating}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>Générer préventives</span>
          </button>

          <div className="flex items-center space-x-2 ml-auto">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.type}
              onChange={e => setFilter('type', e.target.value)}
            >
              <option value="">Toutes (types)</option>
              <option value="preventive">Préventive</option>
              <option value="corrective">Corrective</option>
            </select>
            <select
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.statut}
              onChange={e => setFilter('statut', e.target.value)}
            >
              <option value="">Tous (statuts)</option>
              <option value="planifiee">Planifiée</option>
              <option value="en_cours">En cours</option>
              <option value="terminee">Terminée</option>
              <option value="reportee">Reportée</option>
            </select>
            <select
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.service}
              onChange={e => setFilter('service', e.target.value)}
            >
              <option value="">Tous (services)</option>
              {services.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 flex items-center space-x-3 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cards list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Chargement des interventions...</span>
        </div>
      ) : interventions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center justify-center text-gray-400">
          <Wrench className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium text-gray-500 dark:text-gray-400">Aucune intervention</p>
          <p className="text-sm mt-1 text-center text-gray-400 dark:text-gray-500">
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
        <div className="text-xs text-gray-400 text-center">
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
    if (!window.confirm('Supprimer cet équipement et tous ses plans de maintenance ?')) return;
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
    <div className="space-y-6">
      {/* Bannière alerte fin de vie */}
      {finDeVie.length > 0 && (
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800">
          <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">{finDeVie.length} équipement{finDeVie.length > 1 ? 's' : ''} en fin d'amortissement</span>
            <span className="ml-2 text-orange-600">— {finDeVie.map(e => e.nom).join(', ')}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total équipements" value={stats?.totalEquipements ?? equipements.length} icon={Package} colorClass="text-blue-700" bgClass="bg-blue-50" />
        <StatCard label="Actifs" value={stats?.actifs ?? equipements.filter(e => e.statut === 'actif').length} icon={CheckCircle} colorClass="text-green-700" bgClass="bg-green-50" />
        <StatCard label="En réparation" value={stats?.enReparation ?? equipements.filter(e => e.statut === 'en_reparation').length} icon={Clock} colorClass="text-yellow-700" bgClass="bg-yellow-50" />
        <StatCard label="Hors service" value={stats?.horsService ?? equipements.filter(e => e.statut === 'hors_service').length} icon={AlertCircle} colorClass="text-red-700" bgClass="bg-red-50" />
        <StatCard label="Fin de vie ≤1 an" value={finDeVie.length} icon={AlertTriangle} colorClass="text-orange-700" bgClass="bg-orange-50" />
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Rechercher équipement, référence, marque..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={filterService}
              onChange={e => setFilterService(e.target.value)}
            >
              <option value="">Tous services</option>
              {services.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors ml-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Chargement...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">Aucun équipement trouvé</p>
            <p className="text-sm mt-1">Ajoutez votre premier équipement via le bouton ci-dessus</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Nom</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Référence</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Service</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Marque / Modèle</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Statut</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map(eq => {
                  const sc = getServiceColor(eq.service);
                  const stCfg = STATUT_CONFIG[eq.statut] || STATUT_CONFIG.actif;
                  const amort = getAmortissementStatus(eq);
                  return (
                    <tr key={eq.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${amort?.urgent ? 'bg-orange-50/40 dark:bg-orange-900/10' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white">{eq.nom}</p>
                          {amort && (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold border ${amort.color}`} title={`Mise au rebus : ${new Date(eq.date_mise_au_rebus).toLocaleDateString('fr-FR')}`}>
                              <AlertTriangle className="w-3 h-3" />{amort.label}
                            </span>
                          )}
                        </div>
                        {eq.numero_serie && <p className="text-xs text-gray-400">SN: {eq.numero_serie}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{eq.reference || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3">
                        {eq.service ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>{eq.service}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{eq.type_equipement || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {eq.marque || eq.modele ? `${eq.marque || ''} ${eq.modele || ''}`.trim() : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${stCfg.color}`}>
                          {stCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onViewFiche && onViewFiche(eq.id)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Fiche de vie"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditTarget(eq); setModalOpen(true); }}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setPlanTarget(eq); setPlanModalOpen(true); }}
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                            title="Ajouter un plan de maintenance"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(eq.id)}
                            disabled={deleting === eq.id}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
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
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
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
  );
}

// ─── CALENDAR TAB ─────────────────────────────────────────────────────────────

function CalendarTab({ stats }) {
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setYear(y => y - 1)}
                className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              <span className="px-3 py-1 text-sm font-bold text-gray-900 dark:text-white min-w-16 text-center">{year}</span>
              <button
                onClick={() => setYear(y => y + 1)}
                className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-semibold">
                {totalInterventions} intervention{totalInterventions > 1 ? 's' : ''} planifiée{totalInterventions > 1 ? 's' : ''}
              </div>
              {stats && (
                <div className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-sm font-semibold">
                  {stats.totalPlans ?? 0} plan{(stats.totalPlans ?? 0) > 1 ? 's' : ''} actif{(stats.totalPlans ?? 0) > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          {/* Service legend */}
          <div className="flex flex-wrap gap-2">
            {SERVICES.slice(0, 8).map(s => {
              const c = getServiceColor(s);
              return (
                <span key={s} className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
                  <span className={`w-2 h-2 rounded-full ${c.chip}`}></span>
                  <span>{s}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Calendar grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Chargement du calendrier...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-700 border-b border-r border-gray-200 dark:border-gray-600 px-3 py-3 text-center text-gray-600 dark:text-gray-400 font-semibold min-w-12">J</th>
                  {MONTH_LABELS.map((lbl, idx) => (
                    <th key={idx} className="border-b border-r border-gray-200 dark:border-gray-600 px-2 py-3 text-center font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 min-w-28">
                      <div>{lbl}</div>
                      <div className="font-normal text-gray-400 text-xs">{year}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <tr key={day} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                    <td className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700/50 border-b border-r border-gray-200 dark:border-gray-600 px-3 py-1.5 text-center font-semibold text-gray-500 dark:text-gray-400 text-xs">
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
                          className={`border-b border-r border-gray-100 dark:border-gray-700/50 px-1 py-1 align-top min-h-8 ${
                            isInvalid ? 'bg-gray-50/80 dark:bg-gray-800/50' : ''
                          }`}
                          style={{ minHeight: '2rem' }}
                        >
                          {isInvalid ? (
                            <span className="block w-full h-4 rounded bg-gray-100 dark:bg-gray-700/30 opacity-30"></span>
                          ) : entries.length > 0 ? (
                            <div className="space-y-0.5">
                              {entries.map((entry, eIdx) => {
                                const sc = getServiceColor(entry.service);
                                const truncated = entry.nom.length > 14 ? entry.nom.slice(0, 13) + '…' : entry.nom;
                                return (
                                  <div
                                    key={eIdx}
                                    title={`${entry.nom}\nService: ${entry.service || 'N/A'}\nDurée: ${entry.duree ? entry.duree + 'h' : 'N/A'}${entry.notes ? '\n' + entry.notes : ''}`}
                                    className={`flex items-center px-1.5 py-0.5 rounded text-white text-xs font-medium cursor-default truncate ${sc.chip}`}
                                    style={{ fontSize: '10px', lineHeight: '1.4' }}
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
            <List className="w-4 h-4 text-blue-500" />
            <span>Répartition par mois</span>
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
              const monthData = calendarData[m] || {};
              const count = Object.values(monthData).reduce((a, arr) => a + arr.length, 0);
              return (
                <div key={m} className={`rounded-lg p-2.5 text-center ${count > 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-700/30'}`}>
                  <p className={`text-xs font-semibold ${count > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-gray-400'}`}>{MONTH_LABELS[m - 1]}</p>
                  <p className={`text-xl font-bold mt-0.5 ${count > 0 ? 'text-blue-600 dark:text-blue-300' : 'text-gray-300'}`}>{count}</p>
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
  const [selectedEquipement, setSelectedEquipement] = useState('');

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (!analytics) return null;

  const maxMonth = Math.max(...analytics.byMonth.map(m => m.total), 1);
  const maxService = Math.max(...analytics.byService.map(s => s.total), 1);
  const totalTypes = analytics.preventiveCount + analytics.correctiveCount;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Taux de conformité */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Taux de conformité</span>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{analytics.tauxConformite}%</div>
          <div className="text-xs text-gray-400">{analytics.termineeThisYear} / {analytics.totalThisYear} préventives</div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${analytics.tauxConformite}%` }} />
          </div>
        </div>

        {/* En retard */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">En retard</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className={`text-3xl font-bold ${analytics.enRetard > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>{analytics.enRetard}</div>
          <div className="text-xs text-gray-400">interventions en retard</div>
        </div>

        {/* En cours */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">En cours</span>
            <PlayCircle className="w-4 h-4 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{analytics.enCours}</div>
          <div className="text-xs text-gray-400">en cours actuellement</div>
        </div>

        {/* Durée moyenne */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Durée moy. réalisation</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{analytics.avgDuree ?? '—'}{analytics.avgDuree ? 'h' : ''}</div>
          <div className="text-xs text-gray-400">par intervention terminée</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart: Interventions par mois */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Interventions par mois ({new Date().getFullYear()})</h3>
          <div className="flex items-end gap-1 h-32">
            {analytics.byMonth.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center justify-end" style={{ height: '96px' }}>
                  <div
                    className="w-full bg-blue-500 dark:bg-blue-600 rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-default relative group"
                    style={{ height: `${maxMonth > 0 ? Math.max((m.total / maxMonth) * 96, m.total > 0 ? 4 : 0) : 0}px` }}
                    title={`${m.total} interventions`}
                  >
                    {m.corrective > 0 && (
                      <div
                        className="w-full bg-red-400 dark:bg-red-500 rounded-t absolute bottom-0"
                        style={{ height: `${(m.corrective / m.total) * 100}%` }}
                      />
                    )}
                    {m.total > 0 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{m.total}</span>
                    )}
                  </div>
                </div>
                <span className="text-[9px] text-gray-400">{MONTH_SHORT[m.month - 1]}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-sm"/><span className="text-xs text-gray-500">Préventive</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-400 rounded-sm"/><span className="text-xs text-gray-500">Corrective</span></div>
          </div>
        </div>

        {/* Preventive vs Corrective donut-style */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Répartition par type</h3>
          {totalTypes > 0 ? (
            <>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Préventives</span>
                    <span className="text-gray-500">{analytics.preventiveCount} ({Math.round(analytics.preventiveCount/totalTypes*100)}%)</span>
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(analytics.preventiveCount/totalTypes)*100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-red-600 dark:text-red-400 font-medium">Correctives</span>
                    <span className="text-gray-500">{analytics.correctiveCount} ({Math.round(analytics.correctiveCount/totalTypes*100)}%)</span>
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${(analytics.correctiveCount/totalTypes)*100}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="text-center text-2xl font-bold text-gray-700 dark:text-gray-300">{totalTypes}</div>
                <div className="text-center text-xs text-gray-400">total interventions {new Date().getFullYear()}</div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 text-sm mt-8">Aucune donnée</div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Service distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Interventions par service</h3>
          {analytics.byService.length > 0 ? (
            <div className="space-y-2">
              {analytics.byService.slice(0, 8).map(s => {
                const color = SERVICE_COLORS[s.service] || SERVICE_COLORS['ADMIN'];
                const pct = Math.round((s.terminee / s.total) * 100);
                return (
                  <div key={s.service}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className={`font-medium ${color.text}`}>{s.service}</span>
                      <span className="text-gray-400">{s.total} ({pct}% terminées)</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color.bg}`} style={{ width: `${(s.total / maxService) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm mt-8">Aucune donnée</div>
          )}
        </div>

        {/* Top équipements défaillants */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top équipements défaillants</h3>
          {analytics.topDefaillants.length > 0 ? (
            <div className="space-y-2">
              {analytics.topDefaillants.slice(0, 6).map((item, idx) => {
                const color = SERVICE_COLORS[item.equipement?.service] || SERVICE_COLORS['ADMIN'];
                return (
                  <div key={item.equipement?.id} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{item.equipement?.nom}</div>
                      <span className={`text-[10px] px-1 rounded ${color.bg} ${color.text}`}>{item.equipement?.service}</span>
                    </div>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">{item.nbPannes} pannes</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm mt-8">Aucune panne enregistrée</div>
          )}
        </div>
      </div>

      {/* Overdue interventions */}
      {analytics.overdueList?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Interventions en retard ({analytics.enRetard})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="pb-2">Équipement</th><th className="pb-2">Service</th><th className="pb-2">Type</th><th className="pb-2">Date planifiée</th><th className="pb-2">Retard</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {analytics.overdueList.map(i => {
                  const days = Math.floor((new Date() - new Date(i.date_planifiee)) / 86400000);
                  return (
                    <tr key={i.id} className="text-gray-600 dark:text-gray-400">
                      <td className="py-1.5 font-medium text-gray-800 dark:text-gray-200">{i.equipement?.nom}</td>
                      <td className="py-1.5">{i.equipement?.service}</td>
                      <td className="py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${i.type === 'corrective' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{i.type}</span>
                      </td>
                      <td className="py-1.5">{new Date(i.date_planifiee).toLocaleDateString('fr-FR')}</td>
                      <td className="py-1.5 font-bold text-red-600">{days}j</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rapport PDF section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Rapport par équipement
        </h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <select
              value={selectedEquipement}
              onChange={e => setSelectedEquipement(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">-- Sélectionner un équipement --</option>
              {equipements.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nom} ({eq.service})</option>
              ))}
            </select>
          </div>
          <button
            disabled={!selectedEquipement}
            onClick={() => onViewRapport(selectedEquipement)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Générer rapport
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── RAPPORT MODAL ────────────────────────────────────────────────────────────

const RapportModal = ({ rapport, loading, onClose }) => {
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
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Rapport d&apos;équipement
          </h2>
          <div className="flex gap-2">
            {rapport && (
              <button onClick={handlePrint} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1">
                <Download className="w-4 h-4" /> Exporter PDF
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : rapport ? (
          <div ref={rapportRef} className="p-6 bg-white">
            {/* Equipment info */}
            <div className="mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{rapport.equipement.nom}</h1>
                  <p className="text-gray-500">{rapport.equipement.reference} • {rapport.equipement.service}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${rapport.equipement.statut === 'actif' ? 'bg-green-100 text-green-700' : rapport.equipement.statut === 'en_reparation' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {rapport.equipement.statut}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {rapport.equipement.marque && <div><span className="text-gray-400">Marque:</span> <span className="font-medium">{rapport.equipement.marque}</span></div>}
                {rapport.equipement.modele && <div><span className="text-gray-400">Modèle:</span> <span className="font-medium">{rapport.equipement.modele}</span></div>}
                {rapport.equipement.numero_serie && <div><span className="text-gray-400">N° Série:</span> <span className="font-medium">{rapport.equipement.numero_serie}</span></div>}
                {rapport.equipement.date_mise_en_service && <div><span className="text-gray-400">Mise en service:</span> <span className="font-medium">{new Date(rapport.equipement.date_mise_en_service).toLocaleDateString('fr-FR')}</span></div>}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total interventions', value: rapport.stats.total, color: 'bg-gray-50 text-gray-700' },
                { label: 'Terminées', value: rapport.stats.terminee, color: 'bg-green-50 text-green-700' },
                { label: 'Correctives', value: rapport.stats.corrective, color: 'bg-red-50 text-red-700' },
                { label: 'Durée moy.', value: rapport.stats.avgDuree ? `${rapport.stats.avgDuree}h` : '—', color: 'bg-blue-50 text-blue-700' },
              ].map(s => (
                <div key={s.label} className={`rounded-lg p-3 ${s.color}`}>
                  <div className="text-xl font-bold">{s.value}</div>
                  <div className="text-xs">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Interventions table */}
            <h3 className="font-semibold text-gray-900 mb-3">Historique des interventions</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {['Date', 'Type', 'Statut', 'Technicien', 'Durée', 'Actions / Observations'].map(h => (
                    <th key={h} className="text-left p-2 border border-gray-200 text-gray-600 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rapport.interventions.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="p-2 border border-gray-200">{new Date(i.date_planifiee).toLocaleDateString('fr-FR')}</td>
                    <td className="p-2 border border-gray-200">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${i.type === 'corrective' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{i.type}</span>
                    </td>
                    <td className="p-2 border border-gray-200">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${i.statut === 'terminee' ? 'bg-green-100 text-green-700' : i.statut === 'en_cours' ? 'bg-yellow-100 text-yellow-700' : i.statut === 'reportee' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{i.statut}</span>
                    </td>
                    <td className="p-2 border border-gray-200">{i.technicien ? `${i.technicien.firstName} ${i.technicien.lastName}` : '—'}</td>
                    <td className="p-2 border border-gray-200">{i.duree_reelle ? `${i.duree_reelle}h` : '—'}</td>
                    <td className="p-2 border border-gray-200 max-w-[200px]">
                      <div className="truncate">{i.actions_effectuees || i.observations || i.description || '—'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-xs text-gray-400 text-right">Rapport généré le {new Date().toLocaleDateString('fr-FR')} — HSJM Workflow</div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ─── PANORAMA PANEL ──────────────────────────────────────────────────────────

function PanoramaPanel({ equipements = [], onRefresh }) {
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

  const STATUT_COLOR = {
    actif: 'bg-green-100 text-green-700 border-green-200',
    en_reparation: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    hors_service: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className="flex h-full min-h-[500px]">
      {/* Liste équipements */}
      <div className="w-72 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Rechercher un équipement…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Aucun équipement</div>
          ) : filtered.map(eq => {
            const col = STATUT_CONFIG[eq.statut] || STATUT_CONFIG.actif;
            return (
              <button
                key={eq.id}
                onClick={() => loadRapport(eq.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-teal-50 transition-colors ${
                  selectedId === eq.id ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''
                }`}
              >
                <div className="font-medium text-gray-800 text-sm truncate">{eq.nom}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-gray-400 text-xs">{eq.service || '—'}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${col.color}`}>
                    {col.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-2 border-t border-gray-100 text-center text-xs text-gray-400">
          {filtered.length} équipement{filtered.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Fiche équipement */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {!selectedId ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <Package className="w-12 h-12 mb-3 text-gray-200" />
            <p className="text-sm font-medium">Sélectionnez un équipement</p>
            <p className="text-xs mt-1">pour afficher sa fiche d'identité</p>
          </div>
        ) : loadingR ? (
          <div className="flex justify-center items-center h-full">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-500" />
          </div>
        ) : !rapport ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <AlertCircle className="w-8 h-8 mb-2 text-red-300" />
            <p className="text-sm">Erreur de chargement</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{eq.nom}</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    {eq.service && (
                      <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {eq.service}
                      </span>
                    )}
                    {eq.statut && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUT_COLOR[eq.statut] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {STATUT_CONFIG[eq.statut]?.label || eq.statut}
                      </span>
                    )}
                    {eq.origine && (
                      <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full capitalize">
                        {eq.origine}
                      </span>
                    )}
                  </div>
                </div>
                {eq.matricule && (
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Matricule</div>
                    <div className="font-mono font-bold text-gray-700 text-sm">{eq.matricule}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Spécifications techniques */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-500" /> Spécifications
              </h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {[
                  ['Marque', eq.marque], ['Modèle', eq.modele],
                  ['Type', eq.type_equipement], ['Référence', eq.reference],
                  ['N° Série', eq.numero_serie], ['Fournisseur', eq.fournisseur],
                ].map(([label, val]) => val ? (
                  <div key={label}>
                    <span className="text-xs text-gray-400 block">{label}</span>
                    <span className="text-gray-800 font-medium">{val}</span>
                  </div>
                ) : null)}
              </div>
            </div>

            {/* Dates importantes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-500" /> Dates
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-gray-400 block">Mise en service</span>
                  <span className="text-gray-800 font-medium">
                    {eq.date_mise_en_service
                      ? new Date(eq.date_mise_en_service).toLocaleDateString('fr-FR')
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Fin de vie estimée</span>
                  <span className={`font-medium ${
                    eq.date_mise_au_rebus && new Date(eq.date_mise_au_rebus) < new Date()
                      ? 'text-red-600' : 'text-gray-800'
                  }`}>
                    {eq.date_mise_au_rebus
                      ? new Date(eq.date_mise_au_rebus).toLocaleDateString('fr-FR')
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats maintenance */}
            {rapport.stats && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-teal-500" /> Bilan Maintenance
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Total', val: rapport.stats.total, color: 'bg-blue-50 text-blue-700' },
                    { label: 'Terminées', val: rapport.stats.terminee, color: 'bg-green-50 text-green-700' },
                    { label: 'Correctives', val: rapport.stats.corrective, color: 'bg-orange-50 text-orange-700' },
                    { label: 'Préventives', val: rapport.stats.preventive, color: 'bg-teal-50 text-teal-700' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className={`${color} rounded-lg p-3 text-center`}>
                      <div className="text-2xl font-bold">{val}</div>
                      <div className="text-xs font-medium mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
                {rapport.stats.avgDuree && (
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Durée moyenne d'intervention : <span className="font-semibold text-gray-600">{rapport.stats.avgDuree}h</span>
                  </p>
                )}
              </div>
            )}

            {/* Historique des 5 dernières interventions */}
            {rapport.interventions?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-500" /> Dernières interventions
                </h3>
                <div className="space-y-2">
                  {rapport.interventions.slice(0, 5).map(iv => {
                    const sc = INTERVENTION_STATUT_CONFIG[iv.statut] || INTERVENTION_STATUT_CONFIG.planifiee;
                    return (
                      <div key={iv.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 text-sm">
                        <span className="text-gray-500 text-xs w-20 flex-shrink-0">
                          {iv.date_planifiee ? new Date(iv.date_planifiee).toLocaleDateString('fr-FR') : '—'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${sc.color}`}>
                          {sc.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                          iv.type === 'corrective' ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'
                        }`}>
                          {iv.type}
                        </span>
                        <span className="text-gray-600 truncate">{iv.description || '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            {eq.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Notes</h3>
                <p className="text-sm text-amber-800">{eq.notes}</p>
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
    const svc = eq.service || 'Non assigné';
    if (!byService[svc]) byService[svc] = [];
    byService[svc].push(eq);
  });
  const services = Object.keys(byService).sort();

  const STATUT_DOT = {
    actif: 'bg-green-500',
    en_reparation: 'bg-yellow-500',
    hors_service: 'bg-red-500',
  };

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="en_reparation">En réparation</option>
          <option value="hors_service">Hors service</option>
        </select>
        <span className="text-sm text-gray-400">{filtered.length} équipement{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 mb-5">
        {[['actif', 'Actif', 'bg-green-500'], ['en_reparation', 'En réparation', 'bg-yellow-500'], ['hors_service', 'Hors service', 'bg-red-500']].map(([key, label, color]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            {label}
          </div>
        ))}
      </div>

      {/* Grille par service */}
      {services.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Aucun équipement trouvé</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map(svc => {
            const eqs = byService[svc];
            const actifs = eqs.filter(e => e.statut === 'actif').length;
            const enRep = eqs.filter(e => e.statut === 'en_reparation').length;
            const hors = eqs.filter(e => e.statut === 'hors_service').length;
            return (
              <div key={svc} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Service header */}
                <div className="px-4 py-3 bg-slate-800 flex items-center justify-between">
                  <span className="text-white font-semibold text-sm">{svc}</span>
                  <span className="text-slate-300 text-xs font-medium">{eqs.length} équip.</span>
                </div>
                {/* Mini stats */}
                <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                  {[['Actifs', actifs, 'text-green-600'], ['Répar.', enRep, 'text-yellow-600'], ['H.S.', hors, 'text-red-600']].map(([label, count, color]) => (
                    <div key={label} className="py-2 text-center">
                      <div className={`text-lg font-bold ${color}`}>{count}</div>
                      <div className="text-[10px] text-gray-400">{label}</div>
                    </div>
                  ))}
                </div>
                {/* Equipment list */}
                <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                  {eqs.map(eq => (
                    <div key={eq.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUT_DOT[eq.statut] || 'bg-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-800 font-medium truncate">{eq.nom}</div>
                        {eq.matricule && (
                          <div className="text-xs text-gray-400 font-mono">{eq.matricule}</div>
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
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Équipement
          </label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterType === t
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t === '' ? 'Tous' : t === 'preventive' ? 'Préventif' : 'Correctif'}
              </button>
            ))}
          </div>
        )}
      </div>

      {!selectedId ? (
        <div className="text-center py-16 text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Sélectionnez un équipement pour voir son historique</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Aucune intervention enregistrée pour cet équipement</p>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">{selectedEq?.nom}</h3>
              <p className="text-xs text-gray-400">{filtered.length} intervention{filtered.length > 1 ? 's' : ''}</p>
            </div>
            {/* Summary pills */}
            <div className="flex gap-2">
              {[
                { label: 'Terminées', count: interventions.filter(i => i.statut === 'terminee').length, color: 'bg-green-100 text-green-700' },
                { label: 'En cours', count: interventions.filter(i => i.statut === 'en_cours').length, color: 'bg-yellow-100 text-yellow-700' },
                { label: 'Planifiées', count: interventions.filter(i => i.statut === 'planifiee').length, color: 'bg-blue-100 text-blue-700' },
              ].map(({ label, count, color }) => count > 0 ? (
                <span key={label} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${color}`}>
                  {count} {label}
                </span>
              ) : null)}
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
            <div className="space-y-3">
              {filtered.map((iv, i) => {
                const sc = INTERVENTION_STATUT_CONFIG[iv.statut] || INTERVENTION_STATUT_CONFIG.planifiee;
                const pc = PRIORITE_CONFIG[iv.priorite] || PRIORITE_CONFIG.normal;
                const isLast = iv.statut === 'terminee';
                return (
                  <div key={iv.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className={`absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 border-white ring-1 ring-gray-200 ${
                      iv.statut === 'terminee' ? 'bg-green-500' :
                      iv.statut === 'en_cours' ? 'bg-yellow-500' :
                      iv.statut === 'reportee' ? 'bg-orange-400' : 'bg-blue-400'
                    }`} />
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sc.color}`}>
                              {sc.label}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              iv.type === 'corrective' ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'
                            }`}>
                              {iv.type === 'corrective' ? 'Correctif' : 'Préventif'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded border ${pc.color}`}>
                              {pc.label}
                            </span>
                          </div>
                          {iv.description && (
                            <p className="mt-2 text-sm text-gray-700">{iv.description}</p>
                          )}
                          {iv.actions_effectuees && (
                            <p className="mt-1 text-xs text-gray-500 italic">
                              Actions : {iv.actions_effectuees}
                            </p>
                          )}
                          {iv.pieces_remplacees && (
                            <p className="mt-1 text-xs text-gray-500">
                              Pièces : {iv.pieces_remplacees}
                            </p>
                          )}
                          {(iv.technicien?.firstName || iv.signale_par) && (
                            <p className="mt-1 text-xs text-gray-400">
                              {iv.technicien ? `Technicien : ${iv.technicien.firstName} ${iv.technicien.lastName || ''}` : `Signalé par : ${iv.signale_par}`}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-semibold text-gray-600">
                            {iv.date_planifiee ? new Date(iv.date_planifiee).toLocaleDateString('fr-FR') : '—'}
                          </div>
                          {iv.date_realisation && (
                            <div className="text-xs text-gray-400">
                              Réalisé : {new Date(iv.date_realisation).toLocaleDateString('fr-FR')}
                            </div>
                          )}
                          {iv.duree_reelle && (
                            <div className="text-xs text-gray-400">{iv.duree_reelle}h</div>
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
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Formulaire de retrait */}
      <div>
        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          Enregistrer un retrait
        </h3>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              <CheckCircle className="w-4 h-4" />{success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Équipement *</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
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
            <label className="block text-xs font-semibold text-gray-600 mb-1">Date de retrait *</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.date}
              onChange={e => set('date', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Motif *</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
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
            <label className="block text-xs font-semibold text-gray-600 mb-1">Destination / Responsable</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Ex: Atelier central, Service BOP, M. Dupont…"
              value={form.destination}
              onChange={e => set('destination', e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer le retrait'}
          </button>
        </form>
      </div>

      {/* Équipements actuellement en retrait */}
      <div>
        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-yellow-600" />
          Équipements en retrait
          <span className="ml-auto text-sm font-normal text-gray-400">{enRetrait.length}</span>
        </h3>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {enRetrait.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">Aucun équipement en retrait</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {enRetrait.map(eq => (
                <div key={eq.id} className="flex items-start gap-3 p-4 hover:bg-yellow-50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm">{eq.nom}</div>
                    <div className="text-xs text-gray-400">{eq.service || '—'}</div>
                    {eq.notes && (
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{eq.notes.split('\n')[0]}</div>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm(`Remettre "${eq.nom}" en service ?`)) return;
                      await gmaoAPI.updateEquipement(eq.id, { statut: 'actif' });
                      onRefresh();
                    }}
                    className="text-xs text-green-600 hover:text-green-700 font-medium flex-shrink-0"
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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const reformes = equipements.filter(e => e.statut === 'hors_service');
  const disponibles = equipements.filter(e => e.statut !== 'hors_service');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipement_id || !form.motif) { setError('Équipement et motif requis.'); return; }
    if (!confirm('Confirmer la mise en réforme de cet équipement ? Cette action le retire définitivement du parc actif.')) return;
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
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Formulaire */}
      <div>
        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-500" />
          Mettre en réforme
        </h3>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-red-100 shadow-sm p-5 space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            La mise en réforme retire l'équipement du parc actif de façon permanente.
          </div>

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              <CheckCircle className="w-4 h-4" />{success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Équipement *</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
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
            <label className="block text-xs font-semibold text-gray-600 mb-1">Date de réforme *</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              value={form.date_reforme}
              onChange={e => set('date_reforme', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Motif de réforme *</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
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
            <label className="block text-xs font-semibold text-gray-600 mb-1">Observations</label>
            <textarea
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              placeholder="Observations complémentaires…"
              value={form.observations}
              onChange={e => set('observations', e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Confirmer la mise en réforme'}
          </button>
        </form>
      </div>

      {/* Liste des réformés */}
      <div>
        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
          <List className="w-4 h-4 text-red-400" />
          Équipements réformés
          <span className="ml-auto text-sm font-normal text-gray-400">{reformes.length}</span>
        </h3>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {reformes.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">Aucun équipement réformé</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[450px] overflow-y-auto">
              {reformes.map(eq => (
                <div key={eq.id} className="flex items-start gap-3 p-4">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-700 text-sm">{eq.nom}</div>
                    <div className="text-xs text-gray-400">{eq.service || '—'}</div>
                    {eq.date_mise_au_rebus && (
                      <div className="text-xs text-red-400 mt-0.5">
                        Réformé le {new Date(eq.date_mise_au_rebus).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                    {eq.notes && (
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{eq.notes.split('\n')[0]}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CONTRATS PANEL ───────────────────────────────────────────────────────────

const TYPE_CONTRAT_LABELS = {
  maintenance_preventive: 'Maintenance préventive',
  maintenance_corrective: 'Maintenance corrective',
  maintenance_totale:     'Maintenance totale',
  piece_rechange:         'Pièce de rechange',
  calibration:            'Calibration',
  autre:                  'Autre',
};

const STATUT_CONTRAT = {
  actif:             { label: 'Actif',             color: 'bg-green-100 text-green-700 border-green-200' },
  expire:            { label: 'Expiré',            color: 'bg-red-100 text-red-700 border-red-200' },
  resilie:           { label: 'Résilié',           color: 'bg-gray-100 text-gray-600 border-gray-200' },
  en_renouvellement: { label: 'En renouvellement', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  suspendu:          { label: 'Suspendu',          color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
};

function ContratsPanel() {
  const [contrats, setContrats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [filterStatut, setFilterStatut] = useState('');
  const EMPTY = { prestataire:'', type_contrat:'maintenance_totale', date_debut:'', date_fin:'', montant:'', periodicite:'annuel', statut:'actif', contact_prestataire:'', telephone:'', email:'', alerte_renouvellement:30, description:'', notes:'' };
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

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
    } catch (err) { toast(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce contrat ?')) return;
    await gmaoAPI.deleteContrat(id);
    load();
  };

  // Stats summary
  const actifs = contrats.filter(c => c.statut === 'actif').length;
  const expiresBientot = contrats.filter(c => c.expirationProche).length;
  const expires = contrats.filter(c => c.expire || c.statut === 'expire').length;
  const montantTotal = contrats.filter(c => c.statut === 'actif').reduce((s, c) => s + (c.montant || 0), 0);

  return (
    <div className="p-6 space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Contrats actifs', val: actifs, color: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'Expirent bientôt', val: expiresBientot, color: expiresBientot > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-500' },
          { label: 'Expirés', val: expires, color: expires > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-500' },
          { label: 'Montant annuel total', val: `${montantTotal.toLocaleString('fr-FR')} €`, color: 'bg-blue-50 border-blue-200 text-blue-700' },
        ].map(({ label, val, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${color}`}>
            <div className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{label}</div>
            <div className="text-2xl font-bold">{val}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
          value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_CONTRAT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => { setEditTarget(null); setForm(EMPTY); setShowForm(true); }}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Nouveau contrat
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-xl border border-teal-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">{editTarget ? 'Modifier le contrat' : 'Nouveau contrat'}</h3>
            <button onClick={() => { setShowForm(false); setEditTarget(null); }}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 block mb-1">Prestataire *</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                placeholder="Nom du prestataire…" value={form.prestataire} onChange={e => set('prestataire', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Type de contrat</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                value={form.type_contrat} onChange={e => set('type_contrat', e.target.value)}>
                {Object.entries(TYPE_CONTRAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Montant (€/an)</label>
              <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                placeholder="0" value={form.montant} onChange={e => set('montant', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Date début *</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                value={form.date_debut} onChange={e => set('date_debut', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Date fin *</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                value={form.date_fin} onChange={e => set('date_fin', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Contact</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                placeholder="Nom du contact" value={form.contact_prestataire} onChange={e => set('contact_prestataire', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Téléphone</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                placeholder="+237 6XX XXX XXX" value={form.telephone} onChange={e => set('telephone', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Statut</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                value={form.statut} onChange={e => set('statut', e.target.value)}>
                {Object.entries(STATUT_CONTRAT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Alerte renouvellement (jours avant)</label>
              <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                value={form.alerte_renouvellement} onChange={e => set('alerte_renouvellement', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 block mb-1">Description / Périmètre couvert</label>
              <textarea rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none resize-none"
                placeholder="Services ou équipements couverts…" value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditTarget(null); }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                {saving ? 'Enregistrement…' : editTarget ? 'Mettre à jour' : 'Créer le contrat'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-teal-500" /></div>
      ) : contrats.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Aucun contrat enregistré</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Prestataire</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Période</th>
                <th className="text-right px-4 py-3">Montant</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="text-left px-4 py-3">Échéance</th>
                <th className="px-4 py-3"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {contrats.map(c => {
                  const sc = STATUT_CONTRAT[c.statut] || STATUT_CONTRAT.actif;
                  return (
                    <tr key={c.id} className={`hover:bg-gray-50 ${c.expirationProche ? 'bg-amber-50' : c.expire ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{c.prestataire}</div>
                        {c.contact_prestataire && <div className="text-xs text-gray-400">{c.contact_prestataire}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{TYPE_CONTRAT_LABELS[c.type_contrat] || c.type_contrat}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {c.date_debut && new Date(c.date_debut).toLocaleDateString('fr-FR')} → {c.date_fin && new Date(c.date_fin).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">
                        {c.montant ? `${parseFloat(c.montant).toLocaleString('fr-FR')} €` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sc.color}`}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {c.joursRestants > 0 ? (
                          <span className={`text-xs font-semibold ${c.expirationProche ? 'text-amber-600' : 'text-gray-500'}`}>
                            {c.joursRestants}j restants
                          </span>
                        ) : (
                          <span className="text-xs text-red-500 font-semibold">Expiré</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-teal-600 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
  );
}

// ─── PIÈCES DE RECHANGE PANEL ─────────────────────────────────────────────────

function PiecesPanel({ subSection }) {
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
    } catch (err) { toast(err.response?.data?.message || 'Erreur'); }
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
    } catch (err) { toast(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette pièce ?')) return;
    await gmaoAPI.deletePiece(id);
    loadPieces();
  };

  const MVT_TYPE = {
    entree: { label: 'Entrée', color: 'bg-green-100 text-green-700' },
    sortie: { label: 'Sortie', color: 'bg-red-100 text-red-700' },
    ajustement: { label: 'Ajustement', color: 'bg-blue-100 text-blue-700' },
    retour: { label: 'Retour', color: 'bg-yellow-100 text-yellow-700' },
  };

  const stockCritiques = pieces.filter(p => p.stockCritique).length;

  // ── Listing mouvements ──
  if (subSection === 'pieces_mouvements') {
    return (
      <div className="p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <List className="w-5 h-5 text-teal-500" /> Listing des mouvements de stock
          <span className="ml-auto text-sm font-normal text-gray-400">{mouvements.length} mouvement{mouvements.length > 1 ? 's' : ''}</span>
        </h3>
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-teal-500" /></div>
        ) : mouvements.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><Package className="w-12 h-12 mx-auto mb-3 text-gray-200" /><p>Aucun mouvement enregistré</p></div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Pièce</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-right px-4 py-3">Quantité</th>
                  <th className="text-left px-4 py-3">Motif</th>
                  <th className="text-left px-4 py-3">Par</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {mouvements.map(m => {
                    const mt = MVT_TYPE[m.type] || MVT_TYPE.entree;
                    return (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{m.date ? new Date(m.date).toLocaleDateString('fr-FR') : '—'}</td>
                        <td className="px-4 py-2.5"><div className="font-medium text-gray-800">{m.piece?.designation || '—'}</div><div className="text-xs text-gray-400">{m.piece?.reference}</div></td>
                        <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${mt.color}`}>{mt.label}</span></td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-700">{m.quantite} {m.piece?.unite || ''}</td>
                        <td className="px-4 py-2.5 text-gray-500">{m.motif || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{m.auteur ? `${m.auteur.firstName} ${m.auteur.lastName || ''}` : '—'}</td>
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
    <div className="p-6 space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-800">{pieces.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">Références</div>
        </div>
        <div className={`rounded-xl border p-4 text-center ${stockCritiques > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className={`text-2xl font-bold ${stockCritiques > 0 ? 'text-red-700' : 'text-green-700'}`}>{stockCritiques}</div>
          <div className={`text-xs mt-0.5 ${stockCritiques > 0 ? 'text-red-600' : 'text-green-600'}`}>Stock critique{stockCritiques > 1 ? 's' : ''}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">
            {pieces.reduce((s, p) => s + (p.quantite_stock * (p.prix_unitaire || 0)), 0).toLocaleString('fr-FR')} €
          </div>
          <div className="text-xs text-blue-600 mt-0.5">Valeur du stock</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
          <input className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-400 focus:outline-none"
            placeholder="Référence, désignation…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setAlerteOnly(a => !a)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${alerteOnly ? 'bg-red-600 text-white border-red-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          <AlertCircle className="w-4 h-4" /> Stock critique seulement
        </button>
        <button onClick={() => { setEditTarget(null); setForm(EMPTY_PIECE); setShowForm(true); }}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg">
          <Plus className="w-4 h-4" /> Ajouter une pièce
        </button>
      </div>

      {/* Formulaire pièce */}
      {showForm && (
        <div className="bg-white rounded-xl border border-teal-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">{editTarget ? 'Modifier la pièce' : 'Nouvelle pièce de rechange'}</h3>
            <button onClick={() => { setShowForm(false); setEditTarget(null); }}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { k:'reference', label:'Référence *', type:'text', placeholder:'REF-001' },
              { k:'designation', label:'Désignation *', type:'text', placeholder:'Nom de la pièce…' },
              { k:'categorie', label:'Catégorie', type:'text', placeholder:'Électronique, Mécanique…' },
              { k:'quantite_stock', label:'Stock actuel', type:'number', placeholder:'0' },
              { k:'quantite_min', label:'Stock minimum (alerte)', type:'number', placeholder:'1' },
              { k:'unite', label:'Unité', type:'text', placeholder:'unité, lot, paire…' },
              { k:'prix_unitaire', label:'Prix unitaire (€)', type:'number', placeholder:'0' },
              { k:'fournisseur', label:'Fournisseur', type:'text', placeholder:'Nom du fournisseur…' },
              { k:'localisation', label:'Localisation (armoire…)', type:'text', placeholder:'Armoire A-1…' },
            ].map(({ k, label, type, placeholder }) => (
              <div key={k}>
                <label className="text-xs font-semibold text-gray-500 block mb-1">{label}</label>
                <input type={type} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                  placeholder={placeholder} value={form[k]} onChange={e => set(k, e.target.value)} />
              </div>
            ))}
            <div className="col-span-full flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditTarget(null); }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                {saving ? 'Enregistrement…' : editTarget ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Formulaire mouvement */}
      {showMvtForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Mouvement de stock — {showMvtForm.designation}</h3>
              <button onClick={() => setShowMvtForm(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleMouvement} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Type de mouvement</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                  value={mvtForm.type} onChange={e => setMvtForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="entree">Entrée (réapprovisionnement)</option>
                  <option value="sortie">Sortie (utilisation)</option>
                  <option value="ajustement">Ajustement inventaire</option>
                  <option value="retour">Retour fournisseur</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Quantité *</label>
                  <input type="number" min="1" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    value={mvtForm.quantite} onChange={e => setMvtForm(f => ({ ...f, quantite: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Date</label>
                  <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    value={mvtForm.date} onChange={e => setMvtForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Motif</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Raison du mouvement…" value={mvtForm.motif} onChange={e => setMvtForm(f => ({ ...f, motif: e.target.value }))} />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowMvtForm(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Annuler</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table pièces */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-teal-500" /></div>
      ) : pieces.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><Package className="w-12 h-12 mx-auto mb-3 text-gray-200" /><p className="text-sm">Aucune pièce enregistrée</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Référence</th>
                <th className="text-left px-4 py-3">Désignation</th>
                <th className="text-left px-4 py-3">Catégorie</th>
                <th className="text-center px-4 py-3">Stock</th>
                <th className="text-right px-4 py-3">Prix unit.</th>
                <th className="text-left px-4 py-3">Localisation</th>
                <th className="px-4 py-3"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {pieces.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50 ${p.stockCritique ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{p.reference}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{p.designation}</td>
                    <td className="px-4 py-2.5 text-gray-500">{p.categorie || '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 font-bold text-sm px-2 py-0.5 rounded-full ${
                        p.stockCritique ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {p.quantite_stock} {p.unite}
                        {p.stockCritique && <AlertCircle className="w-3 h-3" />}
                      </span>
                      <div className="text-[10px] text-gray-400 mt-0.5">min: {p.quantite_min}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">
                      {p.prix_unitaire ? `${parseFloat(p.prix_unitaire).toLocaleString('fr-FR')} €` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400">{p.localisation || '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowMvtForm(p)} title="Mouvement de stock"
                          className="text-xs px-2 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded font-medium">±Stock</button>
                        <button onClick={() => { setEditTarget(p); setForm({ ...EMPTY_PIECE, ...p }); setShowForm(true); }}
                          className="text-gray-400 hover:text-teal-600"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
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
  );
}

// ─── ACQUISITION PANEL ────────────────────────────────────────────────────────

const STATUT_ACQ = {
  en_attente:   { label: 'En attente',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200', step: 0 },
  approuvee:    { label: 'Approuvée',    color: 'bg-blue-100 text-blue-700 border-blue-200',       step: 1 },
  rejetee:      { label: 'Rejetée',      color: 'bg-red-100 text-red-700 border-red-200',          step: -1 },
  commandee:    { label: 'Commandée',    color: 'bg-indigo-100 text-indigo-700 border-indigo-200', step: 2 },
  receptionnee: { label: 'Réceptionnée', color: 'bg-teal-100 text-teal-700 border-teal-200',       step: 3 },
  affectee:     { label: 'Affectée',     color: 'bg-green-100 text-green-700 border-green-200',    step: 4 },
};

const WORKFLOW_STEPS = ['en_attente','approuvee','commandee','receptionnee','affectee'];

function AcquisitionPanel() {
  const [acquisitions, setAcquisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterStatut, setFilterStatut] = useState('');
  const EMPTY = { designation:'', type_equipement:'', quantite:1, service_demandeur:'', priorite:'normale', motif:'', specifications:'', budget_estime:'', fournisseur:'', numero_commande:'', prix_achat:'', notes:'' };
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

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
    } catch (err) { toast(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleStatutChange = async (acq, newStatut) => {
    const updates = { statut: newStatut };
    if (newStatut === 'rejetee') {
      const motif = prompt('Motif de rejet (optionnel):');
      if (motif !== null) updates.motif_rejet = motif;
    }
    if (newStatut === 'commandee') {
      updates.fournisseur = selected?.fournisseur || acq.fournisseur || '';
      updates.numero_commande = selected?.numero_commande || acq.numero_commande || '';
    }
    if (newStatut === 'affectee' && !acq.prix_achat) {
      const prix = prompt('Prix d\'achat final (€):');
      if (prix) updates.prix_achat = parseFloat(prix);
    }
    await gmaoAPI.updateAcquisition(acq.id, updates);
    load();
    if (selected?.id === acq.id) setSelected({ ...acq, ...updates });
  };

  const PRIORITE_BADGE = { normale: 'bg-gray-100 text-gray-600', urgente: 'bg-orange-100 text-orange-700', critique: 'bg-red-100 text-red-700' };

  const counts = {
    en_attente: acquisitions.filter(a => a.statut === 'en_attente').length,
    approuvee:  acquisitions.filter(a => a.statut === 'approuvee').length,
    commandee:  acquisitions.filter(a => a.statut === 'commandee').length,
    total:      acquisitions.length,
  };

  return (
    <div className="flex h-full min-h-[500px]">
      {/* Panneau gauche — liste */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        {/* Stats rapides */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          {[['En attente', counts.en_attente,'text-yellow-600'],['Approuvées', counts.approuvee,'text-blue-600'],['Commandées', counts.commandee,'text-indigo-600']].map(([label, count, color]) => (
            <div key={label} className="py-3 text-center">
              <div className={`text-xl font-bold ${color}`}>{count}</div>
              <div className="text-[10px] text-gray-400">{label}</div>
            </div>
          ))}
        </div>
        {/* Filtres */}
        <div className="p-3 border-b border-gray-100 flex gap-2">
          <select className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
            value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
            <option value="">Tous</option>
            {Object.entries(STATUT_ACQ).filter(([k]) => k !== 'rejetee').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            <option value="rejetee">Rejetées</option>
          </select>
          <button onClick={() => { setShowForm(true); setSelected(null); }}
            className="flex items-center gap-1 px-2 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg">
            <Plus className="w-3 h-3" /> Nouvelle
          </button>
        </div>
        {/* Liste */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-teal-500" /></div>
          ) : acquisitions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">Aucune demande</div>
          ) : acquisitions.map(a => {
            const sc = STATUT_ACQ[a.statut] || STATUT_ACQ.en_attente;
            return (
              <button key={a.id} onClick={() => { setSelected(a); setShowForm(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selected?.id === a.id ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-gray-800 text-xs truncate flex-1">{a.designation}</div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${sc.color}`}>{sc.label}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-400">{a.reference || '—'}</span>
                  <span className={`text-[10px] px-1 py-0.5 rounded ${PRIORITE_BADGE[a.priorite] || ''}`}>{a.priorite}</span>
                  {a.service_demandeur && <span className="text-[10px] text-gray-400">{a.service_demandeur}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Panneau droit — détail / formulaire */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {showForm ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">
            <h3 className="text-base font-bold text-gray-800 mb-5">Nouvelle demande d'acquisition</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Désignation de l'équipement *</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                    placeholder="Nom de l'équipement demandé…" value={form.designation} onChange={e => set('designation', e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Type d'équipement</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                    placeholder="Moniteur, Défibrillateur…" value={form.type_equipement} onChange={e => set('type_equipement', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Quantité</label>
                  <input type="number" min="1" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                    value={form.quantite} onChange={e => set('quantite', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Service demandeur</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                    value={form.service_demandeur} onChange={e => set('service_demandeur', e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {SERVICES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Priorité</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                    value={form.priorite} onChange={e => set('priorite', e.target.value)}>
                    <option value="normale">Normale</option>
                    <option value="urgente">Urgente</option>
                    <option value="critique">Critique</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Budget estimé (€)</label>
                  <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                    placeholder="0" value={form.budget_estime} onChange={e => set('budget_estime', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Motif / Justification</label>
                  <textarea rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none resize-none"
                    placeholder="Pourquoi cet équipement est-il nécessaire ?" value={form.motif} onChange={e => set('motif', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Spécifications techniques</label>
                  <textarea rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none resize-none"
                    placeholder="Caractéristiques techniques requises…" value={form.specifications} onChange={e => set('specifications', e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Annuler</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                  {saving ? 'Enregistrement…' : 'Soumettre la demande'}
                </button>
              </div>
            </form>
          </div>
        ) : selected ? (
          <div className="max-w-2xl space-y-5">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400 font-mono">{selected.reference || '—'}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${(STATUT_ACQ[selected.statut] || STATUT_ACQ.en_attente).color}`}>
                      {(STATUT_ACQ[selected.statut] || STATUT_ACQ.en_attente).label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITE_BADGE[selected.priorite] || ''}`}>{selected.priorite}</span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">{selected.designation}</h2>
                  <div className="text-sm text-gray-500 mt-0.5">{selected.type_equipement} — {selected.service_demandeur || '—'} — Qté: {selected.quantite}</div>
                </div>
                <button onClick={() => { if(confirm('Supprimer cette demande ?')) { gmaoAPI.deleteAcquisition(selected.id); setSelected(null); load(); } }}
                  className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Stepper workflow */}
            {selected.statut !== 'rejetee' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Progression</h3>
                <div className="flex items-center gap-0">
                  {WORKFLOW_STEPS.map((step, i) => {
                    const sc = STATUT_ACQ[step];
                    const currentStep = STATUT_ACQ[selected.statut]?.step ?? 0;
                    const done = i < currentStep;
                    const active = i === currentStep;
                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div className={`flex flex-col items-center ${i < WORKFLOW_STEPS.length - 1 ? 'flex-1' : ''}`}>
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                            done ? 'bg-teal-500 border-teal-500 text-white' :
                            active ? 'bg-white border-teal-500 text-teal-600 ring-2 ring-teal-200' :
                            'bg-white border-gray-200 text-gray-400'
                          }`}>
                            {done ? '✓' : i + 1}
                          </div>
                          <span className={`text-[9px] mt-1 text-center ${active ? 'font-bold text-teal-600' : done ? 'text-gray-500' : 'text-gray-300'}`}>
                            {sc.label}
                          </span>
                        </div>
                        {i < WORKFLOW_STEPS.length - 1 && (
                          <div className={`h-0.5 flex-1 mb-4 ${i < currentStep ? 'bg-teal-400' : 'bg-gray-200'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions workflow */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Actions</h3>
              <div className="flex flex-wrap gap-2">
                {selected.statut === 'en_attente' && <>
                  <button onClick={() => handleStatutChange(selected, 'approuvee')} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">✓ Approuver</button>
                  <button onClick={() => handleStatutChange(selected, 'rejetee')} className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600">✗ Rejeter</button>
                </>}
                {selected.statut === 'approuvee' && (
                  <button onClick={() => handleStatutChange(selected, 'commandee')} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">📦 Marquer commandé</button>
                )}
                {selected.statut === 'commandee' && (
                  <button onClick={() => handleStatutChange(selected, 'receptionnee')} className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700">✓ Marquer réceptionné</button>
                )}
                {selected.statut === 'receptionnee' && (
                  <button onClick={() => handleStatutChange(selected, 'affectee')} className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700">✓ Affecter au service</button>
                )}
                {selected.statut === 'rejetee' && (
                  <button onClick={() => handleStatutChange(selected, 'en_attente')} className="px-4 py-2 bg-gray-600 text-white text-sm font-semibold rounded-lg hover:bg-gray-700">↺ Remettre en attente</button>
                )}
              </div>
            </div>

            {/* Détails */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Détails</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Budget estimé', selected.budget_estime ? `${parseFloat(selected.budget_estime).toLocaleString('fr-FR')} €` : '—'],
                  ['Prix d\'achat final', selected.prix_achat ? `${parseFloat(selected.prix_achat).toLocaleString('fr-FR')} €` : '—'],
                  ['Fournisseur', selected.fournisseur || '—'],
                  ['N° commande', selected.numero_commande || '—'],
                  ['Date demande', selected.date_demande ? new Date(selected.date_demande).toLocaleDateString('fr-FR') : '—'],
                  ['Date approbation', selected.date_approbation ? new Date(selected.date_approbation).toLocaleDateString('fr-FR') : '—'],
                  ['Date commande', selected.date_commande ? new Date(selected.date_commande).toLocaleDateString('fr-FR') : '—'],
                  ['Date réception', selected.date_reception ? new Date(selected.date_reception).toLocaleDateString('fr-FR') : '—'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <span className="text-xs text-gray-400 block">{label}</span>
                    <span className="text-gray-800 font-medium">{val}</span>
                  </div>
                ))}
              </div>
              {selected.motif && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400 block mb-1">Motif / Justification</span>
                  <p className="text-sm text-gray-700">{selected.motif}</p>
                </div>
              )}
              {selected.specifications && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400 block mb-1">Spécifications</span>
                  <p className="text-sm text-gray-700">{selected.specifications}</p>
                </div>
              )}
              {selected.motif_rejet && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-xs font-semibold text-red-700 block mb-1">Motif de rejet</span>
                  <p className="text-sm text-red-800">{selected.motif_rejet}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <ShoppingCart className="w-12 h-12 mb-3 text-gray-200" />
            <p className="text-sm">Sélectionnez une demande ou créez-en une nouvelle</p>
          </div>
        )}
      </div>
    </div>
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
    if (!confirm(`Migrer ${keyLignes.length} lignes, ${keyAchats.length} achats, ${keyFactures.length} factures de ${annee} vers la base de données ?`)) return;
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

  const FACT_STATUT = { en_attente: { label:'En attente', color:'bg-yellow-100 text-yellow-700' }, payee: { label:'Payée', color:'bg-green-100 text-green-700' }, contestee: { label:'Contestée', color:'bg-red-100 text-red-700' } };

  const SH = ({ icon, title }) => (
    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">{icon}{title}</h3>
  );

  const MigrateBar = () => (
    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
      <div className="flex-1 text-xs text-blue-700">
        {migrateMsg ? <span className="font-semibold">{migrateMsg}</span> : 'Vous avez des données budgétaires stockées localement ?'}
      </div>
      <button onClick={handleMigrate} disabled={migrating}
        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
        {migrating ? 'Migration…' : '↑ Migrer depuis localStorage'}
      </button>
    </div>
  );

  const renderLigneBudgetaire = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <SH icon={<DollarSign className="w-4 h-4 text-blue-500" />} title="Ajouter une ligne budgétaire" />
        <form onSubmit={addLigne} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Catégorie *</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
              value={formLigne.categorie} onChange={e => setFormLigne(f => ({ ...f, categorie: e.target.value }))}>
              <option value="">— Sélectionner —</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Montant alloué (€) *</label>
            <input type="number" min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
              value={formLigne.montant} onChange={e => setFormLigne(f => ({ ...f, montant: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Description</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
              placeholder="Optionnel…" value={formLigne.description} onChange={e => setFormLigne(f => ({ ...f, description: e.target.value }))} />
          </div>
          <button type="submit" disabled={saving} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
            {saving ? 'Enregistrement…' : 'Ajouter la ligne'}
          </button>
        </form>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">Lignes budgétaires {annee}</span>
          <span className="text-sm font-bold text-blue-600">{totalAlloue.toLocaleString('fr-FR')} €</span>
        </div>
        {loading ? <div className="flex justify-center p-6"><RefreshCw className="w-5 h-5 animate-spin text-teal-500" /></div> : lignes.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">Aucune ligne</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {lignes.map(l => (
              <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{l.categorie}</div>
                  {l.description && <div className="text-xs text-gray-400">{l.description}</div>}
                </div>
                <span className="font-bold text-blue-700">{parseFloat(l.montant).toLocaleString('fr-FR')} €</span>
                <button onClick={() => delLigne(l.id)} className="text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderAchats = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <SH icon={<ShoppingCart className="w-4 h-4 text-orange-500" />} title="Enregistrer un achat / dépense" />
        <form onSubmit={addAchat} className="space-y-3">
          {[
            { k:'date', label:'Date', type:'date' },
            { k:'description', label:'Description *', type:'text', placeholder:'Nature de la dépense…' },
            { k:'fournisseur', label:'Fournisseur', type:'text', placeholder:'Nom du fournisseur…' },
            { k:'montant', label:'Montant (€) *', type:'number', placeholder:'0' },
          ].map(({ k, label, type, placeholder }) => (
            <div key={k}>
              <label className="text-xs font-semibold text-gray-500 block mb-1">{label}</label>
              <input type={type} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                placeholder={placeholder} value={formAchat[k]} onChange={e => setFormAchat(f => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Catégorie</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
              value={formAchat.categorie} onChange={e => setFormAchat(f => ({ ...f, categorie: e.target.value }))}>
              <option value="">— Catégorie —</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" disabled={saving} className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
            {saving ? 'Enregistrement…' : 'Enregistrer la dépense'}
          </button>
        </form>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">Achats & Dépenses {annee}</span>
          <span className="text-sm font-bold text-orange-600">{totalAchats.toLocaleString('fr-FR')} €</span>
        </div>
        {loading ? <div className="flex justify-center p-6"><RefreshCw className="w-5 h-5 animate-spin text-teal-500" /></div> : achats.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">Aucun achat</div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {achats.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className="text-xs text-gray-400 w-20 flex-shrink-0">{new Date(a.date).toLocaleDateString('fr-FR')}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{a.description}</div>
                  {a.fournisseur && <div className="text-xs text-gray-400">{a.fournisseur}</div>}
                </div>
                <span className="font-bold text-orange-600 flex-shrink-0">{parseFloat(a.montant).toLocaleString('fr-FR')} €</span>
                <button onClick={() => delDepense(a.id)} className="text-gray-300 hover:text-red-500 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderFactures = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <SH icon={<Receipt className="w-4 h-4 text-purple-500" />} title="Enregistrer une facture" />
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
              <label className="text-xs font-semibold text-gray-500 block mb-1">{label}</label>
              <input type={type} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                placeholder={placeholder} value={formFact[k]} onChange={e => setFormFact(f => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Statut</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
              value={formFact.statut_facture} onChange={e => setFormFact(f => ({ ...f, statut_facture: e.target.value }))}>
              <option value="en_attente">En attente</option><option value="payee">Payée</option><option value="contestee">Contestée</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
            {saving ? 'Enregistrement…' : 'Enregistrer la facture'}
          </button>
        </form>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">Factures {annee}</span>
          <span className="text-sm font-bold text-purple-600">{totalFact.toLocaleString('fr-FR')} €</span>
        </div>
        {loading ? <div className="flex justify-center p-6"><RefreshCw className="w-5 h-5 animate-spin text-teal-500" /></div> : factures.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">Aucune facture</div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {factures.map(f => {
              const sc = FACT_STATUT[f.statut_facture] || FACT_STATUT.en_attente;
              return (
                <div key={f.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{f.fournisseur || f.description}</span>
                      {f.numero_facture && <span className="text-xs text-gray-400">{f.numero_facture}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{new Date(f.date).toLocaleDateString('fr-FR')}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${sc.color}`}>{sc.label}</span>
                    </div>
                  </div>
                  <span className="font-bold text-purple-600 flex-shrink-0">{parseFloat(f.montant).toLocaleString('fr-FR')} €</span>
                  <button onClick={() => delDepense(f.id)} className="text-gray-300 hover:text-red-500 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderEtat = () => {
    const barColor = pctConsomme > 90 ? 'bg-red-500' : pctConsomme > 70 ? 'bg-yellow-400' : 'bg-green-500';
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">État du Budget {annee}</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label:'Budget alloué', val: totalAlloue, color:'text-blue-600' },
              { label:'Total dépenses', val: totalDepenses, color:'text-red-600' },
              { label:'Solde disponible', val: solde, color: solde >= 0 ? 'text-green-600' : 'text-red-600' },
            ].map(({ label, val, color }) => (
              <div key={label} className="text-center p-4 bg-gray-50 rounded-xl">
                <div className={`text-2xl font-bold ${color}`}>{val.toLocaleString('fr-FR')} €</div>
                <div className="text-xs text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-gray-500">Consommation</span>
            <span className={`font-bold ${pctConsomme > 90 ? 'text-red-600' : pctConsomme > 70 ? 'text-yellow-600' : 'text-green-600'}`}>{pctConsomme}%</span>
          </div>
          <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(100, pctConsomme)}%` }} />
          </div>
          {pctConsomme > 90 && <div className="mt-3 flex items-center gap-2 text-xs text-red-600 font-medium"><AlertTriangle className="w-4 h-4" /> Budget presque épuisé</div>}
        </div>
        {lignes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50"><span className="text-sm font-bold text-gray-700">Détail par catégorie</span></div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-xs text-gray-400 uppercase">
                <th className="text-left px-5 py-2">Catégorie</th>
                <th className="text-right px-5 py-2">Alloué</th>
                <th className="text-right px-5 py-2">Dépensé</th>
                <th className="text-right px-5 py-2">Reste</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {lignes.map(l => {
                  const spent = [...achats, ...factures].filter(d => d.categorie === l.categorie).reduce((s, d) => s + (parseFloat(d.montant) || 0), 0);
                  const reste = parseFloat(l.montant) - spent;
                  return (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 font-medium text-gray-700">{l.categorie}</td>
                      <td className="px-5 py-2.5 text-right text-blue-600 font-semibold">{parseFloat(l.montant).toLocaleString('fr-FR')} €</td>
                      <td className="px-5 py-2.5 text-right text-orange-600">{spent.toLocaleString('fr-FR')} €</td>
                      <td className={`px-5 py-2.5 text-right font-bold ${reste < 0 ? 'text-red-600' : 'text-green-600'}`}>{reste.toLocaleString('fr-FR')} €</td>
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
      <div className="flex items-center gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Année budgétaire</label>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
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
      <RefreshCw className="w-6 h-6 animate-spin text-teal-500" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Année</label>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
            value={annee}
            onChange={e => setAnnee(Number(e.target.value))}
          >
            {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="ml-auto text-sm text-gray-400">
          {totalInterventions} intervention{totalInterventions > 1 ? 's' : ''} — {techs.length} technicien{techs.length > 1 ? 's' : ''}
        </div>
      </div>

      {techs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Users className="w-12 h-12 mb-3 text-gray-200" />
          <p className="text-sm">Aucune donnée pour {annee}</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Technicien le + actif', val: leader?.nom, sub: `${leader?.total} interventions`, color: 'bg-teal-50 border-teal-200 text-teal-700', icon: <Users className="w-5 h-5" /> },
              { label: 'Total heures estimées', val: `${techs.reduce((s,t) => s + t.heures, 0).toFixed(1)}h`, sub: 'durée réelle cumulée', color: 'bg-blue-50 border-blue-200 text-blue-700', icon: <Clock className="w-5 h-5" /> },
              { label: 'Taux de complétion', val: `${totalInterventions ? Math.round(interventions.filter(i=>i.statut==='terminee').length/totalInterventions*100) : 0}%`, sub: 'interventions terminées', color: 'bg-green-50 border-green-200 text-green-700', icon: <CheckCircle className="w-5 h-5" /> },
            ].map(({ label, val, sub, color, icon }) => (
              <div key={label} className={`rounded-xl border p-4 ${color}`}>
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
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Risque de surcharge détecté</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  <strong>{leader.nom}</strong> réalise {Math.round(leader.total/totalInterventions*100)}% des interventions.
                  Envisagez de redistribuer la charge ou de recruter un technicien supplémentaire.
                </p>
              </div>
            </div>
          )}

          {/* Tableau des techniciens */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-500" /> Classement par activité — {annee}
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {techs.map((t, i) => {
                const pct = Math.round(t.total / maxTotal * 100);
                const share = Math.round(t.total / totalInterventions * 100);
                return (
                  <div key={t.nom} className="px-5 py-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-100 text-gray-600' :
                        i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 text-sm">{t.nom}</div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span>{t.total} interventions ({share}%)</span>
                          <span className="text-teal-600">{t.preventives} prév.</span>
                          <span className="text-orange-600">{t.correctives} corr.</span>
                          <span className="text-green-600">{t.terminees} terminées</span>
                          {t.heures > 0 && <span>{t.heures.toFixed(1)}h</span>}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-600 flex-shrink-0">{t.total}</span>
                    </div>
                    {/* Barre de progression */}
                    <div className="ml-10 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${i === 0 ? 'bg-teal-500' : 'bg-gray-300'}`}
                        style={{ width: `${pct}%` }}
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
      <RefreshCw className="w-6 h-6 animate-spin text-teal-500" />
    </div>
  );

  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

  // Cost per month = (total interventions × avg duration × taux) — approximate
  // byMonth already has total and terminee counts
  const monthCosts = analytics.byMonth.map(m => ({
    ...m,
    cout: Math.round(m.terminee * (analytics.avgDuree || 2) * tauxHoraire),
  }));
  const maxCout = Math.max(...monthCosts.map(m => m.cout), 1);
  const totalCout = monthCosts.reduce((s, m) => s + m.cout, 0);
  const coutPrev = Math.round(analytics.preventiveCount * (analytics.avgDuree || 2) * tauxHoraire);
  const coutCorr = Math.round(analytics.correctiveCount * (analytics.avgDuree || 2) * tauxHoraire);
  const totalTypes = coutPrev + coutCorr || 1;

  // byService costs
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
          <h3 className="text-base font-bold text-gray-800">Analyse Financière de la Maintenance</h3>
          <p className="text-xs text-gray-400 mt-0.5">Estimation basée sur la durée réelle × taux horaire configuré</p>
        </div>
        <div className="flex items-center gap-2">
          {editRate ? (
            <>
              <input
                type="number" min="1"
                className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-teal-400 focus:outline-none"
                value={tmpRate}
                onChange={e => setTmpRate(e.target.value)}
              />
              <span className="text-sm text-gray-500">€/h</span>
              <button onClick={saveRate} className="px-3 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg">OK</button>
              <button onClick={() => setEditRate(false)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg">Annuler</button>
            </>
          ) : (
            <button
              onClick={() => { setTmpRate(tauxHoraire); setEditRate(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Taux : {tauxHoraire} €/h
            </button>
          )}
        </div>
      </div>

      {/* KPIs financiers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Coût total estimé', val: `${totalCout.toLocaleString('fr-FR')} €`, icon: <DollarSign className="w-5 h-5 text-blue-500" />, color: 'border-blue-100 bg-blue-50' },
          { label: 'Coût préventif', val: `${coutPrev.toLocaleString('fr-FR')} €`, icon: <TrendingUp className="w-5 h-5 text-teal-500" />, color: 'border-teal-100 bg-teal-50', sub: `${Math.round(coutPrev/totalTypes*100)}% du total` },
          { label: 'Coût correctif', val: `${coutCorr.toLocaleString('fr-FR')} €`, icon: <AlertTriangle className="w-5 h-5 text-orange-500" />, color: 'border-orange-100 bg-orange-50', sub: `${Math.round(coutCorr/totalTypes*100)}% du total` },
          { label: 'Durée moy / inter.', val: analytics.avgDuree ? `${analytics.avgDuree}h` : '—', icon: <Clock className="w-5 h-5 text-gray-500" />, color: 'border-gray-100 bg-gray-50', sub: 'durée réelle moyenne' },
        ].map(({ label, val, icon, color, sub }) => (
          <div key={label} className={`rounded-xl border p-4 ${color}`}>
            <div className="flex items-center justify-between mb-1">{icon}<span className="text-xs text-gray-500">{label}</span></div>
            <div className="text-xl font-bold text-gray-800 mt-1">{val}</div>
            {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution mensuelle du coût */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-500" /> Coût mensuel estimé
          </h3>
          <div className="flex items-end gap-1 h-32">
            {monthCosts.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full bg-blue-400 rounded-t-sm transition-all hover:bg-blue-500"
                  style={{ height: `${m.cout ? Math.max(4, (m.cout / maxCout) * 100) : 0}%` }}
                  title={`${MONTHS[i]} : ${m.cout.toLocaleString('fr-FR')} €`}
                />
                <span className="text-[9px] text-gray-400">{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Répartition préventif / correctif */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-teal-500" /> Répartition du coût
          </h3>
          <div className="space-y-3 mt-4">
            {[
              { label: 'Préventif', val: coutPrev, color: 'bg-teal-500', pct: Math.round(coutPrev/totalTypes*100) },
              { label: 'Correctif', val: coutCorr, color: 'bg-orange-400', pct: Math.round(coutCorr/totalTypes*100) },
            ].map(({ label, val, color, pct }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 font-medium">{label}</span>
                  <span className="font-bold text-gray-800">{val.toLocaleString('fr-FR')} € <span className="text-gray-400 font-normal text-xs">({pct}%)</span></span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 italic">
            * Estimation : nb interventions × durée moy ({analytics.avgDuree || 2}h) × {tauxHoraire} €/h
          </div>
        </div>
      </div>

      {/* Coût par service */}
      {serviceCosts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-500" /> Coût par service
          </h3>
          <div className="space-y-2.5">
            {serviceCosts.slice(0,8).map((s) => (
              <div key={s.service} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-24 truncate flex-shrink-0">{s.service}</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-400 rounded-full transition-all"
                    style={{ width: `${(s.cout / maxSvcCout) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-28 text-right flex-shrink-0">
                  {s.cout.toLocaleString('fr-FR')} €
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

  if (loading) return <div className="flex justify-center items-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-teal-500" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800">Panorama des Pièces & Consommables</h2>
          <p className="text-xs text-gray-400 mt-0.5">Analyse des pièces remplacées lors des interventions terminées</p>
        </div>
        <div className="flex gap-3">
          {[
            { val: totalPieces, label: 'pièces utilisées' },
            { val: ivWithPieces, label: 'interventions concernées' },
            { val: topPieces.length, label: 'références distinctes' },
          ].map(({ val, label }) => (
            <div key={label} className="text-center bg-white border border-gray-200 rounded-xl px-4 py-2">
              <div className="text-xl font-bold text-gray-800">{val}</div>
              <div className="text-[10px] text-gray-400">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {topPieces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Package className="w-12 h-12 mb-3 text-gray-200" />
          <p className="text-sm">Aucune pièce enregistrée dans les interventions</p>
          <p className="text-xs mt-1">Renseignez le champ "Pièces remplacées" lors de la clôture d'interventions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top pièces */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-teal-500" /> Top pièces utilisées
            </h3>
            <div className="space-y-2.5">
              {topPieces.map((p, i) => (
                <div key={p.nom} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    i < 3 ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'
                  }`}>{i+1}</span>
                  <span className="text-sm text-gray-700 flex-1 truncate capitalize">{p.nom}</span>
                  <div className="w-24 h-2.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                    <div className={`h-full rounded-full ${i < 3 ? 'bg-teal-500' : 'bg-gray-300'}`} style={{ width: `${(p.count/maxCount)*100}%` }} />
                  </div>
                  <span className="text-sm font-bold text-gray-600 w-8 text-right flex-shrink-0">{p.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Services les plus consommateurs */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-500" /> Services consommateurs
              </h3>
              <div className="space-y-2.5">
                {topServices.map(([svc, count]) => (
                  <div key={svc} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-20 truncate flex-shrink-0">{svc}</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-400 rounded-full" style={{ width: `${(count/maxSvc)*100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-8 text-right flex-shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fréquence mensuelle */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-500" /> Fréquence mensuelle
              </h3>
              <div className="flex items-end gap-1 h-16">
                {byMonth.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full bg-blue-300 rounded-t-sm hover:bg-blue-400 transition-colors"
                      style={{ height: `${m.count ? Math.max(4, (m.count/maxMonth)*100) : 0}%` }}
                      title={`${MONTHS[i]} : ${m.count}`}
                    />
                    <span className="text-[8px] text-gray-400">{MONTHS[i].substring(0,1)}</span>
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
  if (!analytics) return <div className="flex justify-center items-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-teal-500" /></div>;

  const defaillants = analytics.topDefaillants || [];
  const totalPannes = defaillants.reduce((s, d) => s + d.nbPannes, 0) || 1;

  // Build cumulative Pareto data
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

  // Find where cumulative crosses 80%
  const seuil80 = pareto.findIndex(p => p.pctCumul >= 80);
  const nb20pct = seuil80 >= 0 ? seuil80 + 1 : pareto.length;
  const pct20equip = pareto.length > 0 ? Math.round(nb20pct / pareto.length * 100) : 0;

  const maxPannes = Math.max(...pareto.map(p => p.nbPannes), 1);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Analyse 20/80 — Budget de Maintenance
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Les {pct20equip}% d'équipements les plus défaillants concentrent 80% des interventions correctives
        </p>
      </div>

      {pareto.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Zap className="w-12 h-12 mb-3 text-gray-200" />
          <p className="text-sm">Aucune intervention corrective enregistrée</p>
        </div>
      ) : (
        <>
          {/* Résumé Pareto */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Équipements critiques', val: nb20pct, sub: `représentent 80% des pannes`, color: 'bg-red-50 border-red-200 text-red-700' },
              { label: 'Total pannes correctives', val: totalPannes, sub: 'sur tous les équipements', color: 'bg-orange-50 border-orange-200 text-orange-700' },
              { label: 'Équipement le + défaillant', val: pareto[0]?.equipement?.nom || '—', sub: `${pareto[0]?.nbPannes || 0} pannes`, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
            ].map(({ label, val, sub, color }) => (
              <div key={label} className={`rounded-xl border p-4 ${color}`}>
                <div className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-2">{label}</div>
                <div className="text-xl font-bold truncate">{val}</div>
                <div className="text-xs opacity-70 mt-0.5">{sub}</div>
              </div>
            ))}
          </div>

          {/* Graphe Pareto */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-5 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-orange-500" /> Diagramme de Pareto
            </h3>
            <div className="relative">
              {/* Barre seuil 80% */}
              <div
                className="absolute top-0 bottom-8 border-l-2 border-dashed border-red-400 z-10"
                style={{ left: `${seuil80 >= 0 ? ((seuil80 + 0.5) / pareto.length) * 100 : 80}%` }}
              >
                <span className="absolute -top-5 -translate-x-1/2 text-[10px] text-red-500 font-bold whitespace-nowrap bg-white px-1">
                  seuil 80%
                </span>
              </div>
              <div className="flex items-end gap-1 h-40">
                {pareto.map((p, i) => {
                  const isAbove80 = i < nb20pct;
                  return (
                    <div key={p.equipement?.id || i} className="flex-1 flex flex-col items-center">
                      <div
                        className={`w-full rounded-t-sm transition-all ${isAbove80 ? 'bg-red-400 hover:bg-red-500' : 'bg-gray-300 hover:bg-gray-400'}`}
                        style={{ height: `${Math.max(4, (p.nbPannes / maxPannes) * 100)}%` }}
                        title={`${p.equipement?.nom}: ${p.nbPannes} pannes (${p.pctCumul}% cumulé)`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tableau détaillé */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Classement détaillé</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                    <th className="text-left px-4 py-2">Rang</th>
                    <th className="text-left px-4 py-2">Équipement</th>
                    <th className="text-left px-4 py-2">Service</th>
                    <th className="text-right px-4 py-2">Pannes</th>
                    <th className="text-right px-4 py-2">% Cumulé</th>
                    <th className="text-left px-4 py-2">Zone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pareto.map((p, i) => (
                    <tr key={i} className={`${i < nb20pct ? 'bg-red-50' : ''} hover:bg-gray-50`}>
                      <td className="px-4 py-2.5 font-bold text-gray-500">#{p.rank}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{p.equipement?.nom || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{p.equipement?.service || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-orange-600">{p.nbPannes}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-semibold ${p.pctCumul >= 80 ? 'text-red-500' : 'text-gray-600'}`}>{p.pctCumul}%</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {i < nb20pct ? (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">Critique</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Normal</span>
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

function ToolConsoBudgetPanel({ analytics }) {
  if (!analytics) return <div className="flex justify-center items-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-teal-500" /></div>;

  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  const totalTypes = (analytics.preventiveCount + analytics.correctiveCount) || 1;
  const maxMonth = Math.max(...analytics.byMonth.map(m => m.total), 1);
  const maxService = Math.max(...analytics.byService.map(s => s.total), 1);

  const COLORS = ['bg-teal-500','bg-blue-500','bg-purple-500','bg-orange-400','bg-pink-500','bg-indigo-500','bg-yellow-500','bg-red-400'];

  // Recommandations automatiques
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
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger:  'bg-red-50 border-red-200 text-red-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-purple-500" />
          Analyse de la Consommation du Budget
        </h2>
        <p className="text-xs text-gray-400 mt-1">Vue globale de l'efficacité de votre activité de maintenance</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Conformité', val: `${analytics.tauxConformite}%`, icon: <CheckCircle className="w-5 h-5" />, color: analytics.tauxConformite >= 80 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700' },
          { label: 'Interventions (année)', val: analytics.totalThisYear, icon: <Wrench className="w-5 h-5" />, color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'Part préventif', val: `${Math.round(analytics.preventiveCount/totalTypes*100)}%`, icon: <TrendingUp className="w-5 h-5" />, color: 'bg-teal-50 border-teal-200 text-teal-700' },
          { label: 'Retards', val: analytics.enRetard, icon: <AlertTriangle className="w-5 h-5" />, color: analytics.enRetard > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700' },
        ].map(({ label, val, icon, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${color}`}>
            <div className="flex items-center justify-between mb-2">{icon}<span className="text-xs font-semibold uppercase opacity-70">{label}</span></div>
            <div className="text-2xl font-bold">{val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition Prév / Corr */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Répartition des interventions</h3>
          <div className="space-y-3">
            {[
              { label: 'Préventif', count: analytics.preventiveCount, color: 'bg-teal-500' },
              { label: 'Correctif', count: analytics.correctiveCount, color: 'bg-orange-400' },
            ].map(({ label, count, color }) => {
              const pct = Math.round(count / totalTypes * 100);
              return (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-bold text-gray-800">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Terminées vs planifiées */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-600">Terminées / Planifiées</span>
              <span className="font-bold text-gray-800">{analytics.termineeThisYear} / {analytics.totalThisYear}</span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${analytics.tauxConformite >= 80 ? 'bg-green-500' : analytics.tauxConformite >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                style={{ width: `${analytics.tauxConformite}%` }}
              />
            </div>
          </div>
        </div>

        {/* Distribution par service */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Distribution par service</h3>
          {analytics.byService.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">Aucune donnée</div>
          ) : (
            <div className="space-y-2.5">
              {analytics.byService.slice(0,6).map((s, i) => (
                <div key={s.service} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${COLORS[i % COLORS.length]}`} />
                  <span className="text-sm text-gray-600 w-20 truncate flex-shrink-0">{s.service}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${COLORS[i % COLORS.length]} rounded-full`} style={{ width: `${(s.total/maxService)*100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 w-8 text-right">{s.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Évolution mensuelle */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-blue-500" /> Activité mensuelle (année en cours)
        </h3>
        <div className="flex items-end gap-1 h-28">
          {analytics.byMonth.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex flex-col items-stretch" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                {/* Terminées */}
                <div
                  className="w-full bg-teal-400 hover:bg-teal-500 transition-colors"
                  style={{ height: `${m.terminee ? Math.max(2, (m.terminee/maxMonth)*80) : 0}%` }}
                  title={`${MONTHS[i]}: ${m.terminee} terminées / ${m.total} total`}
                />
                {/* Non terminées */}
                <div
                  className="w-full bg-gray-200"
                  style={{ height: `${(m.total - m.terminee) ? Math.max(2, ((m.total-m.terminee)/maxMonth)*80) : 0}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-400">{MONTHS[i]}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-teal-400" />Terminées</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-200" />En attente</div>
        </div>
      </div>

      {/* Recommandations */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" /> Recommandations automatiques
        </h3>
        {recs.map((r, i) => (
          <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${REC_STYLE[r.type]}`}>
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

  const FACT_STATUT = { en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' }, payee: { label: 'Payée', color: 'bg-green-100 text-green-700' }, contestee: { label: 'Contestée', color: 'bg-red-100 text-red-700' } };

  const SectionHeader = ({ icon, title }) => (
    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">{icon}{title}</h3>
  );

  const renderLigneBudgetaire = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <SectionHeader icon={<DollarSign className="w-4 h-4 text-blue-500" />} title="Ajouter une ligne budgétaire" />
        <form onSubmit={addLigne} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Catégorie *</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white"
              value={formLigne.categorie} onChange={e => setFormLigne(f => ({ ...f, categorie: e.target.value }))}>
              <option value="">— Sélectionner —</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Montant alloué (€) *</label>
            <input type="number" min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
              placeholder="0" value={formLigne.montant} onChange={e => setFormLigne(f => ({ ...f, montant: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Description</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
              placeholder="Optionnel…" value={formLigne.description} onChange={e => setFormLigne(f => ({ ...f, description: e.target.value }))} />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
            Ajouter la ligne
          </button>
        </form>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">Lignes budgétaires {annee}</span>
          <span className="text-sm font-bold text-blue-600">{totalAlloue.toLocaleString('fr-FR')} €</span>
        </div>
        {lignes.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Aucune ligne budgétaire</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {lignes.map(l => (
              <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{l.categorie}</div>
                  {l.description && <div className="text-xs text-gray-400">{l.description}</div>}
                </div>
                <span className="font-bold text-blue-700">{parseFloat(l.montant).toLocaleString('fr-FR')} €</span>
                <button onClick={() => delLigne(l.id)} className="text-gray-300 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderAchats = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <SectionHeader icon={<ShoppingCart className="w-4 h-4 text-orange-500" />} title="Enregistrer un achat / dépense" />
        <form onSubmit={addAchat} className="space-y-3">
          {[
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'description', label: 'Description *', type: 'text', placeholder: 'Nature de la dépense…' },
            { key: 'fournisseur', label: 'Fournisseur', type: 'text', placeholder: 'Nom du fournisseur…' },
            { key: 'montant', label: 'Montant (€) *', type: 'number', placeholder: '0' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-gray-500 block mb-1">{label}</label>
              <input type={type} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                placeholder={placeholder} value={formAchat[key]} onChange={e => setFormAchat(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Catégorie</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white"
              value={formAchat.categorie} onChange={e => setFormAchat(f => ({ ...f, categorie: e.target.value }))}>
              <option value="">— Catégorie —</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
            Enregistrer la dépense
          </button>
        </form>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">Achats & Dépenses {annee}</span>
          <span className="text-sm font-bold text-orange-600">{totalAchats.toLocaleString('fr-FR')} €</span>
        </div>
        {achats.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Aucun achat enregistré</div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {[...achats].reverse().map(a => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className="text-xs text-gray-400 flex-shrink-0 w-20">{new Date(a.date).toLocaleDateString('fr-FR')}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{a.description}</div>
                  {a.fournisseur && <div className="text-xs text-gray-400">{a.fournisseur}</div>}
                </div>
                <span className="font-bold text-orange-600 flex-shrink-0">{parseFloat(a.montant).toLocaleString('fr-FR')} €</span>
                <button onClick={() => delAchat(a.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderFactures = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <SectionHeader icon={<Receipt className="w-4 h-4 text-purple-500" />} title="Enregistrer une facture" />
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
              <label className="text-xs font-semibold text-gray-500 block mb-1">{label}</label>
              <input type={type} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                placeholder={placeholder} value={formFact[key]}
                onChange={e => setFormFact(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Statut</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
              value={formFact.statut} onChange={e => setFormFact(f => ({ ...f, statut: e.target.value }))}>
              <option value="en_attente">En attente</option>
              <option value="payee">Payée</option>
              <option value="contestee">Contestée</option>
            </select>
          </div>
          <button type="submit" className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors">
            Enregistrer la facture
          </button>
        </form>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">Factures {annee}</span>
          <span className="text-sm font-bold text-purple-600">{totalFact.toLocaleString('fr-FR')} €</span>
        </div>
        {factures.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Aucune facture enregistrée</div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {[...factures].reverse().map(f => {
              const sc = FACT_STATUT[f.statut] || FACT_STATUT.en_attente;
              return (
                <div key={f.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{f.prestataire}</span>
                      {f.numero && <span className="text-xs text-gray-400">{f.numero}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{new Date(f.date_facture).toLocaleDateString('fr-FR')}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${sc.color}`}>{sc.label}</span>
                    </div>
                  </div>
                  <span className="font-bold text-purple-600 flex-shrink-0">{parseFloat(f.montant_ttc).toLocaleString('fr-FR')} €</span>
                  <button onClick={() => delFacture(f.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
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
    const barColor = pctConsomme > 90 ? 'bg-red-500' : pctConsomme > 70 ? 'bg-yellow-400' : 'bg-green-500';
    return (
      <div className="space-y-6">
        {/* Jauge budgétaire */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">État du Budget {annee}</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Budget alloué', val: totalAlloue, color: 'text-blue-600' },
              { label: 'Total dépenses', val: totalDepenses, color: 'text-red-600' },
              { label: 'Solde disponible', val: solde, color: solde >= 0 ? 'text-green-600' : 'text-red-600' },
            ].map(({ label, val, color }) => (
              <div key={label} className="text-center p-4 bg-gray-50 rounded-xl">
                <div className={`text-2xl font-bold ${color}`}>{val.toLocaleString('fr-FR')} €</div>
                <div className="text-xs text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-gray-500">Consommation</span>
            <span className={`font-bold ${pctConsomme > 90 ? 'text-red-600' : pctConsomme > 70 ? 'text-yellow-600' : 'text-green-600'}`}>{pctConsomme}%</span>
          </div>
          <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pctBar}%` }} />
          </div>
          {pctConsomme > 90 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-600 font-medium">
              <AlertTriangle className="w-4 h-4" /> Attention : budget presque épuisé
            </div>
          )}
        </div>

        {/* Détail par catégorie */}
        {lignes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <span className="text-sm font-bold text-gray-700">Détail par catégorie</span>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-xs text-gray-400 uppercase">
                <th className="text-left px-5 py-2">Catégorie</th>
                <th className="text-right px-5 py-2">Alloué</th>
                <th className="text-right px-5 py-2">Dépensé</th>
                <th className="text-right px-5 py-2">Reste</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {lignes.map(l => {
                  const spent = [...achats, ...factures.map(f => ({ ...f, montant: f.montant_ttc }))]
                    .filter(a => a.categorie === l.categorie)
                    .reduce((s, a) => s + (parseFloat(a.montant) || 0), 0);
                  const reste = parseFloat(l.montant) - spent;
                  return (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 font-medium text-gray-700">{l.categorie}</td>
                      <td className="px-5 py-2.5 text-right text-blue-600 font-semibold">{parseFloat(l.montant).toLocaleString('fr-FR')} €</td>
                      <td className="px-5 py-2.5 text-right text-orange-600">{spent.toLocaleString('fr-FR')} €</td>
                      <td className={`px-5 py-2.5 text-right font-bold ${reste < 0 ? 'text-red-600' : 'text-green-600'}`}>{reste.toLocaleString('fr-FR')} €</td>
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
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Année budgétaire</label>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
            value={annee} onChange={e => setAnnee(Number(e.target.value))}>
            {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="ml-auto text-xs text-gray-400 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
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
      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-5">
        <Wrench className="w-9 h-9 text-slate-300" />
      </div>
      <h3 className="text-lg font-semibold text-slate-500 mb-2">{label}</h3>
      <p className="text-sm text-slate-400 mb-4">Ce module est en cours de développement.</p>
      <span className="px-4 py-1.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
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
    <div className="text-white">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setCur(new Date(y, m - 1, 1))} className="p-1 hover:bg-slate-600 rounded transition-colors">
          <ChevronLeft className="w-3 h-3 text-slate-400" />
        </button>
        <span className="text-xs font-semibold text-slate-200">{MONTHS[m]} {y}</span>
        <button onClick={() => setCur(new Date(y, m + 1, 1))} className="p-1 hover:bg-slate-600 rounded transition-colors">
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center gap-0.5">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-slate-500 text-[9px] font-semibold py-0.5">{d}</div>
        ))}
        {cells.map((day, i) => (
          <div key={i} className={`text-[10px] py-0.5 rounded leading-4 ${
            !day ? '' :
            isToday(day) ? 'bg-teal-500 text-white font-bold' :
            'text-slate-400 hover:bg-slate-600 hover:text-white cursor-pointer'
          }`}>
            {day ?? ''}
          </div>
        ))}
      </div>
      <div className="mt-2 pt-1.5 border-t border-slate-700 text-center">
        <span className="text-[9px] text-slate-500">
          Today: {today.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

// ─── SIDEBAR MODULE ───────────────────────────────────────────────────────────

function SidebarModule({ module, activeSection, onSelect, expanded, onToggle }) {
  return (
    <div className="border-b border-slate-700/60">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-700/50 transition-colors group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-teal-400 text-xs font-bold flex-shrink-0">
            {expanded ? '«' : '»'}
          </span>
          <span className="text-slate-300 text-[11px] font-semibold uppercase tracking-wide truncate">
            {module.label}
          </span>
        </div>
        {expanded
          ? <ChevronUp className="w-3 h-3 text-slate-500 flex-shrink-0 ml-1" />
          : <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0 ml-1" />
        }
      </button>

      {expanded && (
        <div className="px-2 pb-2.5 grid grid-cols-2 gap-1.5">
          {module.items.map(item => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => !item.wip && onSelect(item.id)}
                title={item.wip ? 'En cours de développement' : item.label}
                className={`px-2 py-2 rounded text-[11px] font-medium text-center leading-tight transition-all ${
                  isActive
                    ? 'bg-teal-500 text-white shadow-md'
                    : item.wip
                    ? 'bg-slate-700/40 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                }`}
              >
                {item.label}
                {item.wip && <span className="block text-[8px] text-slate-600 mt-0.5 leading-none">bientôt</span>}
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
    <div className="flex flex-col bg-slate-900" style={{ height: 'calc(100vh - 4rem)' }}>

      {/* ── BARRE SUPÉRIEURE ──────────────────────────────────────────────── */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between flex-shrink-0 gap-4">

        {/* Logo + titre */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="p-1.5 bg-teal-500 rounded">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <div className="leading-none">
            <div className="text-white font-bold text-sm">GMAO</div>
            <div className="text-slate-500 text-[9px] uppercase tracking-wider">Maintenance Assistée</div>
          </div>
        </div>

        {/* Séparateur */}
        <div className="h-8 w-px bg-slate-700 flex-shrink-0" />

        {/* Outils d'analyse */}
        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
          <span className="text-slate-600 text-[9px] uppercase tracking-widest font-semibold flex-shrink-0 mr-1">
            Outils d'analyse
          </span>
          {TOOLBAR_ITEMS.map(tool => (
            <button
              key={tool.id}
              onClick={() => !tool.wip && setActiveSection(tool.id)}
              title={tool.label}
              className={`flex-shrink-0 px-3 py-1.5 rounded text-[11px] font-semibold transition-all whitespace-nowrap ${
                activeSection === tool.id
                  ? 'bg-teal-500 text-white shadow-md'
                  : tool.wip
                  ? 'bg-slate-700/50 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
              }`}
            >
              {tool.shortLabel}
              {tool.wip && <span className="ml-1 text-[8px] opacity-50">●</span>}
            </button>
          ))}
        </div>

        {/* Actualiser */}
        <button
          onClick={() => { loadData(); loadPending(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs font-medium transition-colors flex-shrink-0"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* ── BREADCRUMB ────────────────────────────────────────────────────── */}
      <div className="bg-slate-800/60 border-b border-slate-700/50 px-4 py-1 flex items-center gap-1.5 flex-shrink-0">
        <span className="text-slate-600 text-[10px]">GMAO</span>
        <ChevronRight className="w-3 h-3 text-slate-700" />
        <span className="text-slate-500 text-[10px] truncate">{bcModule}</span>
        {bcItem && (
          <>
            <ChevronRight className="w-3 h-3 text-slate-700" />
            <span className="text-teal-400 text-[10px] font-semibold">{bcItem}</span>
          </>
        )}
        {error && (
          <span className="ml-auto text-red-400 text-[10px] flex items-center gap-1 flex-shrink-0">
            <AlertCircle className="w-3 h-3" />{error}
          </span>
        )}
      </div>

      {/* ── LAYOUT PRINCIPAL 3 COLONNES ───────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* SIDEBAR GAUCHE */}
        <div className="w-60 bg-slate-800 border-r border-slate-700 overflow-y-auto flex-shrink-0">
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
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          {renderContent()}
        </div>

        {/* PANNEAU DROIT */}
        <div className="w-60 bg-slate-800 border-l border-slate-700 flex-shrink-0 flex flex-col overflow-hidden">

          {/* Mini Calendrier */}
          <div className="p-3 border-b border-slate-700 flex-shrink-0">
            <MiniCalendar />
          </div>

          {/* Interventions signalées */}
          <div className="flex-1 flex flex-col p-3 overflow-hidden">
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide mb-2">
              Intervention signalé :
            </p>
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={loadPending}
                className="px-3 py-1 bg-teal-500 hover:bg-teal-400 text-white text-[10px] font-bold rounded transition-colors"
              >
                Actualiser
              </button>
              <span className="text-slate-500 text-[10px]">
                Total : <span className="text-white font-bold">{pendingInterventions.length}</span>
              </span>
            </div>

            {/* En-têtes colonne */}
            <div className="grid grid-cols-3 gap-1 pb-1 border-b border-slate-700 mb-1">
              <span className="text-slate-600 text-[9px] font-semibold uppercase">Date</span>
              <span className="text-slate-600 text-[9px] font-semibold uppercase">Heure</span>
              <span className="text-slate-600 text-[9px] font-semibold uppercase">Equipement</span>
            </div>

            {/* Liste interventions */}
            <div className="flex-1 overflow-y-auto space-y-0">
              {pendingLoading ? (
                <div className="flex justify-center py-6">
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
                </div>
              ) : pendingInterventions.length === 0 ? (
                <div className="text-center py-8 text-slate-700 text-[10px]">
                  <CheckCircle className="w-5 h-5 mx-auto mb-1 text-slate-700" />
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
                      className="grid grid-cols-3 gap-1 py-1 border-b border-slate-700/40 hover:bg-slate-700/30 cursor-pointer transition-colors"
                    >
                      <span className="text-slate-400 text-[9px]">{dateStr}</span>
                      <span className="text-slate-400 text-[9px]">{heureStr}</span>
                      <span className="text-slate-500 text-[9px] truncate" title={eqLabel}>{eqLabel}</span>
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
