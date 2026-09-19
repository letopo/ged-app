/* global React */
const { useState: useStateT } = React;

// =========================================================
// PAGE — MES TÂCHES (Variante B : Liste filtrable)
// =========================================================
window.PageTasks = function PageTasks({ onGo }) {
  const [tab, setTab] = useStateT('pending');
  const [selected, setSelected] = useStateT([]);

  const [tasks, setTasks] = useStateT([
    { id: 1, doc: 'Demande de permission · Bertha NDONGO', type: 'Permission', from: 'Franck YANKEU', service: 'Direction', due: 'dans 2j', urgent: true, status: 'pending', av: 'c1' },
    { id: 2, doc: 'Bon de commande #142', type: 'Bon de commande', from: 'Bertha EOCK', service: 'Achats', due: 'dans 5j', urgent: false, status: 'pending', av: 'c2' },
    { id: 3, doc: 'Ordre de mission #248', type: 'Ordre mission', from: 'Raoul WOUAPI', service: 'Direction', due: 'dans 7j', urgent: false, status: 'pending', av: 'c3' },
    { id: 4, doc: 'Pièce de caisse #88', type: 'Pièce caisse', from: 'Cassie HSJM', service: 'Comptabilité', due: 'dans 9j', urgent: false, status: 'pending', av: 'c4' },
    { id: 5, doc: 'Demande permutation · Service Pédiatrie', type: 'Permutation', from: 'Sandrina DJ.', service: 'RH', due: 'dans 12j', urgent: false, status: 'pending', av: 'c5' },
  ]);

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const allSelected = selected.length === tasks.length && tasks.length > 0;

  const decide = (id, kind) => {
    setTasks(list => list.filter(t => t.id !== id));
    setSelected(s => s.filter(x => x !== id));
    window.gedToast(kind === 'approve' ? 'Document approuvé.' : 'Document rejeté. L’auteur a été notifié.', { tone: kind === 'approve' ? 'success' : 'danger' });
  };
  const bulkDecide = (kind) => {
    const n = selected.length;
    setTasks(list => list.filter(t => !selected.includes(t.id)));
    setSelected([]);
    window.gedToast((n > 1 ? n + ' documents ' : 'Document ') + (kind === 'approve' ? 'approuvé' + (n > 1 ? 's' : '') + '.' : 'rejeté' + (n > 1 ? 's' : '') + '.'), { tone: kind === 'approve' ? 'success' : 'danger' });
  };

  return (
    <>
      <window.Topbar crumbs={['Mes tâches']} actions={
        <>
          <button className="btn sm">Validation en masse</button>
          <button className="btn sm primary"><window.Icon name="sparkle" size={13} /> Suggestions IA</button>
        </>
      } />
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Mes tâches</h1>
            <div className="sub">{tasks.length} document{tasks.length > 1 ? 's' : ''} en attente de votre validation · {tasks.filter(t => t.urgent).length} urgent</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="row" style={{ gap: 0, borderBottom: '1px solid var(--c-line)', marginBottom: 16 }}>
          {[
            ['pending', 'En attente', 5, true],
            ['approved', 'Approuvées', 18],
            ['rejected', 'Rejetées', 0],
            ['expired', 'Expirées', 1],
          ].map(([k, l, c, dot]) => (
            <button key={k} onClick={() => setTab(k)} className="btn ghost" style={{
              borderRadius: 0, borderBottom: tab === k ? '2px solid var(--c-brand)' : '2px solid transparent',
              color: tab === k ? 'var(--c-ink)' : 'var(--c-fg-3)', fontWeight: tab === k ? 600 : 500,
              padding: '10px 14px', marginBottom: -1
            }}>
              {l} <span className="chip" style={{ marginLeft: 4, fontSize: 10, padding: '1px 6px', background: tab === k ? 'var(--c-brand-soft)' : 'var(--c-bg-3)', color: tab === k ? 'var(--c-brand-fg)' : 'var(--c-fg-3)' }}>{c}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="filters">
          <div className="search-input" style={{ flex: '0 0 280px' }}>
            <window.Icon name="search" size={14} />
            <input placeholder="Rechercher dans mes tâches…" />
          </div>
          <button className="filter-chip"><window.Icon name="filter" size={11} /><span className="label-key">Urgence:</span> toutes <span className="arrow">▾</span></button>
          <button className="filter-chip"><span className="label-key">Service:</span> tous <span className="arrow">▾</span></button>
          <button className="filter-chip"><span className="label-key">Type:</span> tous <span className="arrow">▾</span></button>
          <button className="filter-chip"><span className="label-key">Échéance:</span> 30j <span className="arrow">▾</span></button>
          <div className="muted mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--c-fg-3)' }}>{tasks.length} résultat{tasks.length > 1 ? 's' : ''}</div>
        </div>

        {/* Bulk action bar */}
        {selected.length > 0 && (
          <div className="card" style={{ background: 'var(--c-brand-soft)', border: '1px solid var(--c-brand)', padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 600, color: 'var(--c-brand-fg)', fontSize: 13 }}>{selected.length} sélectionnée{selected.length > 1 ? 's' : ''}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button className="btn sm" onClick={() => bulkDecide('approve')}>Approuver tout</button>
              <button className="btn sm" onClick={() => bulkDecide('reject')}>Rejeter tout</button>
              <button className="btn sm ghost" onClick={() => setSelected([])}>Annuler</button>
            </div>
          </div>
        )}

        {/* Task list */}
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : tasks.map(t => t.id))} /></th>
                <th>Document</th>
                <th>Type</th>
                <th>Soumis par</th>
                <th>Service</th>
                <th>Échéance</th>
                <th style={{ width: 220 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id} className={selected.includes(t.id) ? 'selected' : ''}>
                  <td><input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} /></td>
                  <td>
                    <div className="doc-name">
                      <div className="icon">PDF</div>
                      <div>
                        <div>{t.doc}</div>
                        <div style={{ fontSize: 11, color: 'var(--c-fg-3)', fontWeight: 400, marginTop: 2 }}>
                          <span className="status-dot pending" style={{ marginRight: 4 }}></span>
                          en attente · étape 1/2
                        </div>
                      </div>
                    </div>
                  </td>
                  <td><span className="chip outline">{t.type}</span></td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <div className={`avatar sm ${t.av}`}>{t.from.split(' ').map(s => s[0]).join('').slice(0, 2)}</div>
                      <span style={{ fontSize: 12 }}>{t.from}</span>
                    </div>
                  </td>
                  <td><span className="chip">{t.service}</span></td>
                  <td>
                    <span className={"chip " + (t.urgent ? 'danger dot' : 'outline')} style={{ fontWeight: t.urgent ? 600 : 500 }}>
                      {t.due}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      <button className="btn xs primary" onClick={() => decide(t.id, 'approve')}>Approuver</button>
                      <button className="btn xs" onClick={() => decide(t.id, 'reject')}>Rejeter</button>
                      <button className="btn xs ghost" onClick={() => onGo('doc-detail', { name: t.doc, type: t.type, service: t.service, who: t.from.split(' ').map(s => s[0]).join('').slice(0,2), c: t.av })}>Voir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tasks.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--c-fg-3)' }}>
              <div style={{ display: 'inline-flex', marginBottom: 10, color: 'var(--c-success)' }}><window.Icon name="checkCircle" size={28} /></div>
              <div style={{ fontFamily: 'var(--f-display)', fontWeight: 600, fontSize: 15, color: 'var(--c-ink)' }}>Tout est traité.</div>
              <div style={{ fontSize: 13, marginTop: 2 }}>Aucune tâche en attente de votre validation.</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// =========================================================
// PAGE — WORKFLOW (Variante A : Sankey-flow)
// =========================================================
window.PageWorkflow = function PageWorkflow() {
  return (
    <>
      <window.Topbar crumbs={['Workflow']} actions={
        <>
          <button className="btn sm">30 derniers jours ▾</button>
          <button className="btn sm">Exporter</button>
        </>
      } />
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Workflow</h1>
            <div className="sub">Vue d'ensemble du flux de validation et goulots d'étranglement</div>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid" style={{ marginBottom: 20 }}>
          <div className="kpi"><div className="label">Entrées · 30j</div><div className="value">20</div><div className="trend up">↑ 12% vs 30j précédents</div></div>
          <div className="kpi"><div className="label">En attente</div><div className="value">5</div><div className="trend" style={{ color: 'var(--c-warn-fg)' }}>1 urgente</div></div>
          <div className="kpi"><div className="label">Approuvées</div><div className="value">18</div><div className="trend up">↑ 3</div></div>
          <div className="kpi"><div className="label">Délai moyen</div><div className="value">2.3j</div><div className="trend up">↓ 0.4j</div></div>
        </div>

        {/* Sankey */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <div>
              <h3>Flux de validation</h3>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Entrées → étapes → sorties</div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button className="filter-chip">Tous services ▾</button>
              <button className="filter-chip">Tous types ▾</button>
            </div>
          </div>

          {/* Sankey diagram */}
          <svg viewBox="0 0 800 280" style={{ width: '100%', height: 280 }}>
            {/* Source: Soumissions (20) */}
            <rect x="10" y="60" width="14" height="160" fill="var(--c-fg-2)" rx="2" />
            <text x="30" y="80" fontSize="12" fontWeight="600" fill="var(--c-ink)">Soumissions</text>
            <text x="30" y="96" fontSize="11" fill="var(--c-fg-3)">20 documents</text>

            {/* Stage 1 — Validation N1 */}
            <rect x="280" y="40" width="14" height="200" fill="var(--c-brand)" rx="2" />
            <text x="240" y="32" fontSize="12" fontWeight="600" fill="var(--c-ink)">Validation N1</text>

            {/* Stage 2 — Validation N2 */}
            <rect x="540" y="80" width="14" height="120" fill="var(--c-brand-hover)" rx="2" />
            <text x="500" y="72" fontSize="12" fontWeight="600" fill="var(--c-ink)">Validation N2</text>

            {/* Outcomes */}
            <rect x="780" y="40" width="14" height="100" fill="var(--c-success)" rx="2" />
            <text x="700" y="32" fontSize="12" fontWeight="600" fill="var(--c-success-fg)">✓ Approuvés (18)</text>

            <rect x="780" y="160" width="14" height="40" fill="var(--c-warn)" rx="2" />
            <text x="700" y="158" fontSize="11" fontWeight="600" fill="var(--c-warn-fg)">⏱ En attente (5)</text>

            <rect x="780" y="220" width="14" height="20" fill="var(--c-danger)" rx="2" />
            <text x="700" y="218" fontSize="11" fontWeight="600" fill="var(--c-danger-fg)">✗ Rejetés (1)</text>

            {/* Flows */}
            <path d="M 24 140 C 150 140, 150 140, 280 140" stroke="var(--c-brand)" strokeWidth="160" fill="none" strokeOpacity="0.18" />
            <path d="M 294 100 C 400 100, 420 110, 540 130" stroke="var(--c-brand-hover)" strokeWidth="80" fill="none" strokeOpacity="0.22" />
            <path d="M 294 200 C 400 200, 600 200, 780 220" stroke="var(--c-warn)" strokeWidth="40" fill="none" strokeOpacity="0.2" />
            <path d="M 554 100 C 650 90, 700 80, 780 80" stroke="var(--c-success)" strokeWidth="80" fill="none" strokeOpacity="0.25" />
            <path d="M 554 180 C 650 200, 700 220, 780 230" stroke="var(--c-danger)" strokeWidth="20" fill="none" strokeOpacity="0.2" />
          </svg>
        </div>

        {/* Bottleneck + Top validators */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-head">
              <h3>Goulots d'étranglement</h3>
              <a className="link">Détails →</a>
            </div>
            <div className="col" style={{ gap: 10 }}>
              {[
                ['Direction', 4.2, 'danger', 78],
                ['RH', 5.6, 'danger', 95],
                ['Comptabilité', 2.1, 'warn', 42],
                ['Achats', 1.8, 'success', 35],
              ].map(([s, t, tone, pct], i) => (
                <div key={i}>
                  <div className="spread" style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{s}</span>
                    <span className={`chip ${tone}`}>{t}j moyen</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--c-bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: pct + '%', height: '100%', background: `var(--c-${tone})` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Top valideurs · 30j</h3>
              <a className="link">Tous →</a>
            </div>
            <div className="col" style={{ gap: 10 }}>
              {[
                ['Franck YANKEU', 'Administrateur', 47, 'c1'],
                ['Bertha EOCK', 'Directrice', 32, 'c2'],
                ['Raoul WOUAPI', 'Validateur', 18, 'c3'],
                ['Thierry YAOUBA', 'Validateur', 12, 'c4'],
              ].map(([n, r, c, av], i) => (
                <div key={i} className="row" style={{ gap: 10 }}>
                  <div className={`avatar sm ${av}`}>{n.split(' ').map(x => x[0]).join('').slice(0, 2)}</div>
                  <div className="grow">
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{n}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{r}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, fontWeight: 700 }}>{c}</div>
                  <div className="muted" style={{ fontSize: 11 }}>docs</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
