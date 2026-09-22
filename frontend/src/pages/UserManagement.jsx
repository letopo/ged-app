// frontend/src/pages/UserManagement.jsx
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/config';
import { usersAPI, servicesAPI } from '../services/api';
import {
  Users, Edit, KeyRound, Trash2, PlusCircle, CheckCircle, XCircle,
  Loader, UploadCloud, Stamp, X, ChevronDown, MoreHorizontal,
  Search, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../components/ConfirmModal';

// ── Role config ───────────────────────────────────────────────────────────────
const ROLE_CFG = {
  admin:                { label: 'admin',         color: '#1B3A6B', bg: '#e8edf5' },
  director:             { label: 'directeur',     color: '#0e7490', bg: '#e0f2fe' },
  validator:            { label: 'validateur',    color: '#166534', bg: '#dcfce7' },
  chef_de_service:      { label: 'chef service',  color: '#166534', bg: '#dcfce7' },
  caissier:             { label: 'caissier',      color: '#92400e', bg: '#fef3c7' },
  gardien:              { label: 'gardien',       color: '#6b7280', bg: '#f3f4f6' },
  agent_accueil_php:    { label: 'accueil PHP',   color: '#6b7280', bg: '#f3f4f6' },
  agent_accueil_normal: { label: 'accueil',       color: '#6b7280', bg: '#f3f4f6' },
  user:                 { label: 'utilisateur',   color: '#6b7280', bg: '#f3f4f6' },
};

const AVATAR_COLORS = [
  ['#1B3A6B','#dbeafe'], ['#166534','#dcfce7'], ['#92400e','#fef3c7'],
  ['#7c3aed','#ede9fe'], ['#0e7490','#e0f2fe'], ['#be185d','#fce7f3'],
];

function relativeTime(date) {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return i18n.t('maintenant');
  const m = Math.floor(s / 60);
  if (m < 60)  return i18n.t('il y a {{m}}min', { m });
  const h = Math.floor(m / 60);
  if (h < 24)  return h === 1 ? i18n.t("aujourd'hui") : i18n.t('il y a {{h}}h', { h });
  const d = Math.floor(h / 24);
  if (d === 1) return i18n.t('hier');
  if (d < 30)  return i18n.t('il y a {{d}}j', { d });
  const mo = Math.floor(d / 30);
  if (mo < 12) return i18n.t('il y a {{mo}} mois', { mo });
  const y = Math.floor(mo / 12);
  return y > 1 ? i18n.t('il y a {{y}} ans', { y }) : i18n.t('il y a {{y}} an', { y });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', height: 36, padding: '0 10px', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-2)', background: 'var(--surface-2)', color: 'var(--fg)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const labelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 };
const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--radius-2)', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' };
const btnOutline = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-2)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, border: '1px solid var(--border)', cursor: 'pointer' };
const iconBtn    = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 'var(--radius-2)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' };
const thStyle    = { padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
const tdStyle    = { padding: '11px 14px', verticalAlign: 'middle' };

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, footer }) {
  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 440, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{title}</h2>
          <button onClick={onClose} style={{ ...iconBtn }}><X size={16} /></button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
        {footer && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ── FilterDropdown ────────────────────────────────────────────────────────────
function FilterDropdown({ label, value, options, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const active = value !== 'tous';
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, height: 36,
        padding: '0 12px', borderRadius: 'var(--radius-2)', fontSize: 13, cursor: 'pointer',
        border: active ? '1.5px solid var(--brand)' : '1px solid var(--border)',
        background: active ? 'var(--brand-soft)' : 'var(--surface)',
        color: active ? 'var(--brand)' : 'var(--fg)',
        fontWeight: active ? 600 : 400,
      }}>
        {label}{value !== 'tous' ? `: ${t(options.find(o=>o.value===value)?.label || value)}` : `: ${t('tous')}`}
        <ChevronDown size={13} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, minWidth: 160,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-2)', zIndex: 200,
          overflow: 'hidden',
        }}>
          {options.map(o => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }} style={{
              width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none',
              background: value === o.value ? 'var(--brand-soft)' : 'transparent',
              color: value === o.value ? 'var(--brand)' : 'var(--fg)', fontSize: 13,
              cursor: 'pointer', fontWeight: value === o.value ? 600 : 400,
            }}>
              {t(o.label)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ActionMenu ────────────────────────────────────────────────────────────────
function ActionMenu({ u, onEdit, onReset, onDelete, onUploadSig, onUploadStamp }) {
  const { t } = useTranslation();
  const [open, setOpen]     = useState(false);
  const [pos, setPos]       = useState({ top: 0, left: 0 });
  const btnRef = useRef();

  useEffect(() => {
    if (!open) return;
    const h = e => { if (btnRef.current && !btnRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const handleOpen = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuH = 200; // approximate menu height
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < menuH ? rect.top - menuH : rect.bottom + 4;
    setPos({ top, left: rect.right - 190 });
    setOpen(o => !o);
  };

  const items = [
    { label: t('Modifier'),           icon: <Edit size={13}/>,        action: onEdit },
    { label: t('Réinitialiser MDP'),  icon: <KeyRound size={13}/>,    action: onReset },
    { label: t('Uploader signature'), icon: <UploadCloud size={13}/>, action: onUploadSig },
    { label: t('Uploader cachet'),    icon: <Stamp size={13}/>,       action: onUploadStamp },
    { label: t('Supprimer'),          icon: <Trash2 size={13}/>,      action: onDelete, danger: true },
  ];

  return (
    <>
      <button ref={btnRef} onClick={handleOpen} style={{ ...iconBtn }}>
        <MoreHorizontal size={16} />
      </button>
      {open && ReactDOM.createPortal(
        <div onMouseDown={e => e.stopPropagation()} style={{
          position: 'fixed', top: pos.top, left: pos.left, width: 190,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-3)', zIndex: 9999, overflow: 'hidden',
        }}>
          {items.map((item, i) => (
            <button key={i} onClick={() => { setOpen(false); item.action(); }} style={{
              width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none',
              background: 'transparent', color: item.danger ? 'var(--danger)' : 'var(--fg)',
              fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={e => e.currentTarget.style.background = item.danger ? 'var(--danger-soft)' : 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const UserManagement = () => {
  const { t } = useTranslation();
  const { confirm, ConfirmModalRenderer } = useConfirm();
  const [users, setUsers]       = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(new Set());

  // filters
  const [search, setSearch]         = useState('');
  const [filterRole, setFilterRole]  = useState('tous');
  const [filterSvc, setFilterSvc]    = useState('tous');
  const [filterStatus, setFilterStatus] = useState('actifs');

  // modals
  const [editingUser, setEditingUser]       = useState(null);
  const [isCreateOpen, setCreateOpen]       = useState(false);
  const [modalData, setModalData]           = useState({});
  const [newPassword, setNewPassword]       = useState(null);
  const [isResetOpen, setResetOpen]         = useState(false);
  const [userToReset, setUserToReset]       = useState(null);
  const [resetPwdField, setResetPwdField]   = useState('');
  const [isUploadOpen, setUploadOpen]       = useState(false);
  const [userToUpload, setUserToUpload]     = useState(null);
  const [uploadType, setUploadType]         = useState('');
  const [selectedFile, setSelectedFile]     = useState(null);
  const [uploading, setUploading]           = useState(false);

  // service map: userId -> serviceName
  const [userServiceMap, setUserServiceMap] = useState({});

  const loadAll = async () => {
    try {
      setLoading(true);
      const [uRes, sRes] = await Promise.all([usersAPI.getAll(), servicesAPI.getServicesWithMembers()]);
      const usersData    = uRes.data.users || [];
      const svcs         = sRes.data?.data || sRes.data || [];
      setUsers(usersData);
      setServices(svcs);
      // build userId -> serviceName map
      const map = {};
      svcs.forEach(svc => {
        (svc.members || []).forEach(m => { map[m.userId] = svc.name; });
      });
      setUserServiceMap(map);
    } catch { toast.error(t('Impossible de charger les utilisateurs.')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  // ── stats
  const activeCount   = users.filter(u => u.isActive !== false).length;
  const inactiveCount = users.filter(u => u.isActive === false).length;

  // ── filtered
  const filtered = users.filter(u => {
    const name = `${u.firstName} ${u.lastName} ${u.email} ${u.username}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filterRole !== 'tous' && u.role !== filterRole) return false;
    if (filterSvc !== 'tous' && userServiceMap[u.id] !== filterSvc) return false;
    if (filterStatus === 'actifs'    && u.isActive === false) return false;
    if (filterStatus === 'inactifs'  && u.isActive !== false) return false;
    return true;
  });

  // ── select all
  const allSelected = filtered.length > 0 && filtered.every(u => selected.has(u.id));
  const toggleAll   = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(u => u.id)));
  };

  // ── actions
  const handleEdit        = u => { setModalData({ ...u }); setEditingUser(u); };
  const handleCreate      = ()  => { setModalData({ role: 'user' }); setCreateOpen(true); };
  const handleCloseModal  = () => { setEditingUser(null); setCreateOpen(false); setNewPassword(null); setModalData({}); };

  const handleSave = async e => {
    e.preventDefault();
    try {
      if (!editingUser) {
        await usersAPI.create(modalData);
        toast.success(t('Utilisateur créé !'));
      } else {
        await usersAPI.update(editingUser.id, { firstName: modalData.firstName, lastName: modalData.lastName, email: modalData.email, username: modalData.username, role: modalData.role, substituteId: modalData.substituteId || null });
        toast.success(t('Utilisateur mis à jour !'));
      }
      handleCloseModal(); loadAll();
    } catch (err) { toast.error(err.response?.data?.error || t('Erreur')); }
  };

  const handleToggleAbsence = async u => {
    try {
      const res = await usersAPI.setAbsence(u.id, !u.isAbsent);
      toast.success(res.data.message);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur'));
    }
  };

  const handleResetPassword = u => { setUserToReset(u); setResetPwdField(''); setResetOpen(true); };
  const confirmReset = async () => {
    try {
      const res = await usersAPI.resetPassword(userToReset.id, resetPwdField.trim());
      setNewPassword({ username: userToReset.username, password: res.data.newPassword });
      setResetOpen(false); setUserToReset(null);
    } catch { toast.error(t('Erreur lors de la réinitialisation.')); setResetOpen(false); }
  };

  const handleDelete = async u => {
    const ok = await confirm({ title: t("Supprimer l'utilisateur"), message: t('Supprimer {{username}} ?', { username: u.username }), confirmLabel: t('Supprimer'), variant: 'danger' });
    if (!ok) return;
    try { await usersAPI.delete(u.id); toast.success(t('Utilisateur supprimé.')); loadAll(); }
    catch (err) { toast.error(err.response?.data?.error || t('Impossible de supprimer')); }
  };

  const handleUpload = async () => {
    if (!selectedFile || !userToUpload) return;
    const fd = new FormData();
    fd.append(uploadType, selectedFile);
    setUploading(true);
    try {
      if (uploadType === 'signature') await usersAPI.uploadSignature(userToUpload.id, fd);
      else await usersAPI.uploadStamp(userToUpload.id, fd);
      toast.success(t('{{type}} uploadé !', { type: uploadType === 'signature' ? t('Signature') : t('Cachet') }));
      setUploadOpen(false); setUserToUpload(null); setUploadType(''); setSelectedFile(null); loadAll();
    } catch (err) { toast.error(err.response?.data?.message || t('Erreur upload')); }
    finally { setUploading(false); }
  };

  // ── role options
  const roleOptions = [
    { value: 'tous', label: 'tous' },
    ...Object.entries(ROLE_CFG).map(([v, c]) => ({ value: v, label: c.label })),
  ];
  const svcOptions = [
    { value: 'tous', label: 'tous' },
    ...services.map(s => ({ value: s.name, label: s.name })),
  ];
  const statusOptions = [
    { value: 'tous', label: 'tous' },
    { value: 'actifs', label: 'actifs' },
    { value: 'inactifs', label: 'inactifs' },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Loader size={24} color="var(--fg-muted)" className="animate-spin" />
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 40px' }} className="animate-pageFade">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, paddingTop: 4 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
            {t('Utilisateurs')}
          </h1>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            {t('{{total}} membres · {{active}} actifs · {{inactive}} désactivés', { total: users.length, active: activeCount, inactive: inactiveCount })}
          </div>
        </div>
        <button onClick={handleCreate} style={btnPrimary}>
          <PlusCircle size={14} /> {t('Inviter un utilisateur')}
        </button>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder={t('Rechercher un utilisateur...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 32, marginBottom: 0 }}
          />
        </div>

        <FilterDropdown label={t('Rôle')}    value={filterRole}   options={roleOptions}   onChange={setFilterRole} />
        <FilterDropdown label={t('Service')} value={filterSvc}    options={svcOptions}    onChange={setFilterSvc} />

        {/* Statut toggle */}
        <button
          onClick={() => setFilterStatus(s => s === 'actifs' ? 'tous' : 'actifs')}
          style={{
            height: 36, padding: '0 14px', borderRadius: 'var(--radius-2)', fontSize: 13, cursor: 'pointer',
            border: filterStatus === 'actifs' ? '1.5px solid var(--brand)' : '1px solid var(--border)',
            background: filterStatus === 'actifs' ? 'var(--brand-soft)' : 'var(--surface)',
            color: filterStatus === 'actifs' ? 'var(--brand)' : 'var(--fg)',
            fontWeight: filterStatus === 'actifs' ? 600 : 400,
          }}
        >
          {t('Statut: {{status}}', { status: t(filterStatus) })}
        </button>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="ged-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              <th style={{ ...thStyle, width: 40, paddingRight: 4 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                  style={{ cursor: 'pointer', width: 14, height: 14 }} />
              </th>
              <th style={thStyle}>{t('Utilisateur')}</th>
              <th style={thStyle}>{t('Rôle · Service')}</th>
              <th style={thStyle}>{t('Signature / Cachet')}</th>
              <th style={thStyle}>{t('Présence')}</th>
              <th style={thStyle}>{t('Dernière activité')}</th>
              <th style={{ ...thStyle, width: 48 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => {
              const role   = ROLE_CFG[u.role] || { label: u.role, color: '#6b7280', bg: '#f3f4f6' };
              const initials = `${u.firstName?.[0]||''}${u.lastName?.[0]||''}`.toUpperCase() || '?';
              const [ac, bg] = AVATAR_COLORS[i % AVATAR_COLORS.length];
              const svcName  = userServiceMap[u.id];
              const isChecked = selected.has(u.id);
              return (
                <tr key={u.id}
                  style={{ borderBottom: '1px solid var(--surface-3)', background: isChecked ? 'var(--brand-soft)' : 'var(--surface)', transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { if (!isChecked) e.currentTarget.style.background = 'var(--surface)'; }}
                >
                  {/* Checkbox */}
                  <td style={{ ...tdStyle, width: 40, paddingRight: 4 }}>
                    <input type="checkbox" checked={isChecked}
                      onChange={() => setSelected(s => { const n = new Set(s); n.has(u.id) ? n.delete(u.id) : n.add(u.id); return n; })}
                      style={{ cursor: 'pointer', width: 14, height: 14 }} />
                  </td>

                  {/* Utilisateur */}
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: bg, color: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>{u.firstName} {u.lastName}</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Rôle · Service */}
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600, background: role.bg, color: role.color }}>
                        {t(role.label)}
                      </span>
                      {svcName && (
                        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>· {svcName.length > 15 ? svcName.slice(0,15)+'…' : svcName}</span>
                      )}
                    </div>
                  </td>

                  {/* Signature / Cachet */}
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 9px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 500,
                        background: u.signaturePath ? '#dcfce7' : 'var(--surface-3)',
                        color: u.signaturePath ? '#166534' : 'var(--fg-muted)',
                      }}>
                        {u.signaturePath ? <CheckCircle size={10}/> : <span style={{ fontSize: 13, lineHeight: 1 }}>—</span>} {t('Signature')}
                      </span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 9px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 500,
                        background: u.stampPath ? '#dcfce7' : 'var(--surface-3)',
                        color: u.stampPath ? '#166534' : 'var(--fg-muted)',
                      }}>
                        {u.stampPath ? <CheckCircle size={10}/> : <span style={{ fontSize: 13, lineHeight: 1 }}>—</span>} {t('Cachet')}
                      </span>
                    </div>
                  </td>

                  {/* Présence */}
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleToggleAbsence(u)}
                      title={u.isAbsent ? t('Cliquer pour repasser en ligne') : t('Cliquer pour se mettre absent')}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 9px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 500,
                        border: 'none', cursor: 'pointer',
                        background: u.isAbsent ? 'var(--warning-soft)' : '#dcfce7',
                        color: u.isAbsent ? 'var(--warning)' : '#166534',
                      }}
                    >
                      {u.isAbsent ? t('Absent') : t('En ligne')}
                    </button>
                  </td>

                  {/* Dernière activité */}
                  <td style={{ ...tdStyle, fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                    {relativeTime(u.lastLogin || u.updatedAt)}
                  </td>

                  {/* Actions */}
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <ActionMenu
                      u={u}
                      onEdit={() => handleEdit(u)}
                      onReset={() => handleResetPassword(u)}
                      onDelete={() => handleDelete(u)}
                      onUploadSig={() => { setUserToUpload(u); setUploadType('signature'); setSelectedFile(null); setUploadOpen(true); }}
                      onUploadStamp={() => { setUserToUpload(u); setUploadType('stamp'); setSelectedFile(null); setUploadOpen(true); }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
            {t('Aucun utilisateur trouvé.')}
          </div>
        )}
      </div>

      {/* ── Modal Upload ─────────────────────────────────────────────── */}
      {isUploadOpen && (
        <Modal title={uploadType === 'signature' ? t('Uploader une signature') : t('Uploader un cachet')} onClose={() => setUploadOpen(false)}
          footer={<>
            <button onClick={() => setUploadOpen(false)} style={btnOutline}>{t('Annuler')}</button>
            <button onClick={handleUpload} disabled={!selectedFile || uploading} style={{ ...btnPrimary, opacity: (!selectedFile || uploading) ? 0.5 : 1 }}>
              {uploading && <Loader size={13} className="animate-spin" />}
              {uploading ? t('Upload…') : t('Uploader')}
            </button>
          </>}>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 14 }}>
            {t('Pour :')} <strong style={{ color: 'var(--fg)' }}>{userToUpload?.firstName} {userToUpload?.lastName}</strong>
          </div>
          <input type="file" accept="image/png,image/jpeg"
            onChange={e => setSelectedFile(e.target.files[0])}
            style={{ ...inputStyle, height: 'auto', padding: '8px 10px', cursor: 'pointer', marginBottom: 0 }} />
          {selectedFile && <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6 }}>{selectedFile.name}</div>}
        </Modal>
      )}

      {/* ── Modal Reset MDP ──────────────────────────────────────────── */}
      {isResetOpen && userToReset && (
        <Modal title={t('Réinitialiser le mot de passe')} onClose={() => setResetOpen(false)}
          footer={<>
            <button onClick={() => setResetOpen(false)} style={btnOutline}>{t('Annuler')}</button>
            <button onClick={confirmReset}
              disabled={resetPwdField.length > 0 && resetPwdField.length < 6}
              style={{ ...btnPrimary, background: 'var(--warning)', opacity: (resetPwdField.length > 0 && resetPwdField.length < 6) ? 0.5 : 1 }}>
              {t('Confirmer')}
            </button>
          </>}>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 14 }}>
            {t('Utilisateur :')} <strong style={{ color: 'var(--fg)' }}>{userToReset.username}</strong>
          </div>
          <label style={labelStyle}>{t('Nouveau mot de passe (min. 6 caractères)')}</label>
          <input type="text" placeholder={t('Laisser vide pour générer automatiquement')}
            value={resetPwdField} onChange={e => setResetPwdField(e.target.value)}
            style={{ ...inputStyle, marginBottom: 0 }} />
        </Modal>
      )}

      {/* ── Modal Nouveau MDP ────────────────────────────────────────── */}
      {newPassword && (
        <Modal title={t('Mot de passe réinitialisé')} onClose={() => setNewPassword(null)}
          footer={<button onClick={() => setNewPassword(null)} style={btnPrimary}>{t('Fermer')}</button>}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <CheckCircle size={40} color="var(--success)" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 8 }}>
              {t('Nouveau mot de passe pour')} <strong style={{ color: 'var(--fg)' }}>{newPassword.username}</strong> :
            </p>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--brand)', background: 'var(--brand-soft)', padding: '10px 16px', borderRadius: 'var(--radius-3)', letterSpacing: '0.5px' }}>
              {newPassword.password}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal Créer / Éditer ─────────────────────────────────────── */}
      {(isCreateOpen || editingUser) && (
        <Modal title={isCreateOpen ? t('Inviter un utilisateur') : t("Modifier l'utilisateur")} onClose={handleCloseModal}
          footer={<>
            <button type="button" onClick={handleCloseModal} style={btnOutline}>{t('Annuler')}</button>
            <button form="user-form" type="submit" style={btnPrimary}>{t('Sauvegarder')}</button>
          </>}>
          <form id="user-form" onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>{t('Prénom')}</label>
                <input type="text" required placeholder={t('Prénom')} value={modalData.firstName || ''}
                  onChange={e => setModalData({ ...modalData, firstName: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} />
              </div>
              <div>
                <label style={labelStyle}>{t('Nom')}</label>
                <input type="text" required placeholder={t('Nom')} value={modalData.lastName || ''}
                  onChange={e => setModalData({ ...modalData, lastName: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} />
              </div>
            </div>
            <label style={labelStyle}>{t("Nom d'utilisateur")}</label>
            <input type="text" required placeholder={t("Nom d'utilisateur")} value={modalData.username || ''}
              onChange={e => setModalData({ ...modalData, username: e.target.value })}
              style={{ ...inputStyle, marginBottom: 12 }} />
            <label style={labelStyle}>{t('Email')}</label>
            <input type="email" required placeholder={t('Email')} value={modalData.email || ''}
              onChange={e => setModalData({ ...modalData, email: e.target.value })}
              style={{ ...inputStyle, marginBottom: 12 }} />
            {isCreateOpen && <>
              <label style={labelStyle}>{t('Mot de passe')}</label>
              <input type="password" required placeholder={t('Mot de passe')} value={modalData.password || ''}
                onChange={e => setModalData({ ...modalData, password: e.target.value })}
                style={{ ...inputStyle, marginBottom: 12 }} />
            </>}
            <label style={labelStyle}>{t('Rôle')}</label>
            <select value={modalData.role || 'user'} onChange={e => setModalData({ ...modalData, role: e.target.value })}
              style={{ ...inputStyle, cursor: 'pointer', marginBottom: 0 }}>
              <option value="user">{t('Utilisateur')}</option>
              <option value="validator">{t('Validateur')}</option>
              <option value="chef_de_service">{t('Chef de service')}</option>
              <option value="director">{t('Directeur')}</option>
              <option value="admin">{t('Administrateur')}</option>
              <optgroup label={t("Files d'attente")}>
                <option value="gardien">{t('Gardien (Portail)')}</option>
                <option value="agent_accueil_php">{t('Agent Accueil PHP')}</option>
                <option value="agent_accueil_normal">{t('Agent Accueil Normal')}</option>
                <option value="caissier">{t('Caissier')}</option>
              </optgroup>
            </select>

            {editingUser && (
              <>
                <label style={{ ...labelStyle, marginTop: 12 }}>{t('Remplaçant (n-1)')}</label>
                <select
                  value={modalData.substituteId || ''}
                  onChange={e => setModalData({ ...modalData, substituteId: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer', marginBottom: 0 }}
                >
                  <option value="">{t('— Aucun —')}</option>
                  {users.filter(u => u.id !== editingUser.id).map(u => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
                <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '4px 0 0' }}>
                  {t('Reçoit automatiquement les tâches de validation en attente quand cette personne passe en "Absent".')}
                </p>
              </>
            )}
          </form>
        </Modal>
      )}

      {ConfirmModalRenderer}
    </div>
  );
};

export default UserManagement;
