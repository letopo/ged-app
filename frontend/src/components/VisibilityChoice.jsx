// frontend/src/components/VisibilityChoice.jsx
// Choix « Personnel / Service » à la création d'un document (upload, modèles,
// formulaires, documents liés). Pré-rempli avec le défaut du type de document
// (Paramètres › modèles), modifiable ; « Service » indisponible si l'utilisateur
// n'est rattaché à aucun service.
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Users } from 'lucide-react';
import { documentsAPI, templatePermissionsAPI } from '../services/api';

let contextPromise = null;
function loadContext() {
  if (!contextPromise) {
    contextPromise = Promise.all([
      documentsAPI.getVisibilityContext().then((r) => r.data?.data || {}).catch(() => ({})),
      templatePermissionsAPI.getMyTemplates().then((r) => r.data?.data || []).catch(() => []),
    ]).then(([ctx, templates]) => ({ ...ctx, templates }));
    // Les rattachements peuvent changer : on redemande au bout de 5 minutes
    setTimeout(() => { contextPromise = null; }, 5 * 60 * 1000);
  }
  return contextPromise;
}

/**
 * Visibilité du document en cours de création.
 * Suit le défaut du type de document tant que l'utilisateur n'a pas choisi lui-même.
 * @returns [visibility, setVisibility, context]  context = { serviceId, serviceName }
 */
export function useDocumentVisibility(category) {
  const [ctx, setCtx] = useState(null);
  const [visibility, setVisibilityState] = useState('personal');
  const touched = useRef(false);

  useEffect(() => {
    let alive = true;
    loadContext().then((c) => { if (alive) setCtx(c); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!ctx || touched.current) return;
    const tpl = ctx.templates.find((x) => x.templateName === category);
    setVisibilityState(tpl?.defaultVisibility === 'service' && ctx.serviceId ? 'service' : 'personal');
  }, [ctx, category]);

  const setVisibility = (v) => { touched.current = true; setVisibilityState(v); };
  return [visibility, setVisibility, ctx];
}

export default function VisibilityChoice({ value, onChange, context, align = 'left', style }) {
  const { t } = useTranslation();
  const noService = context && !context.serviceId;
  const options = [
    { key: 'personal', icon: Lock, label: t('Personnel') },
    { key: 'service', icon: Users, label: context?.serviceName ? t('Service · {{name}}', { name: context.serviceName }) : t('Service') },
  ];
  const hint = noService
    ? t('Vous n\'êtes rattaché à aucun service : le document sera personnel.')
    : value === 'service'
      ? t('Tous les membres de votre service pourront voir ce document.')
      : t('Ce document ne sera visible que par vous (et vos validateurs de workflow).');

  return (
    <div style={{ textAlign: align, ...style }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>{t('Visibilité du document')}</div>
      <div role="radiogroup" aria-label={t('Visibilité du document')}
        style={{ display: 'inline-flex', gap: 4, padding: 3, borderRadius: 'var(--radius-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', maxWidth: '100%', flexWrap: 'wrap' }}>
        {options.map(({ key, icon: Icon, label }) => {
          const active = value === key;
          const disabled = key === 'service' && noService;
          return (
            <button key={key} type="button" role="radio" aria-checked={active} disabled={disabled}
              onClick={() => !disabled && onChange(key)}
              title={disabled ? t('Vous n\'êtes rattaché à aucun service') : undefined}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', borderRadius: 'var(--radius-2)',
                fontSize: 13, fontWeight: active ? 700 : 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
                border: 'none', background: active ? 'var(--surface)' : 'transparent',
                color: active ? (key === 'service' ? 'var(--brand)' : 'var(--fg)') : 'var(--fg-muted)',
                boxShadow: active ? 'var(--shadow-1, 0 1px 2px rgba(0,0,0,.08))' : 'none',
              }}>
              <Icon size={14} /> {label}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 5 }}>{hint}</div>
    </div>
  );
}
