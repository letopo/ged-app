// frontend/src/pages/Settings.jsx — Redesign complet
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { authAPI, usersAPI, tenantBrandingAPI } from '../services/api';
import {
  Home, Settings as SettingsIcon, Bell, Users, Sparkles, FileText,
  Zap, Shield, Database, Save, Loader, AlertCircle, CheckCircle,
  Lock, Eye, EyeOff, Upload, Pen, X, UploadCloud, Stamp,
} from 'lucide-react';
import LicenseManager from '../components/LicenseManager';
import TwoFactorSetup from '../components/TwoFactorSetup';
import NotificationSettings from './NotificationSettings';
import UserManagement from './UserManagement';
import toast from 'react-hot-toast';

// ── Nav structure ─────────────────────────────────────────────────────────────
const NAV = [
  {
    group: 'Compte',
    items: [
      { id: 'profile',       label: 'Profil',        icon: Home },
      { id: 'security',      label: 'Sécurité · 2FA', icon: SettingsIcon },
      { id: 'notifications', label: 'Notifications',  icon: Bell },
    ],
  },
  {
    group: 'Organisation',
    items: [
      { id: 'team',      label: 'Équipe',     icon: Users },
      { id: 'branding',  label: 'Branding',   icon: Sparkles },
      { id: 'templates', label: 'Licence',    icon: FileText },
    ],
  },
  {
    group: 'Avancé',
    items: [
      { id: 'ia',           label: 'IA · OCR',      icon: Zap },
      { id: 'integrations', label: 'Intégrations',  icon: Shield },
      { id: 'api',          label: 'API · Webhooks', icon: Database },
    ],
  },
];

const LANGUAGES = [
  { code: 'fr', label: 'FR · Français' },
  { code: 'en', label: 'EN · English' },
  { code: 'es', label: 'ES · Español' },
  { code: 'ar', label: 'AR · العربية' },
];

const inputStyle = {
  width: '100%', height: 38, padding: '0 12px',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
  background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color .15s',
};

// ── Avatar ─────────────────────────────────────────────────────────────────────
function AvatarCircle({ firstName, lastName, size = 54 }) {
  const COLORS = ['#1B3A6B','#1A7A4A','#B45309','#C0392B','#1557A0','#5B89D6'];
  const name = `${firstName||''}${lastName||''}`;
  const idx  = name ? name.charCodeAt(0) % COLORS.length : 0;
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:COLORS[idx], color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.36, fontWeight:700, flexShrink:0 }}>
      {(firstName?.[0]||'').toUpperCase()}{(lastName?.[0]||'').toUpperCase()}
    </div>
  );
}

