/* global React */

// =========================================================
// PAGE — UTILISATEURS (Variante C : Table propre 4 colonnes + bulk)
// =========================================================
window.PageUsers = function PageUsers() {
  const [selected, setSelected] = React.useState([]);
  const users = [
    { id: 1, name: 'Achille EWELLE', email: 'aewelle@gmail.com', role: 'validateur', service: 'Médecine', sign: true, stamp: false, last: 'il y a 2h', active: true, av: 'c3' },
    { id: 2, name: 'Bertha EOCK', email: 'b.eock@hsjm.cm', role: 'directeur', service: 'Bloc Op.', sign: true, stamp: true, last: "aujourd'hui", active: true, av: 'c5' },
    { id: 3, name: 'Cassie HSJM', email: 'caisse@hsjm.cm', role: 'caissier', service: 'Comptabilité', sign: false, stamp: false, last: 'hier', active: true, av: 'c4' },
    { id: 4, name: 'Franck YANKEU', email: 'aureleyankeu@gmail.com', role: 'admin', service: 'Informatique', sign: true, stamp: false, last: 'maintenant', active: true, av: 'c1' },
    { id: 5, name: 'Raoul WOUAPI', email: 'raoul.w@hsjm.cm', role: 'validateur', service: 'Direction', sign: true, stamp: true, last: 'il y a 1j', active: true, av: 'c2' },
    { id: 6, name: 'Sandrina DJEGUSSI', email: 'majoneo@hsjm.cm', role: 'validateur', service: 'Néonat.', sign: false, stamp: false, last: 'il y a 3j', active: true, av: 'c5' },
    { id: 7, name: 'Thierry YAOUBA', email: 'major@hsjm.cm', role: 'validateur', service: 'Chirurgie', sign: true, stamp: true, last: 'il y a 5j', active: true, av: 'c4' },
    { id: 8, name: 'Briton MELI', email: 'briton.m@hsjm.cm', role: 'utilisateur', service: 'Direction', sign: false, stamp: false, last: 'il y a 12j', active: false, av: 'c6' },
  ];
  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const roleChip = (r) => {
    const map = { admin: 'brand', directeur: 'info', validateur: 'success', caissier: 'warn', utilisateur: 'outline' };
    return <span className={`chip ${map[r] || 'outline'}`}>{r}</span>;
  };

  return (
    <>
      <window.Topbar crumbs={['Organisation', 'Utilisateurs']} actions={
        <>
          <button className="btn sm">Importer CSV</button>
          <button className="btn sm primary"><window.Icon name="plus" size={13} /> Inviter</button>
        </>
      } />
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Utilisateurs</h1>
            <div className="sub">38 membres · 36 actifs · 2 désactivés</div>
          </div>
        </div>

        <div className="filters">
          <div className="search-input" style={{ flex: '0 0 280px' }}><window.Icon name="search" size={14} /><input placeholder="Rechercher un utilisateur…" /></div>
          <button className="filter-chip"><span className="label-key">Rôle:</span> tous <span className="arrow">▾</span></button>
          <button className="filter-chip"><span className="label-key">Service:</span> tous <span className="arrow">▾</span></button>
          <button className="filter-chip active">Statut: actifs</button>
        </div>

        {selected.length > 0 && (
          <div className="card" style={{ background: 'var(--c-brand-soft)', border: '1px solid var(--c-brand)', padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 600, color: 'var(--c-brand-fg)', fontSize: 13 }}>{selected.length} sélectionné{selected.length > 1 ? 's' : ''}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button className="btn sm">Changer rôle</button>
              <button className="btn sm">Changer service</button>
              <button className="btn sm">Réinitialiser MDP</button>
              <button className="btn sm danger">Désactiver</button>
              <button className="btn sm ghost" onClick={() => setSelected([])}>Annuler</button>
            </div>
          </div>
        )}

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" checked={selected.length === users.length} onChange={() => setSelected(selected.length === users.length ? [] : users.map(u => u.id))} /></th>
                <th>Utilisateur</th>
                <th>Rôle · Service</th>
                <th>Signature / Cachet</th>
                <th>Dernière activité</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={selected.includes(u.id) ? 'selected' : ''}>
                  <td><input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} /></td>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <div className={`avatar ${u.av}`}>{u.name.split(' ').map(s => s[0]).join('').slice(0, 2)}</div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--c-ink)', fontSize: 13.5 }}>{u.name}</div>
                        <div className="muted" style={{ fontSize: 11.5 }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>{roleChip(u.role)}<span className="muted" style={{ fontSize: 12 }}>· {u.service}</span></div>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6, fontSize: 12 }}>
                      <span className="chip" style={{ background: u.sign ? 'var(--c-success-soft)' : 'var(--c-bg-3)', color: u.sign ? 'var(--c-success-fg)' : 'var(--c-fg-3)' }}>{u.sign ? '✓ Signature' : '— Signature'}</span>
                      <span className="chip" style={{ background: u.stamp ? 'var(--c-success-soft)' : 'var(--c-bg-3)', color: u.stamp ? 'var(--c-success-fg)' : 'var(--c-fg-3)' }}>{u.stamp ? '✓ Cachet' : '— Cachet'}</span>
                    </div>
                  </td>
                  <td className="muted" style={{ fontSize: 12.5 }}>{u.last}</td>
                  <td><button className="btn xs ghost"><window.Icon name="more" size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// =========================================================
