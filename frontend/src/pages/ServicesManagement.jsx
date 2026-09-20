// frontend/src/pages/ServicesManagement.jsx — Redesign complet
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Users, Building2, AlertCircle, Loader,
  Search, Bell, Upload, LayoutGrid, List, GitBranch,
  ChevronDown,
} from 'lucide-react';
import { servicesAPI } from '../services/api';
import ServiceDetailsModal from '../components/ServiceDetailsModal';
import AddMemberModal from '../components/AddMemberModal';
import AddServiceModal from '../components/AddServiceModal';
import { useConfirm } from '../components/ConfirmModal';

const FONCTIONS = [
  'Personnel paramédical', 'Secrétaire', 'Major', 'Chef de Service',
  'Chef de Service Adjoint', 'Directrice Des Soins', 'Médecin Chef',
  'Responsable SecuLog', 'Directeur du Soutien', 'Directeur Général Adjoint(e)',
  'Directeur Général', 'Infirmier(e)', 'Sage-femme', 'Aide-soignant(e)',
  'Technicien de laboratoire', 'Pharmacien(ne)', 'Radiologue', 'Anesthésiste',
  'Chirurgien(ne)', 'Kinésithérapeute', 'Comptable', 'Responsable RH',
  "Agent d'entretien", 'Agent de sécurité', 'Chauffeur',
  'Gestionnaire Logistic des Biens', 'Technicien biomédical(e)',
  'Référent informaticien(e)', 'Informaticien(ne)', 'Responsable Achats',
];

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ firstName, lastName, size = 32 }) {
  const COLORS = ['#1B3A6B','#1A7A4A','#B45309','#C0392B','#1557A0','#5B89D6','#7C3AED','#065F46','#9A3412'];
  const name = `${firstName||''}${lastName||''}`;
  const idx = name ? name.charCodeAt(0) % COLORS.length : 0;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: COLORS[idx], color: '#fff', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700,
    }}>
      {(firstName?.[0]||'').toUpperCase()}{(lastName?.[0]||'').toUpperCase()}
    </div>
  );
}

// ── Service card (grid) ───────────────────────────────────────────────────────
function ServiceCard({ service, onDetails, onAssignChef, onEdit }) {
  const chef  = service.members?.find(m =>
    (m.fonction === 'Chef de Service' || m.isChef) && m.isActive !== false
  );
  const count   = service.members?.filter(m => m.isActive !== false).length || 0;
  const hasChef = !!chef;
  const isAttention = !hasChef;

  return (
    <div
      className={isAttention ? '' : 'ged-card'}
      style={{
        borderRadius: 'var(--radius-3)',
        border: isAttention ? '1.5px solid var(--warning)' : '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '16px 16px 12px',
        display: 'flex', flexDirection: 'column', gap: 0,
        transition: 'box-shadow .15s',
        boxShadow: isAttention ? '0 0 0 0 transparent' : 'var(--shadow-1)',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-2)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = isAttention ? 'none' : 'var(--shadow-1)'}
    >
      {/* Top row */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom: 2 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{service.name}</div>
        <span style={{
          padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600,
          background: isAttention ? 'var(--warning-soft)' : 'var(--success-soft)',
          color: isAttention ? 'var(--warning)' : 'var(--success)',
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 8,
        }}>
          {isAttention ? <><span style={{ width:6, height:6, borderRadius:'50%', background:'var(--warning)', display:'inline-block' }} /> attention</> : 'actif'}
        </span>
      </div>

      {/* Member count */}
      <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 12 }}>
        {count} membre{count !== 1 ? 's' : ''}
      </div>

      {/* Chef or warning */}
      {hasChef ? (
        <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 12 }}>
          <Avatar firstName={chef.user?.firstName} lastName={chef.user?.lastName} size={34} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {chef.user?.firstName} {chef.user?.lastName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Chef de service</div>
          </div>
        </div>
      ) : (
        <div style={{
          border: '1.5px dashed var(--warning)', borderRadius: 'var(--radius-2)',
          padding: '8px 10px', marginBottom: 12, fontSize: 12,
          color: 'var(--warning)', background: 'var(--warning-soft)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ⚠ Aucun chef assigné — assignez-en un
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display:'flex', gap: 8, marginTop: 'auto' }}>
        <button
          onClick={() => onDetails(service)}
          style={{
            flex: 1, height: 30, borderRadius: 'var(--radius-2)',
            border: '1px solid var(--border)', background: 'var(--surface-2)',
            color: 'var(--fg)', fontSize: 12, cursor: 'pointer', fontWeight: 500,
          }}
        >
          Voir membres
        </button>
        {hasChef ? (
          <button
            onClick={() => onEdit(service)}
            style={{
              flex: 1, height: 30, borderRadius: 'var(--radius-2)',
              border: '1px solid var(--border)', background: 'var(--surface-2)',
              color: 'var(--fg)', fontSize: 12, cursor: 'pointer', fontWeight: 500,
            }}
          >
            Éditer
          </button>
        ) : (
          <button
            onClick={() => onAssignChef(service)}
            style={{
              flex: 1, height: 30, borderRadius: 'var(--radius-2)',
              background: 'var(--brand)', color: '#fff',
              border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600,
            }}
          >
            Assigner chef
          </button>
        )}
      </div>
    </div>
  );
}

