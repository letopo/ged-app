/* global React, Icon, Sidebar, Topbar */
const { useState: useS2 } = React;

// =========================================================
// PAGE · DOCUMENTS (Table A avec switch + Detail panel C)
// =========================================================
window.PageDocs = function PageDocs({ onGo, view: initialView }) {
  const [view, setView] = useS2(initialView || 'table');
  const [selected, setSelected] = useS2([]);
  const [query, setQuery] = useS2('');
  const [statusFilter, setStatusFilter] = useS2('all');

  const [docs, setDocs] = useS2([
    { id: 1, name: 'Demande de permission · Bertha EOCK', type: 'Permission', status: 'pending', who: 'BE', c: 'c2', service: 'Bloc Op.', wf: '1/2', mod: 'il y a 2h' },
    { id: 2, name: 'Bon de commande #142', type: 'Bon commande', status: 'approved', who: 'FY', c: 'c1', service: 'Achats', wf: '2/2', mod: 'il y a 4h' },
    { id: 3, name: 'Fiche réception HSJM-Q1', type: 'Fiche', status: 'approved', who: 'CL', c: 'c3', service: 'Biomédical', wf: '1/1', mod: 'hier' },
    { id: 4, name: 'Ordre de mission #248', type: 'OM', status: 'draft', who: 'RW', c: 'c4', service: 'Direction', wf: '0/2', mod: 'hier' },
    { id: 5, name: 'Pièce de caisse · 04 mai', type: 'PC', status: 'approved', who: 'CH', c: 'c5', service: 'Compta', wf: '1/1', mod: '04/05' },
    { id: 6, name: 'Bon de sortie #88', type: 'BS', status: 'approved', who: 'FY', c: 'c1', service: 'Pharmacie', wf: '1/1', mod: '03/05' },
    { id: 7, name: 'Ordre de mission #247', type: 'OM', status: 'approved', who: 'FY', c: 'c1', service: 'Direction', wf: '2/2', mod: '02/05' },
    { id: 8, name: 'Demande achat · Mobilier', type: 'Demande', status: 'pending', who: 'TY', c: 'c6', service: 'Admin', wf: '0/2', mod: '02/05' },
  ]);

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const statusLabel = { pending: 'En validation', approved: 'Approuvé', draft: 'Brouillon' };
  const statusChip = { pending: 'warn', approved: 'success', draft: 'outline' };

  const filtered = docs.filter(d =>
    (statusFilter === 'all' || d.status === statusFilter) &&
    (query.trim() === '' || (d.name + ' ' + d.type + ' ' + d.service).toLowerCase().includes(query.toLowerCase()))
  );

  const bulkApprove = () => {
    const n = selected.length;
    setDocs(list => list.map(d => selected.includes(d.id) ? { ...d, status: 'approved', wf: '2/2' } : d));
    setSelected([]);
    window.gedToast(n > 1 ? n + ' documents approuvés.' : 'Document approuvé.', { tone: 'success' });
  };
  const bulkArchive = () => {
    const n = selected.length;
    setDocs(list => list.filter(d => !selected.includes(d.id)));
    setSelected([]);
    window.gedToast(n > 1 ? n + ' documents archivés.' : 'Document archivé.', { tone: 'default' });
  };

  return (
    <>
      <Topbar crumbs={['Documents']} actions={
        <>
          <button className="btn sm"><Icon name="download" size={14} /> Exporter</button>
          <button className="btn sm primary"><Icon name="plus" size={14} /> Nouveau document</button>
        </>
      } />
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Documents</h1>
            <div className="sub">174 documents · 3 en attente de validation</div>
          </div>
        </div>

        {/* View switch + filters */}
        <div className="filters">
          <div className="segmented">
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}><Icon name="list" size={13} /> Table</button>
            <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><Icon name="grid" size={13} /> Grille</button>
            <button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')}><Icon name="kanban" size={13} /> Kanban</button>
          </div>
          <div style={{ flex: 1 }}></div>
          <div className="search-input" style={{ width: 240 }}>
            <Icon name="search" size={14} />
            <input placeholder="Rechercher (OCR full-text)…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <button className="filter-chip"><span className="label-key">Type :</span> tous <Icon name="chevD" size={9} /></button>
          <button className={"filter-chip" + (statusFilter === 'pending' ? ' active' : '')} onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}><span className="label-key">Statut :</span> {statusFilter === 'pending' ? 'en attente' : 'tous'} <Icon name="chevD" size={9} /></button>
          <button className="filter-chip"><span className="label-key">Service :</span> tous <Icon name="chevD" size={9} /></button>
          <button className="btn xs ghost"><Icon name="plus" size={12} /> Filtre</button>
        </div>

        {/* Bulk actions bar */}
        {selected.length > 0 && (
          <div className="card" style={{ padding: '10px 14px', marginBottom: 16, background: 'var(--c-brand-soft)', borderColor: 'var(--c-brand-soft-2)' }}>
            <div className="spread">
              <div style={{ fontSize: 13, color: 'var(--c-brand-fg)', fontWeight: 500 }}>
                <b>{selected.length}</b> document{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn xs" onClick={bulkApprove}>Approuver</button>
                <button className="btn xs" onClick={bulkArchive}>Archiver</button>
                <button className="btn xs">Télécharger</button>
                <button className="btn xs danger" onClick={bulkArchive}>Supprimer</button>
                <button className="btn xs ghost" onClick={() => setSelected([])}>Annuler</button>
              </div>
            </div>
          </div>
        )}

        {/* TABLE VIEW */}
        {view === 'table' && (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 32 }}><input type="checkbox" /></th>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Auteur</th>
                  <th>Service</th>
                  <th>Workflow</th>
                  <th>Modifié</th>
                  <th style={{ width: 32 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className={selected.includes(d.id) ? 'selected' : ''} style={{ cursor: 'pointer' }} onClick={() => onGo && onGo('doc-detail', d)}>
                    <td onClick={(e) => { e.stopPropagation(); toggle(d.id); }}><input type="checkbox" checked={selected.includes(d.id)} readOnly /></td>
                    <td>
                      <div className="doc-name">
                        <div className="icon">PDF</div>
                        <div>{d.name}</div>
                      </div>
                    </td>
                    <td><span className="chip outline">{d.type}</span></td>
                    <td><span className={`chip ${statusChip[d.status]} dot`}>{statusLabel[d.status]}</span></td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className={`avatar sm ${d.c}`}>{d.who}</div></div></td>
                    <td className="muted" style={{ fontSize: 12 }}>{d.service}</td>
                    <td><span style={{ fontFamily: 'var(--f-mono)', fontSize: 11.5, color: 'var(--c-fg-3)' }}>{d.wf}</span></td>
                    <td className="muted" style={{ fontSize: 12 }}>{d.mod}</td>
                    <td><button className="icon-btn"><Icon name="more" size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* GRID VIEW */}
        {view === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {filtered.map(d => (
              <div key={d.id} className="card" style={{ padding: 14, cursor: 'pointer' }} onClick={() => onGo && onGo('doc-detail', d)}>
                <div style={{ height: 100, background: 'var(--c-bg-3)', border: '1px solid var(--c-line)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-fg-3)', fontSize: 11, fontWeight: 600, marginBottom: 12 }}>PDF · {d.type}</div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-ink)', marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.name}</div>
                <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>{d.service} · {d.mod}</div>
                <div className="spread">
                  <span className={`chip ${statusChip[d.status]} dot`}>{statusLabel[d.status]}</span>
                  <div className={`avatar sm ${d.c}`}>{d.who}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KANBAN VIEW */}
        {view === 'kanban' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[
              { key: 'draft', title: 'Brouillon', count: docs.filter(d => d.status === 'draft').length, items: docs.filter(d => d.status === 'draft') },
              { key: 'pending', title: 'En validation', count: docs.filter(d => d.status === 'pending').length, items: docs.filter(d => d.status === 'pending') },
              { key: 'approved', title: 'Approuvé', count: docs.filter(d => d.status === 'approved').length, items: docs.filter(d => d.status === 'approved').slice(0, 4) },
              { key: 'archived', title: 'Archivé', count: 17, items: [] },
            ].map(col => (
              <div key={col.key} style={{ background: 'var(--c-bg-3)', border: '1px solid var(--c-line)', borderRadius: 'var(--r-lg)', padding: 12, minHeight: 480 }}>
                <div className="spread" style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`status-dot ${col.key}`}></span>
                    <span style={{ fontFamily: 'var(--f-display)', fontWeight: 600, fontSize: 13, color: 'var(--c-ink)' }}>{col.title}</span>
                    <span className="muted mono" style={{ fontSize: 11 }}>{col.count}</span>
                  </div>
                  <button className="btn xs ghost"><Icon name="plus" size={12} /></button>
                </div>
                <div className="col" style={{ gap: 8 }}>
                  {col.items.map(d => (
                    <div key={d.id} className="card" style={{ padding: 10, cursor: 'pointer' }} onClick={() => onGo && onGo('doc-detail', d)}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                        <span className="chip outline" style={{ fontSize: 10 }}>{d.type}</span>
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 6, lineHeight: 1.35 }}>{d.name}</div>
                      <div className="spread">
                        <div className={`avatar sm ${d.c}`}>{d.who}</div>
                        <span className="muted mono" style={{ fontSize: 10.5 }}>{d.wf}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="spread" style={{ marginTop: 16, fontSize: 12, color: 'var(--c-fg-3)' }}>
          <span>1 – {filtered.length} sur 174 documents</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn xs ghost"><Icon name="chevR" size={12} style={{ transform: 'rotate(180deg)' }} /></button>
            <button className="btn xs primary">1</button>
            <button className="btn xs ghost">2</button>
            <button className="btn xs ghost">3</button>
            <span className="muted" style={{ padding: '0 6px' }}>…</span>
            <button className="btn xs ghost">22</button>
            <button className="btn xs ghost"><Icon name="chevR" size={12} /></button>
          </div>
        </div>
      </div>
    </>
  );
};

// =========================================================
// PAGE · DOC DETAIL (split list + preview, variante C)
// =========================================================
window.PageDocDetail = function PageDocDetail({ onGo, activeDoc }) {
  const doc = activeDoc || { name: 'Demande de permission · Bertha EOCK', type: 'Permission', service: 'Bloc Op.', who: 'BE', c: 'c2' };
  const [decided, setDecided] = useS2(false);

  const approve = () => {
    if (decided) return;
    setDecided(true);
    window.gedToast('Document approuvé. Transmis à la validation N2.', { tone: 'success' });
    setTimeout(() => onGo && onGo('docs'), 650);
  };
  const reject = () => {
    if (decided) return;
    setDecided(true);
    window.gedToast('Document rejeté. L’auteur a été notifié.', { tone: 'danger' });
    setTimeout(() => onGo && onGo('docs'), 650);
  };
  const requestChanges = () => {
    if (decided) return;
    setDecided(true);
    window.gedToast('Demande de modifications envoyée à l’auteur.', { tone: 'default' });
    setTimeout(() => onGo && onGo('docs'), 650);
  };

  return (
    <>
      <Topbar crumbs={['Documents', doc.name]} actions={
        <>
          <button className="btn sm"><Icon name="download" size={14} /> Télécharger</button>
          <button className="btn sm">Partager</button>
          <button className="btn sm primary" onClick={approve}>Approuver</button>
        </>
      } />

      <div className="docdetail-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr 320px', height: 'calc(100vh - 53px)', overflow: 'hidden' }}>
        {/* LEFT — doc list */}
        <div className="docdetail-list" style={{ borderRight: '1px solid var(--c-line)', background: 'var(--c-bg)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 14, borderBottom: '1px solid var(--c-line)' }}>
            <div className="search-input"><Icon name="search" size={14} /><input placeholder="Filtrer la liste…" /></div>
            <div className="filters" style={{ marginTop: 10, marginBottom: 0 }}>
              <span className="filter-chip active">À traiter (3)</span>
              <span className="filter-chip">Tout</span>
            </div>
          </div>
          <div style={{ overflowY: 'auto' }}>
            {[
              { name: 'Demande de permission · Bertha EOCK', service: 'Bloc Op.', when: '2h', status: 'pending', selected: true, c: 'c2', who: 'BE' },
              { name: 'Demande achat · Mobilier', service: 'Admin', when: '02/05', status: 'pending', c: 'c6', who: 'TY' },
              { name: 'Ordre de mission #248', service: 'Direction', when: 'hier', status: 'pending', c: 'c4', who: 'RW' },
              { name: 'Bon de commande #142', service: 'Achats', when: '4h', status: 'approved', c: 'c1', who: 'FY' },
              { name: 'Fiche réception HSJM-Q1', service: 'Biomédical', when: 'hier', status: 'approved', c: 'c3', who: 'CL' },
            ].map((d, i) => (
              <div key={i} style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--c-line-2)',
                background: d.selected ? 'var(--c-brand-soft)' : 'transparent',
                borderLeft: d.selected ? '3px solid var(--c-brand)' : '3px solid transparent',
                cursor: 'pointer'
              }}>
                <div className="spread" style={{ marginBottom: 4 }}>
                  <div className={`avatar sm ${d.c}`}>{d.who}</div>
                  <span className={`chip ${d.status === 'approved' ? 'success' : 'warn'}`} style={{ fontSize: 10 }}>
                    {d.status === 'approved' ? 'Approuvé' : 'En validation'}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: d.selected ? 600 : 500, color: 'var(--c-ink)', marginBottom: 2, lineHeight: 1.35 }}>{d.name}</div>
                <div className="muted" style={{ fontSize: 11 }}>{d.service} · il y a {d.when}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER — PDF preview */}
        <div className="docdetail-preview" style={{ display: 'flex', flexDirection: 'column', background: 'var(--c-bg-3)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--c-line)', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, fontSize: 13, color: 'var(--c-fg-3)' }}>Page 1 / 2</div>
            <button className="btn xs ghost">−</button>
            <span style={{ fontSize: 12, fontFamily: 'var(--f-mono)' }}>100%</span>
            <button className="btn xs ghost">+</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div className="pdf-page" style={{ width: 480, background: 'white', border: '1px solid var(--c-line)', borderRadius: 4, padding: '40px 48px', boxShadow: 'var(--sh-md)', minHeight: 600 }}>
              <div style={{ borderBottom: '2px solid var(--c-ink)', paddingBottom: 16, marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, fontWeight: 700 }}>Hôpital Saint-Jean-de-Malte</div>
                <div className="muted" style={{ fontSize: 11 }}>BP 1247 · Douala · Cameroun</div>
              </div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>{doc.name.split(' · ')[0]}</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Réf. {doc.type === 'Permission' ? 'PERM' : doc.type === 'Bon commande' ? 'BC' : 'DOC'}-2026-0412</div>
              </div>
              <div style={{ fontSize: 11.5, lineHeight: 1.7, color: 'var(--c-fg-2)' }}>
                <div style={{ marginBottom: 12 }}><b>Demandeur :</b> Bertha EOCK · Bloc Opératoire</div>
                <div style={{ marginBottom: 12 }}><b>Période :</b> du 7 mai 2026 au 14 mai 2026 (7 jours)</div>
                <div style={{ marginBottom: 12 }}><b>Motif :</b> congé annuel</div>
                <div style={{ height: 8 }}></div>
                <div style={{ height: 4, background: 'var(--c-line-2)', borderRadius: 2, marginBottom: 6 }}></div>
                <div style={{ height: 4, background: 'var(--c-line-2)', borderRadius: 2, marginBottom: 6, width: '85%' }}></div>
                <div style={{ height: 4, background: 'var(--c-line-2)', borderRadius: 2, marginBottom: 6, width: '92%' }}></div>
                <div style={{ height: 4, background: 'var(--c-line-2)', borderRadius: 2, marginBottom: 24, width: '60%' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60 }}>
                  <div>
                    <div style={{ borderTop: '1px solid var(--c-line)', paddingTop: 4, fontSize: 10, width: 140 }}>Signature demandeur</div>
                  </div>
                  <div style={{ border: '2px dashed var(--c-brand)', padding: '8px 12px', borderRadius: 4, fontSize: 10, color: 'var(--c-brand)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="pen" size={12} /> Zone de signature détectée
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — metadata + workflow */}
        <div className="docdetail-meta" style={{ borderLeft: '1px solid var(--c-line)', background: 'var(--c-bg)', overflowY: 'auto', padding: 18 }}>
          <div className="card flat" style={{ padding: 0, border: 'none' }}>
            <div style={{ marginBottom: 16 }}>
              <div className="mono muted" style={{ fontSize: 10, letterSpacing: 0.6, marginBottom: 6, textTransform: 'uppercase' }}>Workflow de validation</div>
              <div className="col" style={{ gap: 0 }}>
                {[
                  { step: 'Soumission', who: 'Bertha EOCK', when: '5 mai · 11:08', state: 'done' },
                  { step: 'Validation N1 · Chef de service', who: 'Vous (Franck Y.)', when: 'En cours', state: 'current' },
                  { step: 'Validation N2 · Direction', who: 'Michel V.', when: 'En attente', state: 'pending' },
                  { step: 'Signature finale', who: 'Direction RH', when: 'En attente', state: 'pending' },
                ].map((s, i, arr) => (
                  <div key={i} style={{ display: 'flex', gap: 10, position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: s.state === 'done' ? 'var(--c-success)' : s.state === 'current' ? 'var(--c-brand)' : 'var(--c-bg)',
                        border: '2px solid ' + (s.state === 'pending' ? 'var(--c-line)' : 'transparent'),
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, flexShrink: 0
                      }}>
                        {s.state === 'done' ? <Icon name="check" size={13} /> : s.state === 'current' ? i + 1 : ''}
                      </div>
                      {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: s.state === 'done' ? 'var(--c-success)' : 'var(--c-line)', minHeight: 22 }}></div>}
                    </div>
                    <div style={{ paddingBottom: 14, flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: s.state === 'pending' ? 'var(--c-fg-3)' : 'var(--c-ink)' }}>{s.step}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{s.who}</div>
                      <div className="muted mono" style={{ fontSize: 10.5 }}>{s.when}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div className="mono muted" style={{ fontSize: 10, letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' }}>Métadonnées</div>
              <div style={{ fontSize: 12 }}>
                {[
                  ['Type', 'PDF · 2.4 MB · 2 pages'],
                  ['Service', 'Bloc Opératoire'],
                  ['Tags', null],
                  ['Référence', 'PERM-2026-0412'],
                  ['OCR', 'Indexé · français'],
                  ['Créé le', '5 mai 2026, 11:08'],
                ].map(([k, v], i) => (
                  <div key={i} style={{ display: 'flex', padding: '6px 0', borderBottom: i < 5 ? '1px solid var(--c-line-2)' : 'none' }}>
                    <span className="muted" style={{ width: 90, fontSize: 11.5 }}>{k}</span>
                    {v ? <span style={{ flex: 1, color: 'var(--c-ink)' }}>{v}</span> : (
                      <span style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <span className="chip">permission</span>
                        <span className="chip">RH</span>
                        <span className="chip">2026</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mono muted" style={{ fontSize: 10, letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' }}>Commentaire</div>
              <textarea placeholder="Ajouter un commentaire avant approbation…" style={{
                width: '100%', minHeight: 80, padding: 10, border: '1px solid var(--c-line)', borderRadius: 'var(--r-md)',
                fontFamily: 'var(--f-body)', fontSize: 12, resize: 'vertical', outline: 'none'
              }}></textarea>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button className="btn sm danger" onClick={reject} disabled={decided}>Rejeter</button>
                <button className="btn sm" onClick={requestChanges} disabled={decided}>Demander modifs</button>
                <button className={"btn sm primary" + (decided ? ' confirming' : '')} style={{ marginLeft: 'auto' }} onClick={approve} disabled={decided}><Icon name="check" size={14} /> Approuver</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// =========================================================
// PAGE · UPLOAD (Wizard A)
// =========================================================
window.PageUpload = function PageUpload({ onGo }) {
  const [step, setStep] = useS2(1);
  const [file, setFile] = useS2(null);          // { name, size }
  const [ocr, setOcr] = useS2('idle');           // idle | processing | done
  const [meta, setMeta] = useS2({ title: '', type: 'Permission', service: 'Bloc Opératoire', reference: '', tags: ['permission', 'RH'] });
  const [tagInput, setTagInput] = useS2('');
  const [wf, setWf] = useS2('wf2');

  // Simulate picking a file → OCR + AI classification
  const pickFile = () => {
    if (ocr === 'processing') return;
    const f = { name: 'Permission_Bertha_EOCK.pdf', size: '2.4 MB' };
    setFile(f);
    setOcr('processing');
    setTimeout(() => {
      setOcr('done');
      setMeta(m => ({ ...m, title: 'Demande de permission · Bertha EOCK', reference: 'PERM-2026-0412' }));
      window.gedToast('Document analysé. Type et workflow détectés.', { tone: 'success' });
    }, 1400);
  };
  const removeFile = () => { setFile(null); setOcr('idle'); };

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      setMeta(m => ({ ...m, tags: [...m.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };
  const removeTag = (i) => setMeta(m => ({ ...m, tags: m.tags.filter((_, j) => j !== i) }));

  const WORKFLOWS = {
    wf2: { label: 'Validation 2 niveaux', desc: 'Chef de service → Direction → Signature', steps: ['Chef de service', 'Direction', 'Signature'] },
    wf1: { label: 'Validation simple', desc: 'Un seul validateur puis signature', steps: ['Validateur', 'Signature'] },
    wf0: { label: 'Aucun (archivage direct)', desc: 'Document archivé sans circuit', steps: ['Archivage'] },
  };

  const submit = () => {
    window.gedToast('Document créé et transmis pour validation.', { tone: 'success' });
    setTimeout(() => onGo && onGo('docs'), 700);
  };

  const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--c-fg-2)', marginBottom: 6, display: 'block' };
  const selectStyle = {
    width: '100%', height: 34, padding: '0 10px', border: '1px solid var(--c-line)',
    borderRadius: 'var(--r-md)', background: 'var(--c-bg)', color: 'var(--c-ink)',
    fontFamily: 'var(--f-body)', fontSize: 13, outline: 'none',
  };

  const canNext = step === 1 ? ocr === 'done' : true;

  return (
    <>
      <Topbar crumbs={['Documents', 'Nouvel upload']} actions={
        <button className="btn sm ghost" onClick={() => onGo && onGo('docs')}>Quitter</button>
      } />
      <div className="page" style={{ maxWidth: 720 }}>
        <div className="page-head">
          <div>
            <div className="mono muted" style={{ fontSize: 11, letterSpacing: 0.4, marginBottom: 6 }}>Nouveau document</div>
            <h1>Ajouter un document à la GED</h1>
            <div className="sub">L'OCR détecte le type, extrait les zones de signature et suggère un workflow.</div>
          </div>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          {[{ n: 1, l: 'Fichier' }, { n: 2, l: 'Métadonnées' }, { n: 3, l: 'Workflow' }].map((s, i, arr) => (
            <span key={s.n} style={{ display: 'contents' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: s.n < step ? 'pointer' : 'default' }} onClick={() => s.n < step && setStep(s.n)}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: step === s.n ? 'var(--c-brand)' : step > s.n ? 'var(--c-success)' : 'var(--c-bg-3)',
                  color: step >= s.n ? 'white' : 'var(--c-fg-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                  border: '1px solid ' + (step === s.n ? 'var(--c-brand)' : step > s.n ? 'var(--c-success)' : 'var(--c-line)')
                }}>{step > s.n ? <Icon name="check" size={13} /> : s.n}</div>
                <span style={{ fontSize: 13, fontWeight: step === s.n ? 600 : 500, color: step >= s.n ? 'var(--c-ink)' : 'var(--c-fg-3)' }}>{s.l}</span>
              </div>
              {i < arr.length - 1 && <div style={{ flex: 1, height: 1, background: step > s.n ? 'var(--c-success)' : 'var(--c-line)' }}></div>}
            </span>
          ))}
        </div>

        {/* ---------- STEP 1 — Fichier ---------- */}
        {step === 1 && (
          <>
            {!file && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div onClick={pickFile} style={{
                  border: '2px dashed var(--c-border-strong)', margin: 16, borderRadius: 'var(--r-lg)',
                  padding: 56, textAlign: 'center', background: 'var(--c-bg-2)', cursor: 'pointer'
                }}>
                  <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: '50%', background: 'var(--c-brand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-brand)' }}><Icon name="upload" size={24} /></div>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 17, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 4 }}>Glissez un document ici</div>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>ou <span style={{ color: 'var(--c-brand)', fontWeight: 600 }}>parcourir</span> · PDF, Word, Excel, Image</div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {['PDF', 'DOCX', 'XLSX', 'PNG', 'JPG'].map(t => <span key={t} className="chip">{t}</span>)}
                    <span className="chip outline">10 MB max</span>
                  </div>
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--c-line)', background: 'var(--c-brand-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon name="sparkle" size={16} style={{ color: 'var(--c-brand)' }} />
                  <div style={{ fontSize: 12.5, color: 'var(--c-brand-fg)' }}>
                    <b>OCR + IA</b> · le type, le contenu indexable et le workflow sont détectés automatiquement.
                  </div>
                </div>
              </div>
            )}

            {file && (
              <div className="card">
                <div className="spread">
                  <div className="row" style={{ gap: 12 }}>
                    <div style={{ width: 40, height: 50, background: 'var(--c-danger-soft)', color: 'var(--c-danger-fg)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>PDF</div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--c-ink)', fontSize: 14 }}>{file.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{file.size} · 2 pages</div>
                    </div>
                  </div>
                  <button className="btn xs ghost" onClick={removeFile}><Icon name="x" size={13} /></button>
                </div>

                {ocr === 'processing' && (
                  <div style={{ marginTop: 14 }}>
                    <div className="row" style={{ gap: 8, marginBottom: 8, fontSize: 12.5, color: 'var(--c-fg-2)' }}>
                      <Icon name="sparkle" size={14} style={{ color: 'var(--c-brand)' }} />
                      Analyse OCR en cours…
                    </div>
                    <div style={{ height: 4, background: 'var(--c-bg-3)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--c-brand)', borderRadius: 2, animation: 'ocr-bar 1.4s ease forwards' }}></div>
                    </div>
                  </div>
                )}

                {ocr === 'done' && (
                  <div style={{ marginTop: 14, padding: 12, background: 'var(--c-success-soft)', borderRadius: 'var(--r-md)' }}>
                    <div className="row" style={{ gap: 8, marginBottom: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--c-success-fg)' }}>
                      <Icon name="checkCircle" size={15} /> Analyse terminée
                    </div>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap', fontSize: 11.5 }}>
                      <span className="chip">Type détecté · Permission</span>
                      <span className="chip">Texte indexé · français</span>
                      <span className="chip">1 zone de signature</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile scan promo */}
            <div className="card" style={{ marginTop: 20, padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, background: 'var(--c-bg-3)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-brand)' }}><Icon name="smartphone" size={20} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>Sur le terrain ? Utilisez l'app mobile.</div>
                <div className="muted" style={{ fontSize: 12 }}>Scan caméra avec OCR temps réel et classification IA.</div>
              </div>
              <button className="btn sm" onClick={() => window.gedToast('Lien d’installation envoyé par e-mail.', { tone: 'default' })}>Recevoir le lien</button>
            </div>
          </>
        )}

        {/* ---------- STEP 2 — Métadonnées ---------- */}
        {step === 2 && (
          <div className="card">
            <div className="row" style={{ gap: 8, marginBottom: 16, padding: '8px 12px', background: 'var(--c-brand-soft)', borderRadius: 'var(--r-md)' }}>
              <Icon name="sparkle" size={15} style={{ color: 'var(--c-brand)' }} />
              <span style={{ fontSize: 12.5, color: 'var(--c-brand-fg)' }}>Champs pré-remplis par l'IA — vérifiez et ajustez si besoin.</span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Titre du document</label>
              <input className="search-input" style={{ width: '100%', color: 'var(--c-ink)' }} value={meta.title} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Type</label>
                <select style={selectStyle} value={meta.type} onChange={e => setMeta(m => ({ ...m, type: e.target.value }))}>
                  {['Permission', 'Bon de commande', 'Ordre de mission', 'Pièce de caisse', 'Facture', 'Fiche réception'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Service</label>
                <select style={selectStyle} value={meta.service} onChange={e => setMeta(m => ({ ...m, service: e.target.value }))}>
                  {['Bloc Opératoire', 'Direction', 'Achats', 'Comptabilité', 'Biomédical', 'Pharmacie', 'RH'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Référence</label>
              <input className="search-input" style={{ width: '100%', color: 'var(--c-ink)' }} value={meta.reference} onChange={e => setMeta(m => ({ ...m, reference: e.target.value }))} placeholder="ex. PERM-2026-0412" />
            </div>

            <div>
              <label style={labelStyle}>Tags</label>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap', padding: 8, border: '1px solid var(--c-line)', borderRadius: 'var(--r-md)', background: 'var(--c-bg)' }}>
                {meta.tags.map((tg, i) => (
                  <span key={i} className="chip brand" style={{ gap: 6 }}>{tg}<span style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => removeTag(i)}><Icon name="x" size={10} /></span></span>
                ))}
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="+ ajouter…" style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--f-body)', fontSize: 12.5, color: 'var(--c-ink)', flex: 1, minWidth: 80 }} />
              </div>
            </div>
          </div>
        )}

        {/* ---------- STEP 3 — Workflow ---------- */}
        {step === 3 && (
          <div className="card">
            <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 15, fontWeight: 600, margin: '0 0 4px', color: 'var(--c-ink)' }}>Circuit de validation</h3>
            <p className="muted" style={{ fontSize: 12.5, margin: '0 0 16px' }}>Suggéré par l'IA selon le type « {meta.type} ». Modifiable.</p>

            <div className="col" style={{ gap: 8, marginBottom: 18 }}>
              {Object.entries(WORKFLOWS).map(([k, w]) => (
                <div key={k} onClick={() => setWf(k)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  border: '1px solid ' + (wf === k ? 'var(--c-brand)' : 'var(--c-line)'),
                  background: wf === k ? 'var(--c-brand-soft)' : 'var(--c-bg)',
                  borderRadius: 'var(--r-md)', cursor: 'pointer'
                }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid ' + (wf === k ? 'var(--c-brand)' : 'var(--c-border-strong)'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {wf === k && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-brand)' }}></div>}
                  </div>
                  <div className="grow">
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{w.label}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{w.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resulting steps preview */}
            <div className="mono muted" style={{ fontSize: 10.5, marginBottom: 10 }}>Aperçu du circuit</div>
            <div className="col" style={{ gap: 0 }}>
              {[{ step: 'Soumission', who: 'Vous (Franck Y.)', done: true }, ...WORKFLOWS[wf].steps.map((s) => ({ step: s, who: 'À assigner', done: false }))].map((s, i, arr) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: s.done ? 'var(--c-success)' : 'var(--c-bg-3)', color: s.done ? '#fff' : 'var(--c-fg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, border: s.done ? 'none' : '1px solid var(--c-line)' }}>{s.done ? <Icon name="check" size={11} /> : i + 1}</div>
                    {i < arr.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 18, background: 'var(--c-line)' }}></div>}
                  </div>
                  <div style={{ paddingBottom: 14 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-ink)' }}>{s.step}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{s.who}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 24 }}>
          <button className="btn" onClick={() => step === 1 ? (onGo && onGo('home')) : setStep(step - 1)}>{step === 1 ? 'Annuler' : 'Précédent'}</button>
          <div style={{ flex: 1 }}></div>
          {step < 3 && <button className="btn primary" disabled={!canNext} style={!canNext ? { opacity: 0.5, cursor: 'not-allowed' } : null} onClick={() => canNext && setStep(step + 1)}>Suivant <Icon name="arrowR" size={14} /></button>}
          {step === 3 && <button className="btn primary" onClick={submit}><Icon name="check" size={14} /> Créer et envoyer</button>}
        </div>
      </div>
    </>
  );
};
