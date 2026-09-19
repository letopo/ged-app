/* global React */
const { useState, useEffect, Fragment } = React;

// =========================================================
// SHARED ICONS (inline SVG, 16px)
// =========================================================
window.Icon = function Icon({ name, size = 16, style }) {
  const paths = {
    home: 'M3 11l9-8 9 8M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5',
    docs: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
    upload: 'M12 16V4m0 0l-5 5m5-5l5 5M4 20h16',
    archive: 'M3 7h18v3H3zM5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9M10 14h4',
    tasks: 'M9 11l3 3 8-8M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0',
    workflow: 'M3 6h6v6H3zM15 6h6v6h-6zM9 9h6M3 18h6M21 18h-6M6 12v6M18 12v6',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    services: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
    audit: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13l2 2 4-4',
    stats: 'M3 3v18h18M7 14l4-4 4 4 5-5',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
    plus: 'M12 5v14M5 12h14',
    filter: 'M22 3H2l8 9.46V19l4 2v-8.54z',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    more: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    chevR: 'M9 18l6-6-6-6',
    chevD: 'M6 9l6 6 6-6',
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    kanban: 'M5 3h4v18H5zM15 3h4v10h-4z',
    calendar: 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
    arrowUp: 'M12 19V5M5 12l7-7 7 7',
    arrowR: 'M5 12h14M12 5l7 7-7 7',
    pen: 'M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18zM2 2l7.586 7.586M11 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    signature: 'M3 17c3-6 5-6 6-2s3 4 5-1 4-4 7 1M3 21h18',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    smartphone: 'M5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 19h2',
    sparkle: 'M12 3l1.9 5.8L20 11l-5.7 2.2L12 19l-2.3-5.8L4 11l6.1-2.2z',
    check: 'M20 6L9 17l-5-5',
    x: 'M18 6L6 18M6 6l12 12',
    info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16v-4M12 8h.01',
    checkCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 12l2 2 4-4',
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d={paths[name] || paths.docs} />
    </svg>
  );
};

// =========================================================
// SIDEBAR (Navigation A)
// =========================================================
window.Sidebar = function Sidebar({ active, onGo, badges = {} }) {
  const sections = [
    { name: 'Travail', items: [
      { key: 'home', label: 'Accueil', icon: 'home' },
      { key: 'docs', label: 'Documents', icon: 'docs', badge: '174' },
      { key: 'tasks', label: 'Mes tâches', icon: 'tasks', badge: '3', urgent: true },
      { key: 'workflow', label: 'Workflow', icon: 'workflow' },
      { key: 'archives', label: 'Archives', icon: 'archive' },
    ]},
    { name: 'Organisation', items: [
      { key: 'users', label: 'Utilisateurs', icon: 'users' },
      { key: 'services', label: 'Services', icon: 'services' },
      { key: 'stats', label: 'Statistiques', icon: 'stats' },
      { key: 'audit', label: "Journal d'audit", icon: 'audit' },
    ]},
    { name: 'Système', items: [
      { key: 'settings', label: 'Paramètres', icon: 'settings' },
    ]},
  ];

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <img src="design_system/wordmark-mark.svg" alt="GED" width="26" height="26" style={{ display: 'block' }} />
        <div className="name">GED</div>
        <div className="org" title="Organisation active">
          HSJM <Icon name="chevD" size={11} />
        </div>
      </div>

      <div className="sb-search">
        <Icon name="search" size={14} />
        <span>Rechercher…</span>
        <span className="kbd">⌘K</span>
      </div>

      {sections.map(sec => (
        <div key={sec.name} style={{ display: 'contents' }}>
          <div className="sb-section">{sec.name}</div>
          {sec.items.map(it => (
            <a key={it.key} className={"sb-item" + (it.key === active ? " active" : "")} onClick={() => { if (onGo && it.key !== 'audit') onGo(it.key); }}>
              <Icon name={it.icon} size={16} style={{ color: 'currentColor' }} />
              <span className="label">{it.label}</span>
              {it.badge && <span className={"badge" + (it.urgent ? " urgent" : "")}>{it.badge}</span>}
            </a>
          ))}
        </div>
      ))}

      <div className="sb-user">
        <div className="avatar c1">FY</div>
        <div className="info">
          <div className="nm">Franck Y.</div>
          <div className="rl">Administrateur</div>
        </div>
        <button className="btn ghost" style={{ padding: 4 }}><Icon name="more" size={14} /></button>
      </div>
    </aside>
  );
};

// =========================================================
// TOPBAR
// =========================================================
window.Topbar = function Topbar({ crumbs, actions }) {
  return (
    <div className="topbar">
      <div className="crumb">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <Icon name="chevR" size={12} style={{ opacity: 0.4 }} />}
            {i === crumbs.length - 1 ? <b>{c}</b> : <span>{c}</span>}
          </span>
        ))}
      </div>
      <div className="actions">
        {actions}
        <button className="icon-btn notif-dot" title="Notifications"><Icon name="bell" size={16} /></button>
      </div>
    </div>
  );
};

// =========================================================
// PROTO NAV (between pages)
// =========================================================
window.ProtoNav = function ProtoNav({ page, onChange }) {
  const pages = [
    { id: 'home', label: 'Accueil' },
    { id: 'docs', label: 'Documents' },
    { id: 'doc-detail', label: 'Aperçu doc' },
    { id: 'upload', label: 'Upload' },
  ];
  return (
    <div className="proto-nav">
      {pages.map(p => (
        <button key={p.id} className={page === p.id ? 'active' : ''} onClick={() => onChange(p.id)}>{p.label}</button>
      ))}
    </div>
  );
};