// ── Service row (list view) ───────────────────────────────────────────────────
function ServiceRow({ service, onDetails, onAssignChef, onEdit }) {
  const chef  = service.members?.find(m => (m.fonction === 'Chef de Service' || m.isChef) && m.isActive !== false);
  const count = service.members?.filter(m => m.isActive !== false).length || 0;
  const hasChef = !!chef;

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:16, padding:'12px 16px',
      borderBottom:'1px solid var(--border)', transition:'background .12s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ flex:2, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:600, color:'var(--fg)' }}>{service.name}</div>
        <div style={{ fontSize:11, color:'var(--fg-muted)' }}>{count} membre{count!==1?'s':''}</div>
      </div>
      <div style={{ flex:2, minWidth:0 }}>
        {hasChef ? (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Avatar firstName={chef.user?.firstName} lastName={chef.user?.lastName} size={26} />
            <span style={{ fontSize:13, color:'var(--fg)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {chef.user?.firstName} {chef.user?.lastName}
            </span>
          </div>
        ) : (
          <span style={{ fontSize:12, color:'var(--warning)', fontWeight:500 }}>⚠ Sans chef</span>
        )}
      </div>
      <div style={{ flex:1 }}>
        <span style={{
          padding:'2px 8px', borderRadius:'var(--radius-full)', fontSize:11, fontWeight:600,
          background: hasChef ? 'var(--success-soft)' : 'var(--warning-soft)',
          color: hasChef ? 'var(--success)' : 'var(--warning)',
        }}>
          {hasChef ? 'actif' : 'attention'}
        </span>
      </div>
      <div style={{ display:'flex', gap:8, flexShrink:0 }}>
        <button onClick={() => onDetails(service)} style={{ height:28, padding:'0 12px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--fg)', fontSize:12, cursor:'pointer' }}>
          Voir membres
        </button>
        {hasChef ? (
          <button onClick={() => onEdit(service)} style={{ height:28, padding:'0 12px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--fg)', fontSize:12, cursor:'pointer' }}>
            Éditer
          </button>
        ) : (
          <button onClick={() => onAssignChef(service)} style={{ height:28, padding:'0 12px', borderRadius:'var(--radius-2)', background:'var(--brand)', color:'#fff', border:'none', fontSize:12, cursor:'pointer', fontWeight:600 }}>
            Assigner chef
          </button>
        )}
      </div>
    </div>
  );
}

// ── Org chart (simple tree) ───────────────────────────────────────────────────
function OrgChart({ services }) {
  return (
    <div style={{ overflowX:'auto', padding:'8px 0' }}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
        {services.map(s => {
          const chef = s.members?.find(m => (m.fonction==='Chef de Service'||m.isChef) && m.isActive!==false);
          const others = s.members?.filter(m => m !== chef && m.isActive!==false) || [];
          return (
            <div key={s.id} className="ged-card" style={{ padding:'14px 16px', width:200, flexShrink:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--fg)', marginBottom:6, borderBottom:'1px solid var(--border)', paddingBottom:6 }}>{s.name}</div>
              {chef && (
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <Avatar firstName={chef.user?.firstName} lastName={chef.user?.lastName} size={24} />
                  <div style={{ fontSize:11, color:'var(--fg)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {chef.user?.firstName} {chef.user?.lastName}
                  </div>
                </div>
              )}
              {others.slice(0,3).map((m,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 0', paddingLeft:8, borderLeft:'2px solid var(--border)' }}>
                  <Avatar firstName={m.user?.firstName} lastName={m.user?.lastName} size={18} />
                  <div style={{ fontSize:11, color:'var(--fg-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {m.user?.firstName} {m.user?.lastName}
                  </div>
                </div>
              ))}
              {others.length > 3 && <div style={{ fontSize:10, color:'var(--fg-subtle)', paddingLeft:8, marginTop:2 }}>+{others.length-3} autres</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function ServicesManagement() {
  const { confirm, ConfirmModalRenderer } = useConfirm();
  const [services, setServices]             = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [showAddService, setShowAddService]   = useState(false);
  const [showAddMember, setShowAddMember]     = useState(false);
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');

  const [view, setView]               = useState('grid');    // 'grid' | 'list' | 'org'
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');   // 'all' | 'actif' | 'attention'
  const [sansChefOnly, setSansChefOnly] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  useEffect(() => { loadServices(); }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await servicesAPI.getServicesWithMembers();
      setServices(response.data.data || []);
      setError('');
    } catch {
      setError('Impossible de charger les services.');
    } finally {
      setLoading(false);
    }
  };

  // Derived stats
  const totalMembers  = useMemo(() => services.reduce((acc, s) => acc + (s.members?.filter(m => m.isActive!==false).length||0), 0), [services]);
  const sansChefCount = useMemo(() => services.filter(s => !s.members?.find(m => (m.fonction==='Chef de Service'||m.isChef)&&m.isActive!==false)).length, [services]);

  // Filtered services
  const filtered = useMemo(() => {
    return services.filter(s => {
      const hasChef = !!s.members?.find(m => (m.fonction==='Chef de Service'||m.isChef)&&m.isActive!==false);
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (sansChefOnly && hasChef) return false;
      if (statusFilter === 'actif' && !hasChef) return false;
      if (statusFilter === 'attention' && hasChef) return false;
      return true;
    });
  }, [services, search, sansChefOnly, statusFilter]);

  const handleServiceClick = (service) => { setSelectedService(service); setShowServiceDetails(true); };
  const handleAssignChef   = (service) => { setSelectedService(service); setShowAddMember(true); };
  const handleEdit         = (service) => { setSelectedService(service); setShowServiceDetails(true); };

  const handleAddService = async (serviceName) => {
    try {
      await servicesAPI.createService({ name: serviceName });
      await loadServices();
      setShowAddService(false);
    } catch { setError('Impossible de créer le service.'); }
  };

  const handleAddMember = async (serviceId, memberData) => {
    try {
      await servicesAPI.addMember(serviceId, memberData);
      await loadServices();
      setShowAddMember(false);
      setSelectedService(null);
    } catch { setError("Impossible d'ajouter le membre."); }
  };

  const handleRemoveMember = async (serviceId, memberId) => {
    const ok = await confirm({ title:'Retirer le membre', message:'Êtes-vous sûr de vouloir retirer ce membre ?', confirmLabel:'Retirer', variant:'warning' });
    if (!ok) return;
    try { await servicesAPI.removeMember(serviceId, memberId); await loadServices(); }
    catch { setError('Impossible de retirer le membre.'); }
  };

  const handleRenameService = async (serviceId, newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) return;
    await servicesAPI.updateService(serviceId, { name: trimmed });
    await loadServices();
    setSelectedService(prev => (prev && prev.id === serviceId) ? { ...prev, name: trimmed } : prev);
  };

  const handleDeleteService = async (serviceId) => {
    const ok = await confirm({ title:'Supprimer le service', message:'Cette action est irréversible.', confirmLabel:'Supprimer', variant:'danger' });
    if (!ok) return;
    try {
      await servicesAPI.deleteService(serviceId);
      await loadServices();
      setShowServiceDetails(false);
      setSelectedService(null);
    } catch { setError('Impossible de supprimer le service.'); }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <Loader size={24} color="var(--fg-muted)" className="animate-spin" />
    </div>
  );

  const VIEW_OPTS = [
    { id:'grid', label:'Grille',     icon:<LayoutGrid size={14}/> },
    { id:'list', label:'Liste',      icon:<List size={14}/> },
    { id:'org',  label:'Org. chart', icon:<GitBranch size={14}/> },
  ];

  return (
    <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px 48px' }} className="animate-pageFade">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, paddingTop:4 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'var(--fg)', margin:'0 0 4px', letterSpacing:'-0.3px' }}>Services</h1>
          <div style={{ fontSize:13, color:'var(--fg-muted)' }}>
            {services.length} services · {totalMembers} membres
            {sansChefCount > 0 && (
              <> · <span style={{ color:'var(--warning)', fontWeight:600 }}>{sansChefCount} sans chef assigné</span></>
            )}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button style={{ display:'inline-flex', alignItems:'center', gap:6, height:34, padding:'0 14px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--fg)', fontSize:13, cursor:'pointer' }}>
            <Upload size={14}/> Importer CSV
          </button>
          <button onClick={() => setShowAddService(true)} style={{ display:'inline-flex', alignItems:'center', gap:6, height:34, padding:'0 14px', borderRadius:'var(--radius-2)', background:'var(--brand)', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            <Plus size={14}/> Nouveau service
          </button>
          <div style={{ width:34, height:34, borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <Bell size={15} color="var(--fg-muted)" />
          </div>
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        {/* Search */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0 12px', height:36, borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', flex:'1 1 200px', maxWidth:320 }}>
          <Search size={14} color="var(--fg-subtle)" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer un service..."
            style={{ flex:1, border:'none', background:'transparent', outline:'none', fontSize:13, color:'var(--fg)' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--fg-subtle)', fontSize:16, lineHeight:1, padding:0 }}>×</button>}
        </div>

        {/* Status dropdown */}
        <div style={{ position:'relative' }}>
          <button onClick={() => setShowStatusMenu(v => !v)} style={{ display:'inline-flex', alignItems:'center', gap:5, height:36, padding:'0 12px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--fg)', fontSize:13, cursor:'pointer' }}>
            Statut: {statusFilter === 'all' ? 'tous' : statusFilter} <ChevronDown size={13} color="var(--fg-muted)" />
          </button>
          {showStatusMenu && (
            <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:100, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-3)', boxShadow:'var(--shadow-3)', minWidth:140, overflow:'hidden' }}>
              {[['all','Tous'], ['actif','Actif'], ['attention','Attention']].map(([val, lbl]) => (
                <div key={val} onClick={() => { setStatusFilter(val); setShowStatusMenu(false); }}
                  style={{ padding:'8px 14px', fontSize:13, cursor:'pointer', background: statusFilter===val ? 'var(--brand-soft)' : 'transparent', color: statusFilter===val ? 'var(--brand)' : 'var(--fg)' }}
                  onMouseEnter={e => { if (statusFilter!==val) e.currentTarget.style.background='var(--surface-2)'; }}
                  onMouseLeave={e => { if (statusFilter!==val) e.currentTarget.style.background='transparent'; }}
                >{lbl}</div>
              ))}
            </div>
          )}
        </div>

        {/* Sans chef filter pill */}
        {sansChefCount > 0 && (
          <button onClick={() => setSansChefOnly(v => !v)} style={{
            display:'inline-flex', alignItems:'center', gap:6, height:36, padding:'0 14px',
            borderRadius:'var(--radius-2)', fontSize:13, cursor:'pointer', fontWeight:500,
            border: sansChefOnly ? '1px solid var(--warning)' : '1px solid var(--border)',
            background: sansChefOnly ? 'var(--warning-soft)' : 'var(--surface-2)',
            color: sansChefOnly ? 'var(--warning)' : 'var(--fg-muted)',
          }}>
            Sans chef · {sansChefCount}
          </button>
        )}

        {/* Spacer */}
        <div style={{ flex:1 }} />

        {/* View toggle */}
        <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:'var(--radius-2)', overflow:'hidden' }}>
          {VIEW_OPTS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              display:'inline-flex', alignItems:'center', gap:5,
              height:34, padding:'0 12px', border:'none', cursor:'pointer', fontSize:12,
              background: view===v.id ? 'var(--brand)' : 'var(--surface-2)',
              color: view===v.id ? '#fff' : 'var(--fg-muted)',
              fontWeight: view===v.id ? 600 : 400,
              borderRight: v.id !== 'org' ? '1px solid var(--border)' : 'none',
            }}>{v.icon}{v.label}</button>
          ))}
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:'var(--radius-2)', marginBottom:16, fontSize:13, background:'var(--danger-soft)', color:'var(--danger)', border:'1px solid var(--danger)' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <Building2 size={44} color="var(--border-strong)" style={{ marginBottom:12 }} />
          <div style={{ fontSize:14, fontWeight:500, color:'var(--fg-muted)', marginBottom:4 }}>
            {services.length === 0 ? 'Aucun service disponible' : 'Aucun service correspond aux filtres'}
          </div>
          {services.length === 0 && (
            <button onClick={() => setShowAddService(true)} style={{ marginTop:12, display:'inline-flex', alignItems:'center', gap:6, height:34, padding:'0 14px', borderRadius:'var(--radius-2)', background:'var(--brand)', color:'#fff', border:'none', fontSize:13, cursor:'pointer' }}>
              <Plus size={14}/> Créer un service
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16 }}>
          {filtered.map(s => (
            <ServiceCard
              key={s.id} service={s}
              onDetails={handleServiceClick}
              onAssignChef={handleAssignChef}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : view === 'list' ? (
        <div className="ged-card" style={{ overflow:'hidden', padding:0 }}>
          {/* List header */}
          <div style={{ display:'flex', gap:16, padding:'10px 16px', background:'var(--surface-2)', borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:700, color:'var(--fg-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
            <div style={{ flex:2 }}>Service</div>
            <div style={{ flex:2 }}>Chef de service</div>
            <div style={{ flex:1 }}>Statut</div>
            <div style={{ width:200 }}>Actions</div>
          </div>
          {filtered.map(s => (
            <ServiceRow
              key={s.id} service={s}
              onDetails={handleServiceClick}
              onAssignChef={handleAssignChef}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <OrgChart services={filtered} />
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showAddService && (
        <AddServiceModal onAdd={handleAddService} onClose={() => setShowAddService(false)} />
      )}
      {showAddMember && selectedService && (
        <AddMemberModal
          service={selectedService}
          fonctions={FONCTIONS}
          onAdd={handleAddMember}
          onClose={() => { setShowAddMember(false); setSelectedService(null); }}
        />
      )}
      {showServiceDetails && selectedService && (
        <ServiceDetailsModal
          service={selectedService}
          fonctions={FONCTIONS}
          onClose={() => { setShowServiceDetails(false); setSelectedService(null); }}
          onRefresh={loadServices}
          onRemoveMember={handleRemoveMember}
          onDeleteService={handleDeleteService}
          onRenameService={handleRenameService}
          onAddMember={(service) => {
            setShowServiceDetails(false);
            setSelectedService(service);
            setShowAddMember(true);
          }}
        />
      )}
      {ConfirmModalRenderer}
    </div>
  );
}
