/* global React */

// =========================================================
// PAGE — ARCHIVES (Variante A : Recherche-first + bascule timeline)
// =========================================================
window.PageArchives = function PageArchives() {
  const [view, setView] = React.useState('search');
  const archives = [
    { name: 'Attestation départ congé annuel · Briton', date: '18/03/2026', author: 'Franck YANKEU', av: 'c1', type: 'Permission', size: '1.2 MB', retention: '5 ans' },
    { name: 'Bon de commande #142 · ROY ECHANTILLONS', date: '17/03/2026', author: 'Franck YANKEU', av: 'c1', type: 'Bon commande', size: '450 KB', retention: '10 ans' },
    { name: 'Demande permission · Direction', date: '20/11/2025', author: 'Briton MELI', av: 'c4', type: 'Permission', size: '780 KB', retention: '5 ans' },
    { name: 'Demande permutation · Pédiatrie', date: '04/12/2025', author: 'Sandrina DJ.', av: 'c5', type: 'Permutation', size: '620 KB', retention: '5 ans' },
    { name: 'Facture · ROY ECHANTILLONS DOUALA', date: '03/12/2025', author: 'Franck YANKEU', av: 'c1', type: 'Facture', size: '2.1 MB', retention: '10 ans' },
    { name: 'Ordre de mission #210', date: '21/11/2025', author: 'Franck YANKEU', av: 'c1', type: 'Ordre mission', size: '890 KB', retention: '5 ans' },
    { name: 'Pièce de caisse #88', date: '17/03/2026', author: 'Raoul WOUAPI', av: 'c3', type: 'Pièce caisse', size: '340 KB', retention: '10 ans' },
  ];

  return (
    <>
      <window.Topbar crumbs={['Archives']} actions={
        <>
          <div className="segmented">
            <button className={view === 'search' ? 'active' : ''} onClick={() => setView('search')}><window.Icon name="search" size={12} /> Recherche</button>
            <button className={view === 'timeline' ? 'active' : ''} onClick={() => setView('timeline')}><window.Icon name="clock" size={12} /> Timeline</button>
          </div>
          <button className="btn sm">Export CSV</button>
          <button className="btn sm">Export ZIP</button>
        </>
      } />
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Archives</h1>
            <div className="sub">15 documents archivés · recherche plein texte (OCR indexé)</div>
          </div>
        </div>

        {view === 'search' && (
          <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
            {/* Filters sidebar */}
            <aside className="card" style={{ padding: 16, alignSelf: 'flex-start', position: 'sticky', top: 80 }}>
              <div className="search-input" style={{ marginBottom: 14 }}>
                <window.Icon name="search" size={14} />
                <input placeholder="Plein texte (OCR)…" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div className="mono" style={{ fontSize: 10, fontWeight: 600, color: 'var(--c-fg-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>TYPE</div>
                <div className="col" style={{ gap: 6 }}>
                  {[['Bon commande', 12, true], ['Permission', 8, true], ['Permutation', 3, false], ['Facture', 5, false], ['Ordre mission', 6, false], ['Pièce caisse', 4, false]].map(([t, c, on], i) => (
                    <label key={i} className="row" style={{ gap: 8, cursor: 'pointer', fontSize: 12.5 }}>
                      <input type="checkbox" defaultChecked={on} />
                      <span className="grow">{t}</span>
                      <span className="muted" style={{ fontSize: 11 }}>{c}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div className="mono" style={{ fontSize: 10, fontWeight: 600, color: 'var(--c-fg-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>PÉRIODE</div>
                <div className="col" style={{ gap: 6 }}>
                  <div className="search-input" style={{ padding: '5px 10px', fontSize: 12 }}>De · 01/01/2025</div>
                  <div className="search-input" style={{ padding: '5px 10px', fontSize: 12 }}>À · 30/04/2026</div>
                </div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: 10, fontWeight: 600, color: 'var(--c-fg-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>AUTEUR</div>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <span className="chip brand">Franck</span>
                  <span className="chip">Raoul</span>
                  <span className="chip">Briton</span>
                  <span className="chip">+ 4</span>
                </div>
              </div>
            </aside>

            {/* Results */}
            <div>
              <div className="spread" style={{ marginBottom: 12 }}>
                <div className="muted mono" style={{ fontSize: 11 }}>{archives.length} résultats · trié par date ↓</div>
                <button className="filter-chip">Tri: Date ↓</button>
              </div>
              <div className="col" style={{ gap: 10 }}>
                {archives.map((a, i) => (
                  <div key={i} className="card" style={{ padding: 14 }}>
                    <div className="spread">
                      <div className="row" style={{ gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 36, height: 44, background: 'var(--c-danger-soft)', color: 'var(--c-danger-fg)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>PDF</div>
                        <div className="grow">
                          <div style={{ fontWeight: 600, color: 'var(--c-ink)', fontSize: 13.5 }}>{a.name}</div>
                          <div className="row" style={{ gap: 10, marginTop: 4, fontSize: 12, color: 'var(--c-fg-3)' }}>
                            <span className="row" style={{ gap: 4 }}>
                              <div className={`avatar sm ${a.av}`} style={{ width: 16, height: 16, fontSize: 8 }}>{a.author.split(' ').map(s => s[0]).join('').slice(0, 2)}</div>
                              {a.author}
                            </span>
                            <span>·</span>
                            <span>{a.date}</span>
                            <span>·</span>
                            <span>{a.size}</span>
                            <span>·</span>
                            <span className="chip outline" style={{ fontSize: 10 }}>{a.type}</span>
                            <span className="chip outline" style={{ fontSize: 10 }}>conserv. {a.retention}</span>
                          </div>
                        </div>
                      </div>
                      <div className="row" style={{ gap: 6 }}>
                        <button className="btn xs"><window.Icon name="download" size={11} /></button>
                        <button className="btn xs">Partager</button>
                        <button className="btn xs primary">Restaurer</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'timeline' && (
          <div className="col" style={{ gap: 28 }}>
            {[
              ['Mars 2026', '4 documents', archives.slice(0, 2).concat(archives[6])],
              ['Décembre 2025', '5 documents', [archives[2], archives[3], archives[4]]],
              ['Novembre 2025', '3 documents', [archives[5]]],
            ].map(([month, count, items], idx) => (
              <div key={idx}>
                <div className="row" style={{ gap: 14, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, fontWeight: 700, color: 'var(--c-ink)', letterSpacing: '-0.3px' }}>{month}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{count}</div>
                  </div>
                  <div style={{ flex: 1, height: 1, background: 'var(--c-line)' }}></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {items.map((a, i) => (
                    <div key={i} className="card" style={{ padding: 14 }}>
                      <div className="row" style={{ gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 32, height: 40, background: 'var(--c-danger-soft)', color: 'var(--c-danger-fg)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>PDF</div>
                        <span className="chip success">archivé</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-ink)', marginBottom: 4 }}>{a.name}</div>
                      <div className="muted" style={{ fontSize: 11.5, marginBottom: 10 }}>{a.author} · {a.date}</div>
                      <div className="row" style={{ gap: 6 }}>
                        <button className="btn xs grow">Voir</button>
                        <button className="btn xs grow">Restaurer</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// =========================================================
// PAGE — SERVICES (Variante A : Cards calmes + alerte)
// =========================================================
window.PageServices = function PageServices() {
  const services = [
    { name: 'Direction', members: 6, chef: 'Michel VOUKENG', avChef: 'c2', tone: 'good' },
    { name: 'Accueil', members: 0, chef: null, tone: 'alert' },
    { name: 'Anesthésie', members: 1, chef: 'Emmanuel NDONGO', avChef: 'c3', tone: 'good' },
    { name: 'Bloc Opératoire', members: 2, chef: 'Bertha EOCK', avChef: 'c5', tone: 'good' },
    { name: 'Chirurgie', members: 1, chef: 'Thierry YAOUBA', avChef: 'c4', tone: 'good' },
    { name: 'Biomédical', members: 1, chef: 'Cellule biomed.', avChef: 'c6', tone: 'good' },
    { name: 'Comptabilité', members: 3, chef: 'Cassie HSJM', avChef: 'c4', tone: 'good' },
    { name: 'Informatique', members: 2, chef: 'Franck YANKEU', avChef: 'c1', tone: 'good' },
    { name: 'Maintenance', members: 0, chef: null, tone: 'alert' },
    { name: 'Néonatalogie', members: 2, chef: 'Rodrigue DJEUBOU', avChef: 'c2', tone: 'good' },
    { name: 'Pédiatrie', members: 2, chef: 'Rodrigue DJEUBOU', avChef: 'c2', tone: 'good' },
    { name: 'Pharmacie', members: 1, chef: null, tone: 'alert' },
  ];

  return (
    <>
      <window.Topbar crumbs={['Organisation', 'Services']} actions={
        <>
          <button className="btn sm">Importer CSV</button>
          <button className="btn sm primary"><window.Icon name="plus" size={13} /> Nouveau service</button>
        </>
      } />
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Services</h1>
            <div className="sub">21 services · 63 membres · <b style={{ color: 'var(--c-warn-fg)' }}>3 sans chef assigné</b></div>
          </div>
        </div>

        <div className="filters">
          <div className="search-input" style={{ flex: '0 0 280px' }}><window.Icon name="search" size={14} /><input placeholder="Filtrer un service…" /></div>
          <button className="filter-chip"><span className="label-key">Statut:</span> tous <span className="arrow">▾</span></button>
          <button className="filter-chip active">Sans chef · 3</button>
          <div style={{ marginLeft: 'auto' }}>
            <div className="segmented">
              <button className="active"><window.Icon name="grid" size={11} /> Grille</button>
              <button><window.Icon name="list" size={11} /> Liste</button>
              <button>Org. chart</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {services.map((s, i) => (
            <div key={i} className="card" style={{ padding: 16, borderColor: s.tone === 'alert' ? 'var(--c-warn)' : 'var(--c-line)' }}>
              <div className="spread" style={{ marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 15, color: 'var(--c-ink)', letterSpacing: '-0.2px' }}>{s.name}</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{s.members} membre{s.members !== 1 ? 's' : ''}</div>
                </div>
                {s.tone === 'alert' ? (
                  <span className="chip warn dot">attention</span>
                ) : (
                  <span className="chip success">actif</span>
                )}
              </div>

              {s.chef ? (
                <div className="row" style={{ gap: 10, padding: '10px 0', borderTop: '1px solid var(--c-line-2)', borderBottom: '1px solid var(--c-line-2)', marginBottom: 12 }}>
                  <div className={`avatar sm ${s.avChef}`}>{s.chef.split(' ').map(x => x[0]).join('').slice(0, 2)}</div>
                  <div className="grow">
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.chef}</div>
                    <div className="muted" style={{ fontSize: 11 }}>Chef de service</div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '10px 12px', background: 'var(--c-warn-soft)', border: '1px dashed var(--c-warn)', borderRadius: 'var(--r-md)', marginBottom: 12, fontSize: 12, color: 'var(--c-warn-fg)', fontWeight: 500 }}>
                  ⚠ Aucun chef assigné — assignez-en un
                </div>
              )}

              <div className="row" style={{ gap: 6 }}>
                <button className="btn xs grow">Voir membres</button>
                {s.chef ? <button className="btn xs">Éditer</button> : <button className="btn xs primary">Assigner chef</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
