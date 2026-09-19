// frontend/src/pages/ArchivesPage.jsx — Redesign complet
import React, { useState, useEffect, useMemo } from 'react';
import { documentsAPI } from '../services/api';
import DocumentViewer from '../components/DocumentViewer';
import {
  Search, Download, RotateCcw, Loader, FolderOpen, AlertTriangle,
  Bell, FileText, ChevronDown, Share2, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../components/ConfirmModal';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });

const fmtSize = (bytes) => {
  if (!bytes) return '';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024)    return Math.round(bytes / 1024) + ' KB';
  return bytes + ' B';
};

const RETENTION = {
  'Bon de commande':         10, 'Bon de commande interne': 10,
  'Demande de permission':    5, 'Permission':               5,
  'Permutation':              5, 'Demande de permutation':   5,
  'Facture':                 10,
  'Ordre de mission':         5, "Ordre de Mission":         5,
  'Pièce de caisse':         10,
  'Bon de sortie':            5,
  'Demande de travaux':       5,
};

const CATEGORY_COLORS = {
  'Bon de commande':        '#7C3AED',
  'Bon de commande interne':'#7C3AED',
  'Demande de permission':  '#B45309',
  'Permission':             '#B45309',
  'Permutation':            '#0369A1',
  'Facture':                '#065F46',
  'Ordre de mission':       '#9A3412',
  'Pièce de caisse':        '#1D4ED8',
  'Bon de sortie':          '#4D7C0F',
  'Demande de travaux':     '#6B21A8',
};

function PdfIcon({ category }) {
  const bg = CATEGORY_COLORS[category] || '#7F1D1D';
  return (
    <div style={{ width: 40, height: 40, borderRadius: 6, background: bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0 }}>
      <span style={{ color:'#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px' }}>PDF</span>
    </div>
  );
}

function Avatar({ name, size = 20 }) {
  const COLORS = ['#1B3A6B','#1A7A4A','#B45309','#C0392B','#1557A0','#5B89D6','#7C3AED','#065F46'];
  const idx = name ? name.charCodeAt(0) % COLORS.length : 0;
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?';
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:COLORS[idx], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.42, fontWeight:700, flexShrink:0 }}>
      {initials}
    </div>
  );
}

// ── Checkbox type filter ──────────────────────────────────────────────────────
function TypeCheckbox({ label, count, checked, onChange }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', cursor:'pointer' }}>
      <input
        type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ width:14, height:14, accentColor:'var(--brand)', cursor:'pointer' }}
      />
      <span style={{ fontSize:13, color:'var(--fg)', flex:1 }}>{label}</span>
      <span style={{ fontSize:11, color:'var(--fg-subtle)', minWidth:16, textAlign:'right' }}>{count}</span>
    </label>
  );
}

