// frontend/src/components/Upload.jsx — Wizard 3 étapes
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsAPI, servicesAPI, templatePermissionsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Upload as UploadIcon, CheckCircle, X, Sparkles, Smartphone,
  ArrowRight, ArrowLeft, FileText, Loader,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Constants ────────────────────────────────────────────────────────────────
const DOC_CATEGORIES = [
  'Demande de permission', 'Pièce de caisse', 'Demande de travaux',
  'Ordre de mission', 'Demande de permutation', 'Bon de sortie',
  'Bon de commande', 'Bon de commande interne', "Certificat d'aptitude",
  'Fiche de suivi équipements', "Demande d'explication", 'Autre',
];

const FILE_TYPES = ['PDF','DOCX','XLSX','PNG','JPG'];

// Simulate OCR — detect type from filename
function simulateOCR(filename, fileSize) {
  const lower = filename.toLowerCase();
  let type = 'Autre';
  if (lower.includes('permission'))     type = 'Demande de permission';
  else if (lower.includes('mission'))   type = 'Ordre de mission';
  else if (lower.includes('commande'))  type = 'Bon de commande';
  else if (lower.includes('sortie'))    type = 'Bon de sortie';
  else if (lower.includes('caisse'))    type = 'Pièce de caisse';
  else if (lower.includes('travaux'))   type = 'Demande de travaux';
  else if (lower.includes('permutation')) type = 'Demande de permutation';
  const pages = Math.max(1, Math.round(fileSize / (80 * 1024)));
  const lang  = 'français';
  const signatures = type !== 'Autre' ? 1 : 0;
  return { type, pages, lang, signatures };
}

function autoTitle(filename, type) {
  const base = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
  return base.length > 6 ? base : type;
}

function autoRef(type) {
  const PREFIX = {
    'Demande de permission': 'PERM',
    'Ordre de mission': 'OM',
    'Bon de commande': 'BC',
    'Bon de sortie': 'BS',
    'Pièce de caisse': 'PC',
    'Demande de travaux': 'DT',
    'Demande de permutation': 'PERM',
    'Autre': 'DOC',
  };
  const pre = PREFIX[type] || 'DOC';
  const now = new Date();
  return `${pre}-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}${String(Math.floor(Math.random()*9000)+1000)}`;
}

