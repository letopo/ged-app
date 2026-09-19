/* global React, Icon, Sidebar, Topbar */
const { useState: useS1, Fragment: F1 } = React;

// =========================================================
// PAGE · ACCUEIL (Briefing A + Calendrier B mixés)
// =========================================================
window.PageHome = function PageHome({ onGo }) {
  return (
    <>
      <Topbar crumbs={['Accueil']} actions={
        <>
          <button className="btn sm"><Icon name="upload" size={14} /> Upload</button>
          <button className="btn sm primary" onClick={() => onGo && onGo('upload')}><Icon name="plus" size={14} /> Nouveau document</button>
        </>
      } />
      <div className="page">
        {/* Greeting */}
        <div className="page-head">
          <div>
            <div className="mono muted" style={{ fontSize: 11, letterSpacing: 0.6, marginBottom: 6, textTransform: 'uppercase' }}>Mardi 5 mai · Hôpital Saint-Jean-de-Malte</div>
            <h1>Bonjour Franck.</h1>
            <div className="sub">Vous avez <b style={{ color: 'var(--c-warn-fg)' }}>3 tâches urgentes</b> et 12 documents à examiner cette semaine.</div>
          </div>
        </div>

        {/* Hero action card — 1 action urgente mise en avant */}
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--c-brand-soft), var(--c-bg))', border: '1px solid var(--c-brand-soft-2)', marginBottom: 20 }}>
          <div className="spread hero-action">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, background: 'var(--c-warn)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Icon name="clock" size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                  <span className="chip warn dot">À traiter maintenant</span>
                  <span className="chip outline">Échéance dans 2 jours</span>
                </div>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 17, fontWeight: 700, color: 'var(--c-ink)', letterSpacing: '-0.3px' }}>Demande de permission · Bertha EOCK</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>Soumis par Bertha · service Bloc Opératoire · workflow validation 2 niveaux</div>
              </div>
            </div>
            <div className="hero-cta" style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => onGo && onGo('doc-detail', { name: 'Demande de permission · Bertha EOCK', type: 'Permission', service: 'Bloc Op.', who: 'BE', c: 'c2' })}>Voir le document</button>
              <button className="btn primary" onClick={() => { window.gedToast('Document approuvé. Transmis à la validation N2.', { tone: 'success' }); }}>Approuver <Icon name="arrowR" size={14} /></button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          <div className="kpi">
            <span className="label">Total documents</span>
            <span className="value">174</span>
            <span className="trend up"><Icon name="arrowUp" size={11} /> +12% ce mois</span>
          </div>
          <div className="kpi">
            <span className="label">En validation</span>
            <span className="value">3</span>
            <span className="muted" style={{ fontSize: 11 }}>2 urgents</span>
          </div>
          <div className="kpi">
            <span className="label">Approuvés</span>
            <span className="value">142</span>
            <span className="trend up"><Icon name="arrowUp" size={11} /> 81.6%</span>
          </div>
          <div className="kpi">
            <span className="label">Délai moyen</span>
            <span className="value">2.3<span style={{ fontSize: 18, opacity: 0.6 }}>j</span></span>
            <span className="trend up" style={{ color: 'var(--c-success-fg)' }}><Icon name="arrowUp" size={11} style={{ transform: 'rotate(180deg)' }} /> -0.4j</span>
          </div>
        </div>

        {/* Two columns : Calendar + Activity */}
        <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
          {/* LEFT — Calendar + recent docs */}
          <div className="col">
            {/* Calendar */}
            <div className="card">
              <div className="card-head">
                <h3>Mai 2026 · échéances</h3>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button className="btn xs ghost"><Icon name="chevR" size={12} style={{ transform: 'rotate(180deg)' }} /></button>
                  <button className="btn xs">Aujourd'hui</button>
                  <button className="btn xs ghost"><Icon name="chevR" size={12} /></button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d => (
                  <div key={d} style={{ fontSize: 10, fontWeight: 600, color: 'var(--c-fg-3)', textAlign: 'center', padding: '4px 0', textTransform: 'uppercase', letterSpacing: 0.4 }}>{d}</div>
                ))}
                {Array.from({ length: 35 }).map((_, i) => {
                  const day = i - 3;
                  const isMonth = day > 0 && day <= 31;
                  const isToday = day === 5;
                  const tasks = { 5: 3, 7: 1, 12: 2, 18: 1, 22: 1, 28: 4 }[day] || 0;
                  return (
                    <div key={i} style={{
                      aspectRatio: '1.2 / 1',
                      border: '1px solid ' + (isToday ? 'var(--c-brand)' : 'var(--c-line-2)'),
                      borderRadius: 6,
                      padding: 6,
                      background: isToday ? 'var(--c-brand-soft)' : 'var(--c-bg)',
                      opacity: isMonth ? 1 : 0.3,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      cursor: isMonth ? 'pointer' : 'default',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--c-brand)' : 'var(--c-fg)' }}>{isMonth ? day : (day <= 0 ? 30 + day : day - 31)}</div>
                      {tasks > 0 && isMonth && (
                        <div style={{ display: 'flex', gap: 2, marginTop: 'auto' }}>
                          {Array.from({ length: Math.min(tasks, 3) }).map((_, j) => (
                            <div key={j} style={{ flex: 1, height: 3, borderRadius: 2, background: tasks > 2 ? 'var(--c-warn)' : 'var(--c-brand)' }}></div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent documents */}
            <div className="card">
              <div className="card-head">
                <h3>Documents récents</h3>
                <a className="link" onClick={() => onGo && onGo('docs')}>Voir tout →</a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  { name: 'Demande de permission · Bertha EOCK', type: 'Permission', status: 'pending', who: 'BE', c: 'c2', when: 'il y a 2h' },
                  { name: 'Bon de commande #142 · Fournitures', type: 'Bon commande', status: 'approved', who: 'FY', c: 'c1', when: 'il y a 4h' },
                  { name: 'Fiche réception HSJM-Q1', type: 'Fiche', status: 'approved', who: 'CL', c: 'c3', when: 'hier' },
                  { name: 'Ordre de mission #248', type: 'OM', status: 'draft', who: 'RW', c: 'c4', when: 'hier' },
                  { name: 'Pièce de caisse · 04 mai', type: 'PC', status: 'approved', who: 'CH', c: 'c5', when: '04/05' },
                ].map((d, i) => (
                  <div key={i} className="spread" style={{ padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--c-line-2)' : 'none', cursor: 'pointer' }} onClick={() => onGo && onGo('doc-detail', d)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div className={`avatar sm ${d.c}`}>{d.who}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="truncate" style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-ink)' }}>{d.name}</div>
                        <div className="muted" style={{ fontSize: 11.5 }}>{d.type} · {d.when}</div>
                      </div>
                    </div>
                    <span className={`chip ${d.status === 'approved' ? 'success' : d.status === 'pending' ? 'warn' : 'outline'} dot`}>
                      {d.status === 'approved' ? 'Approuvé' : d.status === 'pending' ? 'En validation' : 'Brouillon'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — Activity + shortcuts */}
          <div className="col">
            {/* Quick actions */}
            <div className="card">
              <div className="card-head"><h3>Raccourcis</h3></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { ico: 'upload', label: 'Upload', sub: 'doc unique', target: 'upload' },
                  { ico: 'sparkle', label: 'Scan IA', sub: 'OCR + auto-tag' },
                  { ico: 'tasks', label: 'Mes tâches', sub: '3 en attente' },
                  { ico: 'stats', label: 'Statistiques', sub: 'mensuel' },
                ].map((a, i) => (
                  <button key={i} className="btn" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: '12px 14px', height: 'auto' }} onClick={() => a.target && onGo && onGo(a.target)}>
                    <Icon name={a.ico} size={18} style={{ color: 'var(--c-brand)' }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</div>
                      <div className="muted" style={{ fontSize: 11, fontWeight: 400 }}>{a.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div className="card" style={{ flex: 1 }}>
              <div className="card-head">
                <h3>Activité</h3>
                <a className="link">Tout voir →</a>
              </div>
              <div className="col" style={{ gap: 0 }}>
                <div className="mono muted" style={{ fontSize: 10, letterSpacing: 0.6, padding: '4px 0 8px', textTransform: 'uppercase' }}>Aujourd'hui</div>
                {[
                  { who: 'FY', c: 'c1', name: 'Vous', action: 'avez approuvé', target: 'BC #142', t: '14:32' },
                  { who: 'BE', c: 'c2', name: 'Bertha E.', action: 'a soumis', target: 'Demande permission', t: '11:08' },
                  { who: 'RW', c: 'c4', name: 'Raoul W.', action: 'a archivé', target: 'OM #247', t: '09:15' },
                ].map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--c-line-2)' }}>
                    <div className={`avatar sm ${a.c}`}>{a.who}</div>
                    <div style={{ flex: 1, fontSize: 12.5 }}>
                      <span style={{ color: 'var(--c-ink)', fontWeight: 600 }}>{a.name}</span>{' '}
                      <span className="muted">{a.action}</span>{' '}
                      <span style={{ color: 'var(--c-brand)', fontWeight: 500 }}>{a.target}</span>
                      <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>{a.t}</div>
                    </div>
                  </div>
                ))}
                <div className="mono muted" style={{ fontSize: 10, letterSpacing: 0.6, padding: '12px 0 8px', textTransform: 'uppercase' }}>Hier</div>
                {[
                  { who: 'CL', c: 'c3', name: 'Cellule biomed', action: 'a uploadé', target: 'Fiche réception', t: '17:44' },
                  { who: 'BE', c: 'c2', name: 'Bertha E.', action: 'a commenté', target: 'OM #248', t: '15:20' },
                ].map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i === 0 ? '1px solid var(--c-line-2)' : 'none' }}>
                    <div className={`avatar sm ${a.c}`}>{a.who}</div>
                    <div style={{ flex: 1, fontSize: 12.5 }}>
                      <span style={{ color: 'var(--c-ink)', fontWeight: 600 }}>{a.name}</span>{' '}
                      <span className="muted">{a.action}</span>{' '}
                      <span style={{ color: 'var(--c-brand)', fontWeight: 500 }}>{a.target}</span>
                      <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>{a.t}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