// ── Timeline view ─────────────────────────────────────────────────────────────
function TimelineView({ docs, onRestore, onView }) {
  const sorted = [...docs].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  let lastMonth = null;
  return (
    <div style={{ position:'relative', paddingLeft:32 }}>
      <div style={{ position:'absolute', left:10, top:0, bottom:0, width:2, background:'var(--border)' }} />
      {sorted.map((doc, i) => {
        const month = new Date(doc.createdAt).toLocaleDateString('fr-FR', { month:'long', year:'numeric' });
        const showMonth = month !== lastMonth;
        lastMonth = month;
        const uploaderName = doc.uploadedBy ? `${doc.uploadedBy.firstName||''} ${doc.uploadedBy.lastName||''}`.trim() : 'Inconnu';
        return (
          <React.Fragment key={doc.id}>
            {showMonth && (
              <div style={{ fontSize:12, fontWeight:700, color:'var(--fg-muted)', textTransform:'uppercase', letterSpacing:'0.5px', margin:'16px 0 8px', paddingLeft:4 }}>
                {month}
              </div>
            )}
            <div style={{ position:'relative', marginBottom:10 }}>
              <div style={{ position:'absolute', left:-26, top:14, width:10, height:10, borderRadius:'50%', background:'var(--brand)', border:'2px solid var(--surface)' }} />
              <div className="ged-card" style={{ padding:'12px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--fg)', marginBottom:3 }}>{doc.title}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--fg-muted)', flexWrap:'wrap' }}>
                      <Avatar name={uploaderName} size={16} />
                      <span>{uploaderName}</span>
                      <span>·</span><span>{fmt(doc.createdAt)}</span>
                      {doc.category && <><span>·</span><span style={{ color:'var(--brand)' }}>{doc.category}</span></>}
                    </div>
                  </div>
                  <button onClick={() => onRestore(doc)} style={{ height:28, padding:'0 12px', borderRadius:'var(--radius-2)', background:'var(--brand)', color:'#fff', border:'none', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                    <RotateCcw size={11} /> Restaurer
                  </button>
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function ArchivesPage() {
  const { confirm, ConfirmModalRenderer } = useConfirm();
  const [grouped, setGrouped]         = useState({});
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [total, setTotal]             = useState(0);

  // View & filters
  const [view, setView]               = useState('list');   // 'list' | 'timeline'
  const [search, setSearch]           = useState('');
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [selectedAuthors, setSelectedAuthors] = useState(new Set());
  const [sort, setSort]               = useState('date');   // 'date' | 'name' | 'size'

  useEffect(() => { loadArchives(); }, []);

  const loadArchives = async () => {
    try {
      setLoading(true); setError(null);
      const res = await documentsAPI.getArchives();
      const data = res.data.data || {};
      setGrouped(data);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError('Erreur lors du chargement des archives.');
    } finally {
      setLoading(false);
    }
  };

  // Flatten all docs
  const allDocs = useMemo(() => {
    return Object.entries(grouped).flatMap(([cat, docs]) =>
      docs.map(d => ({ ...d, category: d.category || cat }))
    );
  }, [grouped]);

  // Category counts
  const typeCounts = useMemo(() => {
    const m = {};
    allDocs.forEach(d => { const c = d.category || 'Autre'; m[c] = (m[c] || 0) + 1; });
    return m;
  }, [allDocs]);

  // All unique authors
  const allAuthors = useMemo(() => {
    const map = {};
    allDocs.forEach(d => {
      const u = d.uploadedBy;
      if (!u) return;
      const key = u.id || u._id || u.email;
      if (!map[key]) map[key] = { key, name: `${u.firstName||''} ${u.lastName||''}`.trim() || u.email };
    });
    return Object.values(map);
  }, [allDocs]);

  // Filtered + sorted docs
  const filteredDocs = useMemo(() => {
    let docs = [...allDocs];

    if (search.trim()) {
      const q = search.toLowerCase();
      docs = docs.filter(d => d.title?.toLowerCase().includes(q) || d.category?.toLowerCase().includes(q));
    }

    if (selectedTypes.size > 0)
      docs = docs.filter(d => selectedTypes.has(d.category));

    if (dateFrom) docs = docs.filter(d => new Date(d.createdAt) >= new Date(dateFrom));
    if (dateTo)   docs = docs.filter(d => new Date(d.createdAt) <= new Date(dateTo + 'T23:59:59'));

    if (selectedAuthors.size > 0) {
      docs = docs.filter(d => {
        const u = d.uploadedBy;
        if (!u) return false;
        const key = u.id || u._id || u.email;
        return selectedAuthors.has(key);
      });
    }

    docs.sort((a, b) => {
      if (sort === 'name') return a.title?.localeCompare(b.title);
      if (sort === 'size') return (b.fileSize || 0) - (a.fileSize || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return docs;
  }, [allDocs, search, selectedTypes, dateFrom, dateTo, selectedAuthors, sort]);

  const handleUnarchive = async (doc) => {
    const ok = await confirm({
      title: 'Restaurer le document',
      message: `"${doc.title}" sera remis dans vos documents actifs.`,
      confirmLabel: 'Restaurer',
      variant: 'info',
    });
    if (!ok) return;
    try {
      await documentsAPI.unarchive(doc.id);
      toast.success('Document restauré');
      loadArchives();
    } catch { toast.error('Erreur lors de la restauration.'); }
  };

  const exportCSV = () => {
    const rows = [['Titre','Catégorie','Auteur','Date','Taille','Conservation']];
    filteredDocs.forEach(d => {
      const name = d.uploadedBy ? `${d.uploadedBy.firstName||''} ${d.uploadedBy.lastName||''}`.trim() : '';
      rows.push([d.title, d.category, name, fmt(d.createdAt), fmtSize(d.fileSize), `${RETENTION[d.category]||5} ans`]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
    a.download = 'archives.csv'; a.click();
  };

  const toggleType = (cat, checked) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      checked ? next.add(cat) : next.delete(cat);
      return next;
    });
  };

  const toggleAuthor = (key) => {
    setSelectedAuthors(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const sortLabel = sort === 'name' ? 'Nom ↑' : sort === 'size' ? 'Taille ↓' : 'Date ↓';

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <Loader size={24} color="var(--fg-muted)" className="animate-spin" />
    </div>
  );
  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', gap:8, color:'var(--danger)' }}>
      <AlertTriangle size={18} /> {error}
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin:'0 auto', padding:'0 24px 48px' }} className="animate-pageFade">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, paddingTop:4 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'var(--fg)', margin:'0 0 4px', letterSpacing:'-0.3px' }}>Archives</h1>
          <div style={{ fontSize:13, color:'var(--fg-muted)' }}>
            {total} document{total !== 1 ? 's' : ''} archivé{total !== 1 ? 's' : ''} · recherche plein texte (OCR indexé)
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* View toggle */}
          <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:'var(--radius-2)', overflow:'hidden' }}>
            {[
              { id:'list',     label:'Recherche', icon:<Search size={13}/> },
              { id:'timeline', label:'Timeline',  icon:<Clock size={13}/> },
            ].map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                display:'inline-flex', alignItems:'center', gap:5,
                height:32, padding:'0 12px', border:'none', cursor:'pointer', fontSize:12,
                background: view === v.id ? 'var(--brand)' : 'var(--surface-2)',
                color: view === v.id ? '#fff' : 'var(--fg-muted)',
                fontWeight: view === v.id ? 600 : 400,
              }}>{v.icon}{v.label}</button>
            ))}
          </div>
          <button onClick={exportCSV} style={{ display:'inline-flex', alignItems:'center', gap:5, height:32, padding:'0 12px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--fg)', fontSize:12, cursor:'pointer' }}>
            Export CSV
          </button>
          <button style={{ display:'inline-flex', alignItems:'center', gap:5, height:32, padding:'0 12px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--fg)', fontSize:12, cursor:'pointer' }}>
            Export ZIP
          </button>
          <div style={{ width:32, height:32, borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <Bell size={15} color="var(--fg-muted)" />
          </div>
        </div>
      </div>

      {/* ── Body: sidebar + main ──────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>

        {/* ── Left sidebar ─────────────────────────────────────────────── */}
        <div style={{ width:230, flexShrink:0, display:'flex', flexDirection:'column', gap:0 }} className="ged-card">
          {/* OCR search */}
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface-2)' }}>
              <Search size={13} color="var(--fg-subtle)" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Plein texte (OCR)..."
                style={{ flex:1, border:'none', background:'transparent', outline:'none', fontSize:12, color:'var(--fg)' }}
              />
              {search && <button onClick={() => setSearch('')} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--fg-subtle)', padding:0, lineHeight:1, fontSize:14 }}>×</button>}
            </div>
          </div>

          {/* TYPE */}
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--fg-subtle)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>Type</div>
            {Object.entries(typeCounts).sort((a,b) => b[1]-a[1]).map(([cat, cnt]) => (
              <TypeCheckbox
                key={cat} label={cat} count={cnt}
                checked={selectedTypes.has(cat)}
                onChange={checked => toggleType(cat, checked)}
              />
            ))}
            {selectedTypes.size > 0 && (
              <button onClick={() => setSelectedTypes(new Set())} style={{ marginTop:6, fontSize:11, color:'var(--brand)', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                Tout décocher
              </button>
            )}
          </div>

          {/* PÉRIODE */}
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--fg-subtle)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>Période</div>
            {[
              { label:'De', value:dateFrom, onChange:setDateFrom },
              { label:'À',  value:dateTo,   onChange:setDateTo },
            ].map(f => (
              <div key={f.label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, padding:'5px 8px', border:'1px solid var(--border)', borderRadius:'var(--radius-2)', background:'var(--surface-2)' }}>
                <span style={{ fontSize:11, color:'var(--fg-muted)', minWidth:14 }}>{f.label}</span>
                <input
                  type="date" value={f.value} onChange={e => f.onChange(e.target.value)}
                  style={{ flex:1, border:'none', background:'transparent', outline:'none', fontSize:11, color:'var(--fg)', colorScheme:'dark light' }}
                />
              </div>
            ))}
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} style={{ fontSize:11, color:'var(--brand)', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                Effacer
              </button>
            )}
          </div>

          {/* AUTEUR */}
          {allAuthors.length > 0 && (
            <div style={{ padding:'12px 14px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--fg-subtle)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>Auteur</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {allAuthors.slice(0,3).map(a => (
                  <button key={a.key} onClick={() => toggleAuthor(a.key)} style={{
                    padding:'3px 10px', borderRadius:'var(--radius-full)', fontSize:11, cursor:'pointer',
                    border: selectedAuthors.has(a.key) ? '1px solid var(--brand)' : '1px solid var(--border)',
                    background: selectedAuthors.has(a.key) ? 'var(--brand-soft)' : 'var(--surface-2)',
                    color: selectedAuthors.has(a.key) ? 'var(--brand)' : 'var(--fg)',
                    fontWeight: selectedAuthors.has(a.key) ? 600 : 400,
                  }}>
                    {a.name.split(' ')[0]}
                  </button>
                ))}
                {allAuthors.length > 3 && (
                  <span style={{ padding:'3px 8px', borderRadius:'var(--radius-full)', fontSize:11, color:'var(--fg-muted)', border:'1px solid var(--border)', background:'var(--surface-2)' }}>
                    +{allAuthors.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <div style={{ flex:1, minWidth:0 }}>

          {/* Results bar */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontSize:13, color:'var(--fg-muted)' }}>
              <span style={{ color:'var(--fg)', fontWeight:500 }}>{filteredDocs.length} résultat{filteredDocs.length !== 1 ? 's' : ''}</span>
              {' · '}<span>trié par {sort}</span>
              {sort === 'date' && <span style={{ marginLeft:3 }}>↓</span>}
              {sort === 'name' && <span style={{ marginLeft:3 }}>↑</span>}
            </div>
            {/* Sort selector */}
            <div style={{ position:'relative' }}>
              <select
                value={sort} onChange={e => setSort(e.target.value)}
                style={{ appearance:'none', padding:'4px 28px 4px 10px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--fg)', fontSize:12, cursor:'pointer', outline:'none' }}
              >
                <option value="date">Tri: Date ↓</option>
                <option value="name">Tri: Nom ↑</option>
                <option value="size">Tri: Taille ↓</option>
              </select>
              <ChevronDown size={12} color="var(--fg-muted)" style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
            </div>
          </div>

          {/* Empty state */}
          {filteredDocs.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'80px 0' }}>
              <FolderOpen size={44} color="var(--border-strong)" style={{ marginBottom:12 }} />
              <div style={{ fontSize:14, fontWeight:500, color:'var(--fg-muted)', marginBottom:4 }}>Aucun résultat</div>
              <div style={{ fontSize:12, color:'var(--fg-subtle)' }}>Modifiez les filtres ou la recherche</div>
            </div>
          ) : view === 'timeline' ? (
            <TimelineView docs={filteredDocs} onRestore={handleUnarchive} onView={setViewingDocument} />
          ) : (
            <div className="ged-card" style={{ overflow:'hidden', padding:0 }}>
              {filteredDocs.map((doc, i) => {
                const uploaderName = doc.uploadedBy
                  ? `${doc.uploadedBy.firstName||''} ${doc.uploadedBy.lastName||''}`.trim()
                  : 'Inconnu';
                const retention = RETENTION[doc.category] || 5;
                const size = fmtSize(doc.fileSize);

                return (
                  <div
                    key={doc.id}
                    style={{
                      display:'flex', alignItems:'center', gap:14,
                      padding:'14px 16px',
                      borderBottom: i < filteredDocs.length - 1 ? '1px solid var(--border)' : 'none',
                      transition:'background .12s', cursor:'pointer',
                    }}
                    onClick={() => setViewingDocument(doc)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <PdfIcon category={doc.category} />

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--fg)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {doc.title}
                        {doc.service || doc.department ? <span style={{ fontWeight:400, color:'var(--fg-muted)' }}> · {doc.service || doc.department}</span> : null}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--fg-muted)', flexWrap:'wrap' }}>
                        <Avatar name={uploaderName} size={18} />
                        <span>{uploaderName}</span>
                        <span>·</span>
                        <span>{fmt(doc.createdAt)}</span>
                        {size && <><span>·</span><span>{size}</span></>}
                        <span>·</span>
                        <span style={{ padding:'2px 7px', borderRadius:'var(--radius-full)', background:'var(--surface-3)', color:'var(--fg-muted)', fontSize:10, fontWeight:500 }}>
                          {doc.category}
                        </span>
                        <span style={{ padding:'2px 7px', borderRadius:'var(--radius-full)', background:'var(--brand-soft)', color:'var(--brand-fg)', fontSize:10, fontWeight:500 }}>
                          conserv. {retention} ans
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                      <a
                        href={doc.filePath ? `/api/files/${doc.filePath}` : '#'}
                        download
                        style={{ width:30, height:30, borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--fg-muted)', textDecoration:'none' }}
                        title="Télécharger"
                      >
                        <Download size={13} />
                      </a>
                      <button
                        style={{ height:30, padding:'0 12px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--fg)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}
                        title="Partager"
                        onClick={() => toast('Fonctionnalité de partage bientôt disponible')}
                      >
                        <Share2 size={12} /> Partager
                      </button>
                      <button
                        onClick={() => handleUnarchive(doc)}
                        style={{ height:30, padding:'0 12px', borderRadius:'var(--radius-2)', background:'var(--brand)', color:'#fff', border:'none', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontWeight:500 }}
                      >
                        <RotateCcw size={11} /> Restaurer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {viewingDocument && (
        <DocumentViewer document={viewingDocument} onClose={() => setViewingDocument(null)} />
      )}
      {ConfirmModalRenderer}
    </div>
  );
}
