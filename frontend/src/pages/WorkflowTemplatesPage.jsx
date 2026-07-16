import React, { useState, useEffect, useRef } from 'react';
import { workflowTemplatesAPI, usersAPI } from '../services/api';
import {
  Plus, Trash2, Edit3, Save, X, Loader, Users, LayoutGrid,
  Search, ChevronUp, ChevronDown, ArrowDown, UserCheck, Shield,
  Clock, AlertCircle, Copy, ToggleLeft, ToggleRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'admin',            label: 'Administrateur',        color: '#ef4444' },
  { value: 'superadmin',       label: 'Super Administrateur',  color: '#dc2626' },
  { value: 'validator',        label: 'Validateur',            color: '#7c3aed' },
  { value: 'director',         label: 'Directeur',             color: '#2563eb' },
  { value: 'chef_de_service',  label: 'Chef de service',       color: '#d97706' },
  { value: 'caissier',         label: 'Caissier',              color: '#059669' },
  { value: 'user',             label: 'Utilisateur standard',  color: '#6b7280' },
];

// Templates codés en dur (frontend/src/pages/CreateFromTemplate.jsx) + catégories
// générées par d'autres modules — liste fermée pour fiabiliser le lien avec
// « Modèles workflow » (fini les fautes de frappe dans le champ catégories).
const HARDCODED_CATEGORIES = [
  'Demande de permission',
  'Demande de besoin',
  'Pièce de caisse',
  'Demande de travaux',
  'Ordre de mission',
  'Demande de permutation',
  'Bon de sortie',
  'Bon de commande',
  'Bon de commande interne',
  "Certificat d'aptitude",
  'Planning Opératoire',
  'Attestation de départ en congé annuel',
  "Demande d'explication",
  "Fiche de suivi d'équipements",
];

const REJECT_OPTIONS = [
  { value: 'back_to_sender',  label: 'Retourner à l\'émetteur' },
  { value: 'previous_step',   label: 'Revenir à l\'étape précédente' },
  { value: 'reject',          label: 'Rejeter définitivement' },
];

const s = {
  input: {
    width: '100%', height: 34, padding: '0 10px', boxSizing: 'border-box',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
    background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none',
  },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' },
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 34, padding: '0 14px', borderRadius: 'var(--radius-2)',
    background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
  },
  btnOutline: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 34, padding: '0 14px', borderRadius: 'var(--radius-2)',
    background: 'transparent', color: 'var(--fg-muted)', fontSize: 13, border: '1px solid var(--border)', cursor: 'pointer',
  },
  iconBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 'var(--radius-2)',
    border: '1px solid var(--border)', background: 'transparent',
    color: 'var(--fg-muted)', cursor: 'pointer',
  },
  select: {
    width: '100%', height: 34, padding: '0 8px', boxSizing: 'border-box',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
    background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none', cursor: 'pointer',
  },
};

function makeStep(index) {
  return {
    _id: Math.random().toString(36).slice(2),
    name: `Étape ${index + 1}`,
    validatorType: 'role',
    role: 'validator',
    userId: null,
    userLabel: '',
    deadlineDays: '',
    onReject: 'back_to_sender',
  };
}

function RoleTag({ role }) {
  const r = ROLES.find(x => x.value === role);
  if (!r) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: r.color + '18', color: r.color,
    }}>
      <Shield size={10} /> {r.label}
    </span>
  );
}