// PAGE — STATISTIQUES (A + C : Q&R éditorial + Explorer)
// =========================================================
window.PageStats = function PageStats() {
  const [view, setView] = React.useState('story');
  return (
    <>
      <window.Topbar crumbs={['Statistiques']} actions={
        <>
          <div className="segmented">
            <button className={view === 'story' ? 'active' : ''} onClick={() => setView('story')}>Insights</button>
            <button className={view === 'explore' ? 'active' : ''} onClick={() => setView('explore')}>Explorer</button>
          </div>
          <button className="btn sm">12 mois ▾</button>
          <button className="btn sm"><window.Icon name="download" size={13} /> Export PDF</button>
        </>
      } />
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Statistiques</h1>
            <div className="sub">{view === 'story' ? 'Insights éditoriaux générés depuis vos données' : 'Construisez votre rapport — glissez les champs'}</div>
          </div>
        </div>

        {view === 'story' && (
          <div className="col" style={{ gap: 16 }}>
            <div className="kpi-grid">
              <div className="kpi"><div className="label">Documents actifs</div><div className="value">100</div><div className="trend up">↑ 12% vs mois dernier</div></div>
              <div className="kpi"><div className="label">Taux d'approbation</div><div className="value">79%</div><div className="trend up">↑ 3 pts</div></div>
              <div className="kpi"><div className="label">Délai moyen</div><div className="value">2.3j</div><div className="trend up">↓ 0.4j</div></div>
              <div className="kpi"><div className="label">En retard</div><div className="value">1</div><div className="trend up">↓ 2</div></div>
            </div>

            <div className="card">
              <div className="mono" style={{ fontSize: 10, fontWeight: 600, color: 'var(--c-brand)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>QUESTION 1 · VOLUME</div>
              <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 700, color: 'var(--c-ink)', margin: '0 0 4px', letterSpacing: '-0.4px' }}>L'activité reprend après une baisse hivernale.</h2>
              <p className="muted" style={{ fontSize: 13.5, margin: '0 0 18px' }}>Avril +28% vs Mars. Le pic actuel est porté par les bons de commande (achats de fin de trimestre).</p>
              <svg viewBox="0 0 800 200" style={{ width: '100%', height: 200 }}>
                <line x1="0" y1="160" x2="800" y2="160" stroke="var(--c-line)" />
                {[40, 60, 80, 70, 90, 60, 50, 40, 55, 70, 60, 130].map((v, i) => {
                  const x = 30 + i * 65;
                  const y = 170 - v;
                  return (
                    <g key={i}>
                      <rect x={x - 12} y={y} width="24" height={170 - y} fill={i === 11 ? 'var(--c-brand)' : 'var(--c-brand-soft-2)'} rx="3" />
                      <text x={x} y="190" fontSize="10" textAnchor="middle" fill="var(--c-fg-3)">{['Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc','Jan','Fév','Mar','Avr'][i]}</text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card">
                <div className="mono" style={{ fontSize: 10, fontWeight: 600, color: 'var(--c-brand)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>QUESTION 2 · MIX</div>
                <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 16, fontWeight: 700, color: 'var(--c-ink)', margin: '0 0 14px' }}>Permission domine, suivi des bons de commande.</h3>
                <svg viewBox="0 0 200 160" style={{ width: '100%', height: 160 }}>
                  <circle cx="100" cy="80" r="60" fill="none" stroke="var(--c-line-2)" strokeWidth="20" />
                  <circle cx="100" cy="80" r="60" fill="none" stroke="var(--c-brand)" strokeWidth="20" strokeDasharray="150 377" transform="rotate(-90 100 80)" />
                  <circle cx="100" cy="80" r="60" fill="none" stroke="var(--c-success)" strokeWidth="20" strokeDasharray="100 377" strokeDashoffset="-150" transform="rotate(-90 100 80)" />
                  <circle cx="100" cy="80" r="60" fill="none" stroke="var(--c-warn)" strokeWidth="20" strokeDasharray="80 377" strokeDashoffset="-250" transform="rotate(-90 100 80)" />
                  <text x="100" y="78" fontSize="22" fontWeight="700" textAnchor="middle" fill="var(--c-ink)">100</text>
                  <text x="100" y="94" fontSize="10" textAnchor="middle" fill="var(--c-fg-3)">documents</text>
                </svg>
                <div className="col" style={{ gap: 6, marginTop: 10 }}>
                  {[['Permission', 40, 'var(--c-brand)'], ['Bon commande', 26, 'var(--c-success)'], ['Ordre mission', 21, 'var(--c-warn)'], ['Autres', 13, 'var(--c-line)']].map(([l, v, c], i) => (
                    <div key={i} className="row" style={{ fontSize: 12 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: c, marginRight: 6 }}></span><span className="grow">{l}</span><b>{v}%</b></div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="mono" style={{ fontSize: 10, fontWeight: 600, color: 'var(--c-brand)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>QUESTION 3 · CONTRIBUTEURS</div>
                <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 16, fontWeight: 700, color: 'var(--c-ink)', margin: '0 0 14px' }}>Franck contribue 5× plus que la moyenne.</h3>
                <div className="col" style={{ gap: 10 }}>
                  {[['Franck YANKEU', 47, 'c1'], ['Bertha EOCK', 32, 'c2'], ['Raoul WOUAPI', 18, 'c3'], ['Thierry YAOUBA', 12, 'c4'], ['Sandrina DJ.', 8, 'c5']].map(([n, v, c], i) => (
                    <div key={i}>
                      <div className="spread" style={{ marginBottom: 4 }}>
                        <div className="row" style={{ gap: 6 }}><div className={`avatar sm ${c}`}>{n.split(' ').map(x => x[0]).join('').slice(0, 2)}</div><span style={{ fontSize: 12.5, fontWeight: 500 }}>{n}</span></div>
                        <b style={{ fontSize: 13 }}>{v}</b>
                      </div>
                      <div style={{ height: 6, background: 'var(--c-bg-3)', borderRadius: 3 }}><div style={{ width: (v / 47 * 100) + '%', height: '100%', background: 'var(--c-brand)', borderRadius: 3 }}></div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card" style={{ background: 'var(--c-brand-soft)', borderColor: 'var(--c-brand-soft-2)' }}>
              <div className="row" style={{ gap: 12 }}>
                <div style={{ width: 32, height: 32, background: 'var(--c-brand)', color: 'white', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><window.Icon name="sparkle" size={16} /></div>
                <div className="grow">
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 14, fontWeight: 700, color: 'var(--c-brand-fg)', marginBottom: 4 }}>Insight IA</div>
                  <div style={{ fontSize: 13, color: 'var(--c-brand-fg)' }}>Le service Direction est le goulot le plus important (4.2j moyens). Réassigner certaines validations à un délégué pourrait réduire le délai global de ~30%.</div>
                </div>
                <button className="btn sm primary">Voir le plan</button>
              </div>
            </div>
          </div>
        )}

        {view === 'explore' && (
          <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
            <aside className="card" style={{ padding: 14, alignSelf: 'flex-start' }}>
              <div className="mono" style={{ fontSize: 10, fontWeight: 600, color: 'var(--c-fg-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>DIMENSIONS</div>
              <div className="col" style={{ gap: 6, marginBottom: 14 }}>
                {['Service', 'Type', 'Auteur', 'Statut', 'Date'].map((d, i) => (
                  <div key={i} style={{ padding: '6px 10px', border: '1px dashed var(--c-line)', borderRadius: 'var(--r-sm)', fontSize: 12.5, cursor: 'grab' }}>+ {d}</div>
                ))}
              </div>
              <div className="mono" style={{ fontSize: 10, fontWeight: 600, color: 'var(--c-fg-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>MESURES</div>
              <div className="col" style={{ gap: 6 }}>
                {['Σ Nombre', 'Σ Délai moyen', 'Σ % approuvés'].map((d, i) => (
                  <div key={i} style={{ padding: '6px 10px', border: '1px dashed var(--c-line)', borderRadius: 'var(--r-sm)', fontSize: 12.5, cursor: 'grab' }}>{d}</div>
                ))}
              </div>
            </aside>
            <div className="card">
              <div className="row" style={{ gap: 8, marginBottom: 14 }}>
                <span className="chip brand">Service</span>
                <span className="muted" style={{ fontSize: 12 }}>par</span>
                <span className="chip brand">Σ Délai moyen</span>
                <span style={{ marginLeft: 'auto' }} className="filter-chip">Bar ▾</span>
              </div>
              <svg viewBox="0 0 600 280" style={{ width: '100%', height: 280 }}>
                {[['Direction', 4.2, 'danger'], ['RH', 5.6, 'danger'], ['Comptabilité', 2.1, 'warn'], ['Achats', 1.8, 'success'], ['Médecine', 2.5, 'warn']].map(([n, v, t], i) => (
                  <g key={i}>
                    <rect x="120" y={20 + i * 50} width={v / 6 * 400} height="32" fill={`var(--c-${t})`} rx="4" />
                    <text x="110" y={40 + i * 50} fontSize="12" textAnchor="end" fill="var(--c-ink)" fontWeight="500">{n}</text>
                    <text x={130 + v / 6 * 400} y={40 + i * 50} fontSize="12" fill="var(--c-ink)" fontWeight="600">{v}j</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// =========================================================
// PAGE — PARAMÈTRES (Variante A : Sidebar par section)
// =========================================================
window.PageSettings = function PageSettings() {
  const [section, setSection] = React.useState('profile');
  const sections = [
    { group: 'COMPTE', items: [['profile', 'Profil', 'home'], ['security', 'Sécurité · 2FA', 'settings'], ['notifications', 'Notifications', 'bell']] },
    { group: 'ORGANISATION', items: [['team', 'Équipe', 'users'], ['branding', 'Branding', 'sparkle'], ['license', 'Licence', 'docs']] },
    { group: 'AVANCÉ', items: [['ai', 'IA · OCR', 'sparkle'], ['integrations', 'Intégrations', 'workflow'], ['api', 'API · Webhooks', 'audit']] },
  ];

  return (
    <>
      <window.Topbar crumbs={['Paramètres', sections.flatMap(s => s.items).find(i => i[0] === section)?.[1] || '']} />
      <div className="page" style={{ maxWidth: 'none', padding: 0 }}>
        <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: 'calc(100vh - 60px)' }}>
          <aside style={{ borderRight: '1px solid var(--c-line)', padding: 24, background: 'var(--c-bg)' }}>
            <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: 'var(--c-ink)' }}>Paramètres</h1>
            {sections.map(s => (
              <div key={s.group} style={{ marginBottom: 16 }}>
                <div className="mono" style={{ fontSize: 10, fontWeight: 600, color: 'var(--c-fg-3)', textTransform: 'uppercase', letterSpacing: 0.5, padding: '0 8px 6px' }}>{s.group}</div>
                {s.items.map(([k, l, ic]) => (
                  <button key={k} onClick={() => setSection(k)} className="sb-item" style={{ width: '100%', textAlign: 'left', border: 'none', background: section === k ? 'var(--c-bg-3)' : 'transparent', color: section === k ? 'var(--c-ink)' : 'var(--c-fg-2)', fontWeight: section === k ? 600 : 500, position: 'relative' }}>
                    <window.Icon name={ic} size={15} />
                    <span className="label">{l}</span>
                    {section === k && <span style={{ position: 'absolute', left: -24, top: '50%', transform: 'translateY(-50%)', width: 3, height: 16, background: 'var(--c-brand)', borderRadius: '0 2px 2px 0' }}></span>}
                  </button>
                ))}
              </div>
            ))}
          </aside>

          <div style={{ padding: '32px 40px', maxWidth: 720 }}>
            {section === 'profile' && (
              <div className="col" style={{ gap: 24 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 700, color: 'var(--c-ink)', margin: '0 0 4px', letterSpacing: '-0.4px' }}>Profil</h2>
                  <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>Informations visibles par votre organisation.</p>
                </div>
                <div className="row" style={{ gap: 16 }}>
                  <div className="avatar xl c1">FY</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Photo de profil</div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>PNG ou JPG · 2 MB max</div>
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn sm">Changer</button>
                      <button className="btn sm ghost">Supprimer</button>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div><label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6, fontWeight: 500 }}>Prénom</label><div className="search-input" style={{ color: 'var(--c-ink)' }}>Franck</div></div>
                  <div><label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6, fontWeight: 500 }}>Nom</label><div className="search-input" style={{ color: 'var(--c-ink)' }}>YANKEU</div></div>
                </div>
                <div><label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6, fontWeight: 500 }}>Email</label><div className="search-input" style={{ color: 'var(--c-ink)' }}>aureleyankeu@gmail.com</div></div>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6, fontWeight: 500 }}>Langue de l'interface</label>
                  <div className="row" style={{ gap: 6 }}>
                    <span className="chip brand">FR · Français</span>
                    <span className="chip">EN · English</span>
                    <span className="chip">ES · Español</span>
                    <span className="chip">AR · العربية</span>
                  </div>
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6, fontWeight: 500 }}>Signature électronique</label>
                  <div style={{ padding: 16, border: '1px dashed var(--c-line)', borderRadius: 'var(--r-md)', textAlign: 'center', color: 'var(--c-fg-3)', fontSize: 12.5 }}>
                    Aucune signature configurée — <a className="link" style={{ color: 'var(--c-brand)', textDecoration: 'none', fontWeight: 600 }}>uploader ou dessiner</a>
                  </div>
                </div>
                <div className="row" style={{ gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--c-line)', paddingTop: 16 }}>
                  <button className="btn">Annuler</button>
                  <button className="btn primary">Enregistrer</button>
                </div>
              </div>
            )}
            {section !== 'profile' && (
              <div className="col" style={{ gap: 16 }}>
                <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 700, color: 'var(--c-ink)', margin: 0, letterSpacing: '-0.4px' }}>{sections.flatMap(s => s.items).find(i => i[0] === section)?.[1]}</h2>
                <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>Section en cours de design — la structure suit le même pattern (form + actions sticky).</p>
                <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--c-fg-3)' }}>Contenu à venir</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