// ── Section placeholder ────────────────────────────────────────────────────────
function Placeholder({ title, sub }) {
  const { t } = useTranslation();
  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:20, fontWeight:700, color:'var(--fg)', margin:'0 0 6px' }}>{title}</h2>
        <p style={{ fontSize:13, color:'var(--fg-muted)', margin:0 }}>{t('Section en cours de design — la structure suit le même pattern (form + actions sticky).')}</p>
      </div>
      <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius-3)', padding:'48px 0', textAlign:'center', color:'var(--fg-subtle)', fontSize:13 }}>
        {t('Contenu à venir')}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Settings() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const { setLang } = useLanguage();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading]     = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName:  user?.lastName  || '',
    email:     user?.email     || '',
    lang:      'fr',
  });
  const [passwordData, setPasswordData] = useState({
    current: '', newPwd: '', confirm: '',
  });
  const [showPwd, setShowPwd] = useState({ current:false, newPwd:false, confirm:false });
  const [signatureUrl, setSignatureUrl] = useState(null);
  const [stampUrl, setStampUrl]         = useState(null);
  const sigInputRef   = useRef();
  const stampInputRef = useRef();

  const [branding, setBranding]           = useState({ name: '', logoUrl: null, primaryColor: '' });
  const [brandingSaving, setBrandingSaving] = useState(false);
  const logoInputRef = useRef();

  useEffect(() => {
    // Charger le profil complet (avec signaturePath/stampPath) depuis l'API
    authAPI.getProfile().then(res => {
      const u = res.data?.user || res.data;
      if (!u) return;
      setProfileData(p => ({ ...p, firstName: u.firstName||'', lastName: u.lastName||'', email: u.email||'', lang: u.lang || 'fr' }));
      if (u.lang) setLang(u.lang);
      if (u.signaturePath) setSignatureUrl(`/api/${u.signaturePath}?t=${Date.now()}`);
      if (u.stampPath)     setStampUrl(`/api/${u.stampPath}?t=${Date.now()}`);
    }).catch(() => {
      // Fallback sur le contexte
      if (user) {
        setProfileData(p => ({ ...p, firstName: user.firstName||'', lastName: user.lastName||'', email: user.email||'' }));
      }
    });
  }, []);

  useEffect(() => {
    if (!['admin','superadmin'].includes(user?.role)) return;
    tenantBrandingAPI.get().then(res => {
      const t = res.data?.data;
      if (!t) return;
      setBranding({ name: t.name || '', logoUrl: t.logoUrl ? `/api/${t.logoUrl}?t=${Date.now()}` : null, primaryColor: t.primaryColor || '' });
    }).catch(() => {});
  }, [user?.role]);

  const handleLogoUpload = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('logo', file);
    try {
      const res = await tenantBrandingAPI.uploadLogo(fd);
      const path = res.data?.data?.logoUrl;
      setBranding(b => ({ ...b, logoUrl: path ? `/api/${path}?t=${Date.now()}` : null }));
      toast.success(t('Logo mis à jour'));
    } catch (err) { toast.error(err.response?.data?.message || t("Erreur lors de l'upload")); }
  };

  const handleBrandingSave = async (e) => {
    e.preventDefault();
    setBrandingSaving(true);
    try {
      await tenantBrandingAPI.update({ primaryColor: branding.primaryColor || null });
      if (branding.primaryColor) document.documentElement.style.setProperty('--brand', branding.primaryColor);
      toast.success(t('Couleur enregistrée'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur lors de la mise à jour'));
    } finally { setBrandingSaving(false); }
  };

  const handleUploadFile = async (file, type) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      if (type === 'signature') {
        const res = await usersAPI.uploadSignature(user.id, fd);
        const path = res.data?.user?.signaturePath;
        setSignatureUrl(path ? `/api/${path}?t=${Date.now()}` : null);
        toast.success(t('Signature mise à jour'));
      } else {
        const res = await usersAPI.uploadStamp(user.id, fd);
        const path = res.data?.user?.stampPath;
        setStampUrl(path ? `/api/${path}?t=${Date.now()}` : null);
        toast.success(t('Cachet mis à jour'));
      }
    } catch { toast.error(t("Erreur lors de l'upload")); }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.updateProfile({ firstName: profileData.firstName, lastName: profileData.lastName, email: profileData.email, lang: profileData.lang });
      const updated = res.data?.user;
      if (updated) updateUser({ ...user, ...updated });
      toast.success(t('Profil enregistré'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur lors de la mise à jour'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passwordData.newPwd !== passwordData.confirm) { toast.error(t('Les mots de passe ne correspondent pas')); return; }
    if (passwordData.newPwd.length < 8) { toast.error(t('Minimum 8 caractères')); return; }
    setLoading(true);
    try {
      await usersAPI.resetPassword(user.id, passwordData.newPwd);
      toast.success(t('Mot de passe modifié'));
      setPasswordData({ current:'', newPwd:'', confirm:'' });
    } catch (err) {
      toast.error(err.response?.data?.message || t('Erreur'));
    } finally {
      setLoading(false);
    }
  };

  const activeLabel = NAV.flatMap(g => g.items).find(i => i.id === activeTab)?.label || '';

  return (
    <div className="settings-shell animate-pageFade">

      {/* ── Left sidebar ────────────────────────────────────────────────── */}
      <aside className="settings-sidebar">
        <div style={{ fontSize:18, fontWeight:700, color:'var(--fg)', padding:'0 20px', marginBottom:24 }}>{t('Paramètres')}</div>

        {NAV.map(group => (
          <div key={group.group} style={{ marginBottom:8 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--fg-subtle)', textTransform:'uppercase', letterSpacing:'0.8px', padding:'8px 20px 6px' }}>
              {t(group.group)}
            </div>
            {group.items.map(item => {
              const active = activeTab === item.id;
              const Icon   = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    width:'100%', display:'flex', alignItems:'center', justifyContent:'flex-start', gap:10,
                    height:40, padding:'0 20px', border:'none', cursor:'pointer',
                    background: active ? 'var(--brand-soft)' : 'transparent',
                    borderLeft: active ? '3px solid var(--brand)' : '3px solid transparent',
                    color: active ? 'var(--brand)' : 'var(--fg-muted)',
                    transition:'background .12s, color .12s',
                  }}
                  title={t(item.label)}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={16} />
                  <span style={{ fontSize:13, fontWeight: active ? 600 : 400 }}>{t(item.label)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      {/* ── Right content ───────────────────────────────────────────────── */}
      <main className="settings-main">
        <div style={{ width:'100%', maxWidth: ['team','notifications'].includes(activeTab) ? 1100 : 560 }}>

          {/* ── Profil ───────────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSave}>
              <h2 style={{ fontSize:22, fontWeight:700, color:'var(--fg)', margin:'0 0 6px' }}>{t('Profil')}</h2>
              <p style={{ fontSize:13, color:'var(--fg-muted)', marginBottom:28 }}>{t('Informations visibles par votre organisation.')}</p>

              {/* Avatar */}
              <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:28 }}>
                <AvatarCircle firstName={profileData.firstName} lastName={profileData.lastName} size={56} />
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--fg)', marginBottom:2 }}>{t('Photo de profil')}</div>
                  <div style={{ fontSize:12, color:'var(--fg-muted)', marginBottom:8 }}>{t('PNG ou JPG · 2 MB max')}</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button type="button" style={{ height:28, padding:'0 12px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--fg)', fontSize:12, cursor:'pointer' }}>
                      {t('Changer')}
                    </button>
                    <button type="button" style={{ height:28, padding:'0 12px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'transparent', color:'var(--fg-muted)', fontSize:12, cursor:'pointer' }}>
                      {t('Supprimer')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Name fields */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:500, color:'var(--fg)', display:'block', marginBottom:5 }}>{t('Prénom')}</label>
                  <input
                    style={inputStyle} type="text"
                    value={profileData.firstName}
                    onChange={e => setProfileData(p => ({ ...p, firstName: e.target.value }))}
                    onFocus={e => e.target.style.borderColor = 'var(--brand)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:500, color:'var(--fg)', display:'block', marginBottom:5 }}>{t('Nom')}</label>
                  <input
                    style={inputStyle} type="text"
                    value={profileData.lastName}
                    onChange={e => setProfileData(p => ({ ...p, lastName: e.target.value }))}
                    onFocus={e => e.target.style.borderColor = 'var(--brand)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, fontWeight:500, color:'var(--fg)', display:'block', marginBottom:5 }}>{t('Email')}</label>
                <input
                  style={{ ...inputStyle, width:'100%' }} type="email"
                  value={profileData.email}
                  onChange={e => setProfileData(p => ({ ...p, email: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = 'var(--brand)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {/* Language */}
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, fontWeight:500, color:'var(--fg)', display:'block', marginBottom:8 }}>{t("Langue de l'interface")}</label>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code} type="button"
                      onClick={() => { setLang(l.code); setProfileData(p => ({ ...p, lang: l.code })); }}
                      style={{
                        padding:'5px 12px', borderRadius:'var(--radius-full)', fontSize:12, cursor:'pointer', fontWeight:500,
                        border: profileData.lang === l.code ? 'none' : '1px solid var(--border)',
                        background: profileData.lang === l.code ? 'var(--brand)' : 'var(--surface-2)',
                        color: profileData.lang === l.code ? '#fff' : 'var(--fg-muted)',
                      }}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Signature + Cachet */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:28 }}>
                {[
                  { label:t('Signature électronique'), url:signatureUrl, ref:sigInputRef,   type:'signature', icon:<Pen size={20}/> },
                  { label:t('Cachet électronique'),    url:stampUrl,     ref:stampInputRef,  type:'stamp',     icon:<Stamp size={20}/> },
                ].map(item => (
                  <div key={item.type}>
                    <label style={{ fontSize:12, fontWeight:500, color:'var(--fg)', display:'block', marginBottom:6 }}>{item.label}</label>
                    <div style={{
                      border:'1px dashed var(--border)', borderRadius:'var(--radius-3)',
                      background:'var(--surface-2)', minHeight:100,
                      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                      gap:8, padding:12, position:'relative',
                    }}>
                      {item.url ? (
                        <>
                          <img src={item.url} alt={item.label} style={{ maxHeight:70, maxWidth:'100%', objectFit:'contain', borderRadius:4 }} onError={()=> item.type==='signature' ? setSignatureUrl(null) : setStampUrl(null)} />
                          <div style={{ display:'flex', gap:6 }}>
                            <button type="button" onClick={() => item.ref.current?.click()}
                              style={{ height:26, padding:'0 10px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--fg)', fontSize:11, cursor:'pointer' }}>
                              {t('Changer')}
                            </button>
                            <button type="button" onClick={() => item.type==='signature' ? setSignatureUrl(null) : setStampUrl(null)}
                              style={{ height:26, padding:'0 10px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'transparent', color:'var(--danger)', fontSize:11, cursor:'pointer' }}>
                              {t('Supprimer')}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ color:'var(--fg-subtle)' }}>{item.icon}</div>
                          <div style={{ fontSize:12, color:'var(--fg-muted)', textAlign:'center' }}>{t('Aucun fichier')}</div>
                          <button type="button" onClick={() => item.ref.current?.click()}
                            style={{ height:28, padding:'0 12px', borderRadius:'var(--radius-2)', border:'1px solid var(--brand)', background:'transparent', color:'var(--brand)', fontSize:12, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5 }}>
                            <UploadCloud size={13}/> {t('Uploader')}
                          </button>
                        </>
                      )}
                      <input ref={item.ref} type="file" accept="image/*" style={{ display:'none' }}
                        onChange={e => handleUploadFile(e.target.files[0], item.type)} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:16, display:'flex', justifyContent:'flex-end', gap:10 }}>
                <button type="button" style={{ height:36, padding:'0 16px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'transparent', color:'var(--fg)', fontSize:13, cursor:'pointer' }}>
                  {t('Annuler')}
                </button>
                <button type="submit" disabled={loading} style={{ height:36, padding:'0 18px', borderRadius:'var(--radius-2)', background:'var(--brand)', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6, opacity:loading?0.7:1 }}>
                  {loading && <Loader size={13} className="animate-spin" />}
                  {t('Enregistrer')}
                </button>
              </div>
            </form>
          )}

          {/* ── Sécurité ─────────────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <>
            <form onSubmit={handlePasswordSave}>
              <h2 style={{ fontSize:22, fontWeight:700, color:'var(--fg)', margin:'0 0 6px' }}>{t('Sécurité · 2FA')}</h2>
              <p style={{ fontSize:13, color:'var(--fg-muted)', marginBottom:28 }}>{t("Modifiez votre mot de passe et activez l'authentification à deux facteurs.")}</p>

              <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:28 }}>
                {[
                  { key:'current', label:t('Mot de passe actuel'), placeholder:'••••••••' },
                  { key:'newPwd',  label:t('Nouveau mot de passe'), placeholder:t('Minimum 8 caractères') },
                  { key:'confirm', label:t('Confirmer le nouveau mot de passe'), placeholder:'••••••••' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize:12, fontWeight:500, color:'var(--fg)', display:'block', marginBottom:5 }}>{f.label}</label>
                    <div style={{ position:'relative' }}>
                      <input
                        style={{ ...inputStyle, paddingRight:36 }}
                        type={showPwd[f.key] ? 'text' : 'password'}
                        value={passwordData[f.key]}
                        placeholder={f.placeholder}
                        onChange={e => setPasswordData(p => ({ ...p, [f.key]: e.target.value }))}
                        onFocus={e => e.target.style.borderColor = 'var(--brand)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                      />
                      <button type="button" onClick={() => setShowPwd(p => ({ ...p, [f.key]: !p[f.key] }))}
                        style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--fg-muted)', padding:0, display:'flex' }}>
                        {showPwd[f.key] ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop:'1px solid var(--border)', paddingTop:16, display:'flex', justifyContent:'flex-end', gap:10 }}>
                <button type="button" style={{ height:36, padding:'0 16px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'transparent', color:'var(--fg)', fontSize:13, cursor:'pointer' }}>
                  {t('Annuler')}
                </button>
                <button type="submit" disabled={loading} style={{ height:36, padding:'0 18px', borderRadius:'var(--radius-2)', background:'var(--brand)', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6, opacity:loading?0.7:1 }}>
                  {loading && <Loader size={13} className="animate-spin" />}
                  {t('Mettre à jour')}
                </button>
              </div>
            </form>

            {/* ── 2FA ─────────────────────────────────────────────────────── */}
            <TwoFactorSetup />
            </>
          )}

          {/* ── Notifications ─────────────────────────────────────────────── */}
          {activeTab === 'notifications' && <NotificationSettings />}

          {/* ── Équipe ────────────────────────────────────────────────────── */}
          {activeTab === 'team' && (
            ['admin','superadmin'].includes(user?.role)
              ? <UserManagement />
              : <Placeholder title={t('Équipe')} />
          )}

          {/* ── Branding ──────────────────────────────────────────────────── */}
          {activeTab === 'branding' && (
            ['admin','superadmin'].includes(user?.role)
              ? (
                <form onSubmit={handleBrandingSave}>
                  <h2 style={{ fontSize:22, fontWeight:700, color:'var(--fg)', margin:'0 0 6px' }}>{t('Branding')}</h2>
                  <p style={{ fontSize:13, color:'var(--fg-muted)', marginBottom:28 }}>{t('Personnalisez le logo et la couleur de marque de {{org}}.', { org: branding.name || t('votre organisation') })}</p>

                  {/* Logo */}
                  <div style={{ marginBottom:24 }}>
                    <label style={{ fontSize:12, fontWeight:500, color:'var(--fg)', display:'block', marginBottom:6 }}>{t('Logo')}</label>
                    <div style={{
                      border:'1px dashed var(--border)', borderRadius:'var(--radius-3)',
                      background:'var(--surface-2)', minHeight:100, width:220,
                      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                      gap:8, padding:12,
                    }}>
                      {branding.logoUrl ? (
                        <>
                          <img src={branding.logoUrl} alt="Logo" style={{ maxHeight:70, maxWidth:'100%', objectFit:'contain', borderRadius:4 }} onError={() => setBranding(b => ({ ...b, logoUrl: null }))} />
                          <div style={{ display:'flex', gap:6 }}>
                            <button type="button" onClick={() => logoInputRef.current?.click()}
                              style={{ height:26, padding:'0 10px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--fg)', fontSize:11, cursor:'pointer' }}>
                              {t('Changer')}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <Sparkles size={20} style={{ color:'var(--fg-subtle)' }} />
                          <div style={{ fontSize:12, color:'var(--fg-muted)', textAlign:'center' }}>{t('Aucun logo')}</div>
                          <button type="button" onClick={() => logoInputRef.current?.click()}
                            style={{ height:28, padding:'0 12px', borderRadius:'var(--radius-2)', border:'1px solid var(--brand)', background:'transparent', color:'var(--brand)', fontSize:12, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5 }}>
                            <UploadCloud size={13}/> {t('Uploader')}
                          </button>
                        </>
                      )}
                      <input ref={logoInputRef} type="file" accept="image/*" style={{ display:'none' }}
                        onChange={e => handleLogoUpload(e.target.files[0])} />
                    </div>
                  </div>

                  {/* Couleur principale */}
                  <div style={{ marginBottom:28 }}>
                    <label style={{ fontSize:12, fontWeight:500, color:'var(--fg)', display:'block', marginBottom:6 }}>{t('Couleur principale')}</label>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <input
                        type="color"
                        value={branding.primaryColor || '#1B3A6B'}
                        onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))}
                        style={{ width:44, height:38, padding:2, border:'1px solid var(--border)', borderRadius:'var(--radius-2)', background:'var(--surface-2)', cursor:'pointer' }}
                      />
                      <input
                        style={{ ...inputStyle, width:140 }} type="text"
                        value={branding.primaryColor}
                        placeholder="#1B3A6B"
                        onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))}
                      />
                      {branding.primaryColor && (
                        <button type="button" onClick={() => setBranding(b => ({ ...b, primaryColor: '' }))}
                          style={{ height:28, padding:'0 10px', borderRadius:'var(--radius-2)', border:'1px solid var(--border)', background:'transparent', color:'var(--fg-muted)', fontSize:12, cursor:'pointer' }}>
                          {t('Réinitialiser')}
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize:11, color:'var(--fg-subtle)', marginTop:6 }}>
                      {t("Remplace la couleur d'accent (boutons, liens, éléments actifs) dans toute l'interface.")}
                    </div>
                  </div>

                  <div style={{ borderTop:'1px solid var(--border)', paddingTop:16, display:'flex', justifyContent:'flex-end', gap:10 }}>
                    <button type="submit" disabled={brandingSaving} style={{ height:36, padding:'0 18px', borderRadius:'var(--radius-2)', background:'var(--brand)', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6, opacity:brandingSaving?0.7:1 }}>
                      {brandingSaving && <Loader size={13} className="animate-spin" />}
                      {t('Enregistrer')}
                    </button>
                  </div>
                </form>
              )
              : <Placeholder title={t('Branding')} />
          )}

          {/* ── Licence ───────────────────────────────────────────────────── */}
          {activeTab === 'templates' && (
            ['admin','superadmin'].includes(user?.role)
              ? <div>
                  <h2 style={{ fontSize:22, fontWeight:700, color:'var(--fg)', margin:'0 0 6px' }}>{t('Licence')}</h2>
                  <p style={{ fontSize:13, color:'var(--fg-muted)', marginBottom:20 }}>{t('Gérez la licence de votre application.')}</p>
                  <LicenseManager />
                </div>
              : <Placeholder title={t('Licence')} />
          )}

          {/* ── IA · OCR ──────────────────────────────────────────────────── */}
          {activeTab === 'ia' && <Placeholder title={t('IA · OCR')} />}

          {/* ── Intégrations ──────────────────────────────────────────────── */}
          {activeTab === 'integrations' && <Placeholder title={t('Intégrations')} />}

          {/* ── API · Webhooks ─────────────────────────────────────────────── */}
          {activeTab === 'api' && <Placeholder title={t('API · Webhooks')} />}

        </div>
      </main>
    </div>
  );
}