function StepCard({ step, index, total, onChange, onMove, onDelete, availableUsers, loadingUsers }) {
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

  const filtered = availableUsers.filter(u => {
    const t = search.toLowerCase();
    return `${u.firstName} ${u.lastName}`.toLowerCase().includes(t) || u.role?.toLowerCase().includes(t);
  });

  const roleColor = ROLES.find(r => r.value === step.role)?.color || 'var(--brand)';

  return (
    <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
      {/* Step number + connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'var(--brand)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13, zIndex: 1,
        }}>{index + 1}</div>
        {index < total - 1 && (
          <div style={{ flex: 1, width: 2, background: 'var(--border)', margin: '4px 0', minHeight: 16 }} />
        )}
      </div>

      {/* Card */}
      <div style={{
        flex: 1, marginLeft: 12, marginBottom: index < total - 1 ? 12 : 0,
        border: '1px solid var(--border)', borderRadius: 'var(--radius-3)',
        background: 'var(--surface)', overflow: 'hidden',
      }}>
        {/* Card header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)',
        }}>
          <input
            value={step.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="Nom de l'étape…"
            style={{
              border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600,
              color: 'var(--fg)', outline: 'none', flex: 1,
            }}
          />
          <div style={{ display: 'flex', gap: 2, marginLeft: 8 }}>
            <button onClick={() => onMove('up')} disabled={index === 0} title="Monter" style={{ ...s.iconBtn, opacity: index === 0 ? 0.3 : 1 }}><ChevronUp size={13} /></button>
            <button onClick={() => onMove('down')} disabled={index === total - 1} title="Descendre" style={{ ...s.iconBtn, opacity: index === total - 1 ? 0.3 : 1 }}><ChevronDown size={13} /></button>
            <button onClick={onDelete} title="Supprimer" style={{ ...s.iconBtn, color: 'var(--danger)', borderColor: 'var(--danger)' }}><Trash2 size={13} /></button>
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Validator type toggle */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => onChange({ validatorType: 'role', userId: null, userLabel: '' })}
              style={{
                flex: 1, height: 32, borderRadius: 'var(--radius-2)', border: '1px solid',
                borderColor: step.validatorType === 'role' ? 'var(--brand)' : 'var(--border)',
                background: step.validatorType === 'role' ? 'var(--brand-soft)' : 'transparent',
                color: step.validatorType === 'role' ? 'var(--brand)' : 'var(--fg-muted)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <Shield size={12} /> Par rôle
            </button>
            <button
              onClick={() => onChange({ validatorType: 'user', role: '' })}
              style={{
                flex: 1, height: 32, borderRadius: 'var(--radius-2)', border: '1px solid',
                borderColor: step.validatorType === 'user' ? 'var(--brand)' : 'var(--border)',
                background: step.validatorType === 'user' ? 'var(--brand-soft)' : 'transparent',
                color: step.validatorType === 'user' ? 'var(--brand)' : 'var(--fg-muted)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <UserCheck size={12} /> Personne précise
            </button>
          </div>

          {/* Role selector */}
          {step.validatorType === 'role' && (
            <div>
              <label style={s.label}>Rôle du validateur</label>
              <select value={step.role} onChange={e => onChange({ role: e.target.value })} style={s.select}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              {step.role && <div style={{ marginTop: 6 }}><RoleTag role={step.role} /></div>}
            </div>
          )}

          {/* Person selector */}
          {step.validatorType === 'user' && (
            <div>
              <label style={s.label}>Personne spécifique</label>
              {step.userLabel ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 10px', borderRadius: 'var(--radius-2)',
                  background: 'var(--brand-soft)', border: '1px solid var(--brand)',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--brand)' }}>
                    <UserCheck size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                    {step.userLabel}
                  </span>
                  <button onClick={() => onChange({ userId: null, userLabel: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}>
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={e => { setSearch(e.target.value); setShowUserSearch(true); }}
                    onFocus={() => setShowUserSearch(true)}
                    placeholder="Rechercher par nom ou rôle…"
                    style={{ ...s.input, paddingLeft: 28 }}
                  />
                  {showUserSearch && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-2)', boxShadow: 'var(--shadow-2)',
                      maxHeight: 160, overflowY: 'auto', marginTop: 2,
                    }}>
                      {loadingUsers ? (
                        <div style={{ padding: 12, textAlign: 'center' }}><Loader size={14} className="animate-spin" color="var(--brand)" /></div>
                      ) : filtered.length === 0 ? (
                        <div style={{ padding: 10, fontSize: 12, color: 'var(--fg-muted)', textAlign: 'center' }}>Aucun utilisateur trouvé</div>
                      ) : filtered.map(u => (
                        <button
                          key={u.id}
                          onMouseDown={() => {
                            onChange({ userId: u.id, userLabel: `${u.firstName} ${u.lastName}` });
                            setShowUserSearch(false);
                            setSearch('');
                          }}
                          style={{
                            width: '100%', textAlign: 'left', padding: '7px 10px',
                            border: 'none', borderBottom: '1px solid var(--border)',
                            background: 'transparent', cursor: 'pointer', fontSize: 13,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{u.firstName} {u.lastName}</span>
                          <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{ROLES.find(r => r.value === u.role)?.label || u.role}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Deadline + On reject — row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={s.label}><Clock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />Délai (jours)</label>
              <input
                type="number" min="1" max="365"
                value={step.deadlineDays}
                onChange={e => onChange({ deadlineDays: e.target.value })}
                placeholder="Aucun"
                style={{ ...s.input, width: '100%' }}
              />
            </div>
            <div>
              <label style={s.label}><AlertCircle size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />Si rejeté</label>
              <select value={step.onReject} onChange={e => onChange({ onReject: e.target.value })} style={s.select}>
                {REJECT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkflowTemplatesPage() {
  const [templates, setTemplates]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [saving, setSaving]         = useState(false);

  const [formName, setFormName]         = useState('');
  const [formDesc, setFormDesc]         = useState('');
  const [formSteps, setFormSteps]       = useState([makeStep(0)]);
  const [formCategories, setFormCategories] = useState([]);

  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers]     = useState(false);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await workflowTemplatesAPI.getAll();
      setTemplates(res.data?.data || []);
    } catch { toast.error('Erreur chargement des modèles'); }
    finally { setLoading(false); }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await usersAPI.getAll();
      setAvailableUsers(res.data?.users || []);
    } catch {}
    finally { setLoadingUsers(false); }
  };

  const stepsToValidators = (steps) => steps.map((step, i) => ({
    step: i + 1,
    name: step.name,
    validatorType: step.validatorType,
    role: step.validatorType === 'role' ? step.role : null,
    userId: step.validatorType === 'user' ? step.userId : null,
    label: step.validatorType === 'role'
      ? (ROLES.find(r => r.value === step.role)?.label || step.role)
      : step.userLabel,
    deadlineDays: step.deadlineDays ? parseInt(step.deadlineDays) : null,
    onReject: step.onReject,
  }));

  const validatorsToSteps = (validators) => (validators || []).map((v, i) => ({
    _id: Math.random().toString(36).slice(2),
    name: v.name || `Étape ${i + 1}`,
    validatorType: v.validatorType || (v.userId ? 'user' : 'role'),
    role: v.role || 'validator',
    userId: v.userId || null,
    userLabel: v.userId ? (v.user ? `${v.user.firstName} ${v.user.lastName}` : v.label) : '',
    deadlineDays: v.deadlineDays ? String(v.deadlineDays) : '',
    onReject: v.onReject || 'back_to_sender',
  }));

  const openCreate = () => {
    setEditingId(null); setFormName(''); setFormDesc('');
    setFormSteps([makeStep(0)]); setFormCategories([]);
    setShowForm(true); loadUsers();
  };

  const openEdit = (tpl) => {
    setEditingId(tpl.id); setFormName(tpl.name); setFormDesc(tpl.description || '');
    setFormSteps(validatorsToSteps(tpl.validators));
    setFormCategories(tpl.categories || []);
    setShowForm(true); loadUsers();
  };

  const duplicateTemplate = async (tpl) => {
    try {
      await workflowTemplatesAPI.create({
        name: `${tpl.name} (copie)`,
        description: tpl.description,
        categories: tpl.categories,
        validators: tpl.validators,
      });
      toast.success('Modèle dupliqué');
      loadTemplates();
    } catch { toast.error('Erreur duplication'); }
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('Le nom est requis'); return; }
    if (formSteps.length === 0) { toast.error('Ajoutez au moins une étape'); return; }
    for (const step of formSteps) {
      if (step.validatorType === 'user' && !step.userId) {
        toast.error(`L'étape "${step.name}" nécessite une personne sélectionnée`); return;
      }
    }
    try {
      setSaving(true);
      const payload = {
        name: formName.trim(),
        description: formDesc.trim() || null,
        categories: formCategories.length ? formCategories : null,
        validators: stepsToValidators(formSteps),
      };
      if (editingId) { await workflowTemplatesAPI.update(editingId, payload); toast.success('Modèle mis à jour'); }
      else           { await workflowTemplatesAPI.create(payload);            toast.success('Modèle créé'); }
      setShowForm(false); loadTemplates();
    } catch { toast.error('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Supprimer le modèle "${name}" ?`)) return;
    try { await workflowTemplatesAPI.delete(id); toast.success('Supprimé'); loadTemplates(); }
    catch { toast.error('Erreur suppression'); }
  };

  const updateStep = (index, patch) => {
    setFormSteps(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
  };

  const moveStep = (index, direction) => {
    setFormSteps(prev => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addStep = () => setFormSteps(prev => [...prev, makeStep(prev.length)]);
  const removeStep = (index) => setFormSteps(prev => prev.filter((_, i) => i !== index));

  const addCategory = (value) => {
    if (value && !formCategories.includes(value)) setFormCategories(prev => [...prev, value]);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Loader size={24} color="var(--fg-muted)" className="animate-spin" />
    </div>
  );

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 40px' }} className="animate-pageFade">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, paddingTop: 4 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', margin: 0, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LayoutGrid size={20} color="var(--brand)" /> Modèles de workflow
          </h1>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 3 }}>
            Circuits de validation configurables — {templates.length} modèle{templates.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button onClick={openCreate} style={s.btnPrimary}>
          <Plus size={14} /> Nouveau modèle
        </button>
      </div>

      {/* Empty state */}
      {templates.length === 0 && !showForm && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '72px 0' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--brand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <LayoutGrid size={28} color="var(--brand)" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>Aucun modèle de workflow</div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20, maxWidth: 360 }}>
            Créez des circuits de validation adaptés à vos processus. Chaque modèle définit les étapes, les validateurs et les délais.
          </div>
          <button onClick={openCreate} style={s.btnPrimary}><Plus size={14} /> Créer le premier modèle</button>
        </div>
      )}

      {/* Template cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {templates.map(tpl => {
          const steps = tpl.validators || [];
          return (
            <div key={tpl.id} className="ged-card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>{tpl.name}</div>
                  {tpl.description && (
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 8 }}>{tpl.description}</div>
                  )}

                  {/* Steps visual */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: tpl.categories?.length ? 8 : 0 }}>
                    {steps.map((v, i) => {
                      const isRole = v.validatorType === 'role' || (!v.userId && v.validatorType !== 'user');
                      const roleData = ROLES.find(r => r.value === v.role);
                      return (
                        <React.Fragment key={i}>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                            background: isRole ? (roleData?.color || 'var(--brand)') + '18' : 'var(--brand-soft)',
                            color: isRole ? (roleData?.color || 'var(--brand)') : 'var(--brand)',
                            border: `1px solid ${isRole ? (roleData?.color || 'var(--brand)') + '40' : 'var(--brand)'}`,
                          }}>
                            <span style={{
                              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                              background: isRole ? (roleData?.color || 'var(--brand)') : 'var(--brand)',
                              color: '#fff', fontSize: 9, fontWeight: 800,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>{i + 1}</span>
                            {isRole ? <Shield size={10} /> : <UserCheck size={10} />}
                            {v.name || (isRole ? roleData?.label || v.role : v.label)}
                            {v.deadlineDays && <span style={{ opacity: 0.7 }}>· {v.deadlineDays}j</span>}
                          </div>
                          {i < steps.length - 1 && (
                            <ArrowDown size={12} color="var(--fg-subtle)" style={{ transform: 'rotate(-90deg)' }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Categories */}
                  {tpl.categories?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {tpl.categories.map((c, i) => (
                        <span key={i} style={{
                          fontSize: 11, padding: '1px 7px', borderRadius: 'var(--radius-2)',
                          background: 'var(--surface-2)', color: 'var(--fg-muted)', border: '1px solid var(--border)',
                        }}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => duplicateTemplate(tpl)} title="Dupliquer" style={s.iconBtn}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}>
                    <Copy size={13} />
                  </button>
                  <button onClick={() => openEdit(tpl)} title="Modifier" style={s.iconBtn}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}>
                    <Edit3 size={13} />
                  </button>
                  <button onClick={() => handleDelete(tpl.id, tpl.name)} title="Supprimer" style={s.iconBtn}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Builder modal ─────────────────────────────────────────────────────── */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16,
        }}>
          <div className="animate-fadeIn" style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)',
            width: '100%', maxWidth: 640, maxHeight: '92vh',
            display: 'flex', flexDirection: 'column',
          }}>

            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>
                  {editingId ? 'Modifier le modèle' : 'Nouveau modèle de workflow'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>
                  Définissez les étapes, les validateurs et les délais
                </div>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex' }}>
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '18px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Name + Description */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={s.label}>Nom du modèle *</label>
                  <input style={s.input} value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex : Validation RH, Circuit direction…" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={s.label}>Description</label>
                  <input style={s.input} value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Brève description du circuit…" />
                </div>
              </div>

              {/* Categories */}
              <div>
                <label style={s.label}>Catégories de documents concernés</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: formCategories.length ? 8 : 0 }}>
                  <select
                    value=""
                    onChange={e => { if (e.target.value) addCategory(e.target.value); }}
                    style={{ ...s.input, flex: 1 }}
                  >
                    <option value="">Sélectionner un type de document…</option>
                    {HARDCODED_CATEGORIES.filter(c => !formCategories.includes(c)).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                {formCategories.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {formCategories.map((c, i) => (
                      <span key={i} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 999, fontSize: 11,
                        background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--fg-muted)',
                      }}>
                        {c}
                        <button onClick={() => setFormCategories(prev => prev.filter((_, j) => j !== i))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', padding: 0, display: 'flex' }}>
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 4 }}>
                  Laisser vide = applicable à tous les types de documents
                </div>
              </div>

              {/* Steps builder */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <label style={{ ...s.label, margin: 0 }}>Étapes du circuit ({formSteps.length})</label>
                  <button onClick={addStep} style={{ ...s.btnOutline, height: 28, fontSize: 12 }}>
                    <Plus size={12} /> Ajouter une étape
                  </button>
                </div>

                <div>
                  {formSteps.map((step, i) => (
                    <StepCard
                      key={step._id}
                      step={step}
                      index={i}
                      total={formSteps.length}
                      onChange={(patch) => updateStep(i, patch)}
                      onMove={(dir) => moveStep(i, dir)}
                      onDelete={() => removeStep(i)}
                      availableUsers={availableUsers}
                      loadingUsers={loadingUsers}
                    />
                  ))}
                </div>

                {formSteps.length === 0 && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                    padding: '32px 16px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-3)',
                  }}>
                    <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 10 }}>Aucune étape définie</div>
                    <button onClick={addStep} style={s.btnPrimary}><Plus size={13} /> Ajouter la première étape</button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 18px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <button onClick={() => setShowForm(false)} style={s.btnOutline}>Annuler</button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim() || formSteps.length === 0}
                style={{ ...s.btnPrimary, opacity: (saving || !formName.trim() || formSteps.length === 0) ? 0.5 : 1 }}
              >
                {saving ? <Loader size={13} className="animate-spin" /> : <Save size={13} />}
                {editingId ? 'Mettre à jour' : 'Créer le modèle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