// ── StepBar ───────────────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Fichier', 'Métadonnées', 'Workflow'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {steps.map((label, i) => {
        const idx  = i + 1;
        const done = step > idx;
        const active = step === idx;
        return (
          <React.Fragment key={idx}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? 'var(--success)' : active ? 'var(--brand)' : 'var(--surface-3)',
                color: (done || active) ? '#fff' : 'var(--fg-muted)',
                fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'background .2s',
              }}>
                {done ? <CheckCircle size={16} /> : idx}
              </div>
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--fg)' : done ? 'var(--success)' : 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? 'var(--success)' : 'var(--border)', margin: '0 12px', minWidth: 32, transition: 'background .3s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── PdfBadge ──────────────────────────────────────────────────────────────────
function PdfBadge({ ext }) {
  const colors = { pdf: '#e74c3c', docx: '#2980b9', xlsx: '#27ae60', png: '#8e44ad', jpg: '#e67e22' };
  const c = colors[(ext||'pdf').toLowerCase()] || '#888';
  return (
    <div style={{ width: 42, height: 50, borderRadius: 6, background: c+'22', border: `1.5px solid ${c}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 9, fontWeight: 800, color: c, letterSpacing: '0.5px' }}>{(ext||'PDF').toUpperCase()}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const Upload = () => {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const fileInputRef = useRef();

  const [step, setStep]       = useState(1);
  const [drag, setDrag]       = useState(false);
  const [file, setFile]       = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis]   = useState(null); // { type, pages, lang, signatures }

  // Step 2
  const [title, setTitle]     = useState('');
  const [category, setCategory] = useState('');
  const [service, setService] = useState('');
  const [reference, setReference] = useState('');
  const [tags, setTags]       = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [services, setServices] = useState([]);
  const [myTemplates, setMyTemplates] = useState([]);
  const [visibility, setVisibility] = useState('personal');

  // Step 3
  const [workflow, setWorkflow] = useState('2levels');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    servicesAPI.getAll().then(r => setServices(r.data?.data || r.data || [])).catch(() => {});
    templatePermissionsAPI.getMyTemplates().then(r => setMyTemplates(r.data?.data || [])).catch(() => {});
  }, []);

  // Pré-remplit la visibilité avec le défaut de la catégorie choisie (l'utilisateur peut l'ajuster ensuite).
  useEffect(() => {
    const tpl = myTemplates.find(t => t.templateName === category);
    setVisibility(tpl?.defaultVisibility === 'service' ? 'service' : 'personal');
  }, [category, myTemplates]);

  const formatSize = bytes => {
    if (!bytes) return '';
    const mb = bytes / (1024*1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes/1024)} KB`;
  };

  const fileExt = file ? file.name.split('.').pop() : '';

  // ── File accept ─────────────────────────────────────────────────────────────
  const acceptFile = f => {
    if (!f) return;
    if (f.size > 10*1024*1024) { toast.error('Le fichier dépasse 10 MB.'); return; }
    setFile(f);
    setAnalyzing(true);
    setAnalysis(null);
    setTimeout(() => {
      const res = simulateOCR(f.name, f.size);
      setAnalysis(res);
      setAnalyzing(false);
      setCategory(res.type);
      setTitle(autoTitle(f.name, res.type));
      setReference(autoRef(res.type));
      setTags(res.type !== 'Autre' ? [res.type.toLowerCase().split(' ')[0], 'RH'] : []);
      toast.success('Document analysé. Type et workflow détectés.');
    }, 1800);
  };

  const handleDrag = e => { e.preventDefault(); e.stopPropagation(); setDrag(e.type !== 'dragleave'); };
  const handleDrop = e => { e.preventDefault(); e.stopPropagation(); setDrag(false); acceptFile(e.dataTransfer.files?.[0]); };

  // ── Tags ────────────────────────────────────────────────────────────────────
  const addTag = e => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) setTags(t => [...t, tagInput.trim()]);
      setTagInput('');
    }
  };
  const removeTag = t => setTags(ts => ts.filter(x => x !== t));

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!file || !title || !category) { toast.error('Fichier, titre et type requis.'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title);
      fd.append('category', category);
      if (service)   fd.append('service', service);
      if (reference) fd.append('reference', reference);
      fd.append('visibility', visibility);
      if (tags.length) fd.append('tags', JSON.stringify(tags));
      await documentsAPI.upload(fd);
      toast.success('Document créé et envoyé en validation !');
      navigate('/documents');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'upload');
    } finally {
      setSubmitting(false);
    }
  };

  const WORKFLOW_OPTIONS = [
    { id: '2levels', label: 'Validation 2 niveaux', sub: 'Chef de service → Direction → Signature' },
    { id: 'simple',  label: 'Validation simple',   sub: 'Un seul validateur puis signature' },
    { id: 'none',    label: 'Aucun (archivage direct)', sub: 'Document archivé sans circuit' },
  ];

  const circuitSteps = workflow === '2levels'
    ? ['Soumission', 'Chef de service', 'Direction', 'Signature']
    : workflow === 'simple'
    ? ['Soumission', 'Validateur', 'Signature']
    : ['Soumission', 'Archivage direct'];

  const iStep1Ok = file && analysis && !analyzing;
  const iStep2Ok = title && category;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 32px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--fg-muted)' }}>
          <span style={{ cursor: 'pointer', color: 'var(--brand)' }} onClick={() => navigate('/documents')}>Documents</span>
          <span>›</span>
          <span style={{ color: 'var(--fg)', fontWeight: 600 }}>Nouvel upload</span>
        </div>
        <button onClick={() => navigate('/documents')} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--fg-muted)', cursor: 'pointer' }}>
          Quitter
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 600 }}>

          {/* Title */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Nouveau document</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--fg)', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Ajouter un document à la GED</h1>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>L'OCR détecte le type, extrait les zones de signature et suggère un workflow.</p>
          </div>

          {/* Step bar */}
          <StepBar step={step} />

          {/* ── STEP 1 ───────────────────────────────────────────────── */}
          {step === 1 && (
            <>
              {!file ? (
                /* Drop zone */
                <div
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${drag ? 'var(--brand)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-4)', padding: '56px 24px', textAlign: 'center',
                    background: drag ? 'var(--brand-soft)' : 'var(--surface)',
                    cursor: 'pointer', transition: 'border-color .15s, background .15s', marginBottom: 14,
                  }}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => acceptFile(e.target.files[0])} />
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--brand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <UploadIcon size={22} color="var(--brand)" />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>Glissez un document ici</div>
                  <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16 }}>
                    ou <span style={{ color: 'var(--brand)', fontWeight: 600, cursor: 'pointer' }}>parcourir</span> · PDF, Word, Excel, Image
                  </div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {FILE_TYPES.map(t => (
                      <span key={t} style={{ padding: '3px 10px', borderRadius: 'var(--radius-2)', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--fg-muted)', fontWeight: 500 }}>{t}</span>
                    ))}
                    <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-2)', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--fg-muted)' }}>10 MB max</span>
                  </div>
                </div>
              ) : (
                /* File card */
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--surface)' }}>
                    <PdfBadge ext={fileExt} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>{file.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                        {formatSize(file.size)}{analysis ? ` · ${analysis.pages} page${analysis.pages > 1 ? 's' : ''}` : ''}
                      </div>
                    </div>
                    <button onClick={() => { setFile(null); setAnalysis(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex', padding: 4 }}>
                      <X size={16} />
                    </button>
                  </div>

                  {analyzing && (
                    <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Loader size={15} className="animate-spin" color="var(--brand)" />
                      <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Analyse OCR en cours…</span>
                    </div>
                  )}
                  {analysis && !analyzing && (
                    <div style={{ padding: '12px 16px', background: '#f0fdf4', borderTop: '1px solid #bbf7d0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <CheckCircle size={15} color="#166534" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>Analyse terminée</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ padding: '2px 10px', borderRadius: 'var(--radius-full)', background: '#dcfce7', color: '#166534', fontSize: 11, fontWeight: 500 }}>Type détecté · {analysis.type}</span>
                        <span style={{ padding: '2px 10px', borderRadius: 'var(--radius-full)', background: '#dcfce7', color: '#166534', fontSize: 11, fontWeight: 500 }}>Texte indexé · {analysis.lang}</span>
                        {analysis.signatures > 0 && (
                          <span style={{ padding: '2px 10px', borderRadius: 'var(--radius-full)', background: '#dcfce7', color: '#166534', fontSize: 11, fontWeight: 500 }}>{analysis.signatures} zone de signature</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* OCR banner */}
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-3)', background: 'var(--brand-soft)', border: '1px solid var(--brand)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 13, color: 'var(--brand)' }}>
                <Sparkles size={15} />
                <span><strong>OCR + IA</strong> · le type, le contenu indexable et le workflow sont détectés automatiquement.</span>
              </div>

              {/* Mobile card */}
              <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-3)', border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
                <Smartphone size={28} color="var(--brand)" strokeWidth={1.5} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>Sur le terrain ? Utilisez l'app mobile.</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Scan caméra avec OCR temps réel et classification IA.</div>
                </div>
                <button style={{ padding: '6px 14px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Recevoir le lien
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2 ───────────────────────────────────────────────── */}
          {step === 2 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-4)', padding: 24, marginBottom: 28 }}>
              {/* IA banner */}
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-3)', background: 'var(--brand-soft)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--brand)' }}>
                <Sparkles size={14} />
                <span>Champs pré-remplis par l'IA — vérifiez et ajustez si besoin.</span>
              </div>

              {/* Titre */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', display: 'block', marginBottom: 5 }}>Titre du document</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = 'var(--brand)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {/* Type + Service */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', display: 'block', marginBottom: 5 }}>Type</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                    {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', display: 'block', marginBottom: 5 }}>Service</label>
                  <select value={service} onChange={e => setService(e.target.value)}
                    style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                    <option value="">— choisir —</option>
                    {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Visibilité */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--fg)' }}>
                  <input
                    type="checkbox"
                    checked={visibility === 'service'}
                    onChange={e => setVisibility(e.target.checked ? 'service' : 'personal')}
                    style={{ width: 16, height: 16, accentColor: 'var(--brand)' }}
                  />
                  Visible par tout mon service
                </label>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4, marginLeft: 24 }}>
                  {visibility === 'service'
                    ? 'Tous les membres de votre service pourront voir ce document.'
                    : 'Ce document ne sera visible que par vous (et vos validateurs de workflow).'}
                </div>
              </div>

              {/* Référence */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', display: 'block', marginBottom: 5 }}>Référence</label>
                <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = 'var(--brand)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {/* Tags */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', display: 'block', marginBottom: 5 }}>Tags</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', padding: '6px 10px', background: 'var(--surface-2)', minHeight: 38 }}
                  onClick={() => document.getElementById('tag-input')?.focus()}>
                  {tags.map(t => (
                    <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--brand-soft)', color: 'var(--brand)', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 500 }}>
                      {t} <X size={11} style={{ cursor: 'pointer' }} onClick={() => removeTag(t)} />
                    </span>
                  ))}
                  <input id="tag-input" type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
                    placeholder="+ ajouter..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: 'var(--fg)', minWidth: 80 }} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3 ───────────────────────────────────────────────── */}
          {step === 3 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-4)', overflow: 'hidden', marginBottom: 28 }}>
              <div style={{ padding: '20px 20px 16px', background: 'var(--surface)' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>Circuit de validation</div>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Suggéré par l'IA selon le type « {category} ». Modifiable.</div>
              </div>

              <div style={{ padding: '0 20px 20px', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {WORKFLOW_OPTIONS.map(opt => (
                  <label key={opt.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
                    border: `1.5px solid ${workflow === opt.id ? 'var(--brand)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-3)',
                    background: workflow === opt.id ? 'var(--brand-soft)' : 'var(--surface-2)',
                    cursor: 'pointer', transition: 'border-color .12s, background .12s',
                  }}>
                    <input type="radio" name="workflow" value={opt.id} checked={workflow === opt.id}
                      onChange={() => setWorkflow(opt.id)}
                      style={{ marginTop: 2, accentColor: 'var(--brand)', width: 16, height: 16, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{opt.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{opt.sub}</div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Aperçu circuit */}
              <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'var(--surface-2)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>Aperçu du circuit</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {circuitSteps.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          background: i === 0 ? 'var(--success)' : 'var(--surface-3)',
                          border: i === 0 ? 'none' : '1.5px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: i === 0 ? '#fff' : 'var(--fg-muted)',
                        }}>
                          {i === 0 ? <CheckCircle size={14} /> : i + 1}
                        </div>
                        {i < circuitSteps.length - 1 && (
                          <div style={{ width: 1, flex: 1, minHeight: 20, background: 'var(--border)', margin: '3px 0' }} />
                        )}
                      </div>
                      <div style={{ paddingBottom: i < circuitSteps.length - 1 ? 12 : 0, paddingTop: 2 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{s}</div>
                        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                          {i === 0 ? `Vous (${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''})` : 'À assigner'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Footer buttons ────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/documents')}
              style={{ height: 38, padding: '0 18px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {step > 1 ? <><ArrowLeft size={14}/> Précédent</> : 'Annuler'}
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 ? !iStep1Ok : !iStep2Ok}
                style={{ height: 38, padding: '0 20px', borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: (step === 1 ? !iStep1Ok : !iStep2Ok) ? 'not-allowed' : 'pointer', opacity: (step === 1 ? !iStep1Ok : !iStep2Ok) ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                Suivant <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ height: 38, padding: '0 20px', borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {submitting ? <Loader size={13} className="animate-spin" /> : <CheckCircle size={14} />}
                Créer et envoyer
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Upload;
