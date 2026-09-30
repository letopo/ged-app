// frontend/src/components/SettingsFormParts.jsx
// Éléments communs des pages de réglage (Messagerie, IA · OCR, Intégrations).
import React from 'react';

export const inputStyle = {
  width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
  background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
export const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--fg)', display: 'block', marginBottom: 6 };
export const hintStyle = { fontSize: 11, color: 'var(--fg-subtle)', marginTop: 5 };

export const btn = (primary) => ({
  height: 36, padding: '0 16px', borderRadius: 'var(--radius-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
  border: primary ? 'none' : '1px solid var(--border)',
  background: primary ? 'var(--brand)' : 'var(--surface)', color: primary ? '#fff' : 'var(--fg)',
});

export function Field({ label, hint, children, style }) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={hintStyle}>{hint}</div>}
    </div>
  );
}

export function Notice({ tone, icon: Icon, children, style }) {
  const color = tone === 'error' ? 'var(--danger)' : tone === 'ok' ? 'var(--success)' : 'var(--brand)';
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-2)', marginBottom: 16,
      border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`, background: `color-mix(in srgb, ${color} 8%, transparent)`,
      fontSize: 12, color: 'var(--fg)', lineHeight: 1.5, ...style }}>
      <Icon size={15} style={{ color, flexShrink: 0, marginTop: 1 }} />
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, margin: '8px 0 10px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{children}</div>
      {action}
    </div>
  );
}

// Case « activer » en tête de page
export function EnableToggle({ checked, onChange, children }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width: 16, height: 16, accentColor: 'var(--brand)' }} />
      {children}
    </label>
  );
}
