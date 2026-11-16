// frontend/src/components/ModulesPanel.jsx
// Modules activables d'un tenant : Paramètres › Modules (tenant courant,
// administrateurs) ou Clients SaaS (superadmin, `tenantId` fourni).
//   - superadmin : tout allumer / éteindre ; allumer un module hors licence l'accorde ;
//   - administrateur : seulement les modules inclus dans la licence ou accordés.
// Un module éteint ne répond plus côté serveur ; ses documents déjà signés
// restent dans les Archives.
import React, { useEffect, useState } from 'react';
import { Loader, AlertCircle, Info, Lock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { modulesAPI } from '../services/api';
import { Notice, SectionTitle } from './SettingsFormParts';
import { useConfirm } from './ConfirmModal';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '');

function Badge({ tone = 'muted', children }) {
  const color = { ok: 'var(--success)', brand: 'var(--brand)', warn: 'var(--warning)', danger: 'var(--danger)', muted: 'var(--fg-subtle)' }[tone];
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap',
      color, border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`, background: `color-mix(in srgb, ${color} 8%, transparent)` }}>
      {children}
    </span>
  );
}

function Switch({ checked, disabled, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      style={{ width: 40, height: 22, borderRadius: 999, border: 'none', padding: 2, flexShrink: 0, cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked ? 'var(--brand)' : 'var(--border)', opacity: disabled ? 0.45 : 1, transition: 'background 150ms' }}>
      <span style={{ display: 'block', width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transform: checked ? 'translateX(18px)' : 'none', transition: 'transform 150ms', boxShadow: '0 1px 2px rgba(0,0,0,.25)' }} />
    </button>
  );
}

function LicenseNotice({ license, superAdmin }) {
  if (license.status === 'active') {
    const offre = license.legacy ? 'licence complète (antérieure aux offres)' : (license.offreLabel || license.offre || 'licence par modules');
    return (
      <Notice tone="ok" icon={CheckCircle}>
        Licence active : <b>{offre}</b>{license.expiresAt ? <> · valable jusqu’au <b>{fmtDate(license.expiresAt)}</b></> : null}.
      </Notice>
    );
  }
  const msg = {
    none: 'Aucune licence installée : seuls les modules accordés par le super-administrateur sont disponibles.',
    invalid: 'La licence installée est invalide : seuls les modules accordés par le super-administrateur sont disponibles.',
    expired: `La licence a expiré le ${fmtDate(license.expiresAt)} : seuls les modules accordés par le super-administrateur restent disponibles.`,
  }[license.status];
  return <Notice tone={superAdmin ? 'info' : 'error'} icon={AlertCircle}>{msg}</Notice>;
}

export default function ModulesPanel({ tenantId = null }) {
  const { user, updateUser } = useAuth();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);
  const { confirm, ConfirmModalRenderer } = useConfirm();

  const apply = (payload) => {
    setData(payload);
    // Tenant courant : les menus suivent tout de suite
    if (!tenantId && user) updateUser({ ...user, modules: payload.modules.filter(m => m.active).map(m => m.key) });
  };

  useEffect(() => {
    setData(null);
    modulesAPI.get(tenantId)
      .then(res => setData(res.data))
      .catch(err => setData({ error: err.response?.data?.message || 'Impossible de charger les modules.' }));
  }, [tenantId]);

  if (!data) return <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><Loader size={20} className="animate-spin" color="var(--brand)" /></div>;
  if (data.error) return <Notice tone="error" icon={AlertCircle}>{data.error}</Notice>;

  const { superAdmin, canManage } = data;
  const byKey = Object.fromEntries(data.modules.map(m => [m.key, m]));
  const label = (k) => byKey[k]?.label || k;
  const license = { ...data.license, offreLabel: data.offres?.[data.license.offre]?.label };

  const save = async (m, body) => {
    setBusy(m.key);
    try {
      const res = await modulesAPI.set(m.key, body, tenantId);
      apply(res.data);
      toast.success(res.data.message || 'Enregistré');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l’enregistrement');
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (m, on) => {
    if (!on) {
      const alsoOff = m.dependents.filter(d => byKey[d]?.active);
      const ok = await confirm({
        title: `Désactiver « ${m.label} » ?`,
        message: `Le module ne sera plus accessible pour personne dans cet établissement (pages, menus et accès serveur).`
          + (alsoOff.length ? ` Sera aussi coupé : ${alsoOff.map(label).join(', ')}.` : '')
          + ' Rien n’est supprimé : les documents déjà signés restent dans les Archives, et le module peut être réactivé à tout moment.',
        confirmLabel: 'Désactiver',
        variant: 'warning',
      });
      if (!ok) return;
    }
    save(m, { enabled: on });
  };

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', margin: '0 0 6px' }}>Modules</h2>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0, lineHeight: 1.5 }}>
          Un module désactivé disparaît des menus et ne répond plus côté serveur. Rien n’est supprimé : ses documents déjà signés restent consultables dans les Archives.
        </p>
      </div>

      <LicenseNotice license={license} superAdmin={superAdmin} />
      {!canManage && <Notice tone="info" icon={Info}>Les modules sont gérés par l’administrateur de l’établissement.</Notice>}

      {data.groups.map(g => {
        const mods = data.modules.filter(m => m.group === g.id);
        if (!mods.length) return null;
        return (
          <div key={g.id} style={{ marginBottom: 18 }}>
            <SectionTitle>{g.label}</SectionTitle>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', overflow: 'hidden' }}>
              {mods.map((m, i) => {
                const locked = !superAdmin && !m.allowed;
                const disabled = !canManage || !m.wired || locked || busy === m.key;
                const showOn = m.wired ? m.enabled && (m.allowed || superAdmin) : m.allowed;
                return (
                  <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderTop: i ? '1px solid var(--border)' : 'none',
                    background: m.active ? 'transparent' : 'var(--surface-2)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{m.label}</span>
                        {!m.wired && <Badge>Bientôt</Badge>}
                        {m.inLicense && <Badge tone="ok">Licence</Badge>}
                        {!m.inLicense && m.granted && <Badge tone="brand">Accordé</Badge>}
                        {!m.allowed && <Badge tone="muted"><Lock size={10} style={{ verticalAlign: -1 }} /> Non inclus dans votre licence</Badge>}
                        {m.wired && m.enabled && m.allowed && m.missingDeps.length > 0 && <Badge tone="warn">Requiert : {m.missingDeps.map(label).join(', ')}</Badge>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{m.description}</div>
                      {superAdmin && m.wired && !m.inLicense && (
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: 'var(--fg)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={m.granted} disabled={busy === m.key}
                            onChange={(e) => save(m, { granted: e.target.checked, ...(e.target.checked ? {} : { enabled: false }) })}
                            style={{ accentColor: 'var(--brand)' }} />
                          Accordé hors licence (l’administrateur peut alors l’activer ou le désactiver)
                        </label>
                      )}
                    </div>
                    <Switch checked={!!showOn} disabled={disabled} label={m.label} onChange={(on) => toggle(m, on)} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {ConfirmModalRenderer}
    </div>
  );
}
