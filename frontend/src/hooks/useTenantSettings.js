// frontend/src/hooks/useTenantSettings.js
// Réglages de l'organisation (Paramètres › Délais et session), chargés une fois
// et partagés par tous les écrans. Tant qu'ils ne sont pas chargés (ou si le
// serveur ne répond pas), les valeurs historiques de l'application s'appliquent.
import { useEffect, useState } from 'react';
import { tenantSettingsAPI } from '../services/api';

export const TENANT_SETTINGS_DEFAULTS = {
  workflowDeadlineDays: 7,
  lateDays: 2,
  sessionIdleMinutes: 30,
  sessionMaxDays: 7,
  maxUploadMb: 50,
};

let current = { ...TENANT_SETTINGS_DEFAULTS };
let pending = null;
const listeners = new Set();

const publish = (settings) => {
  current = { ...TENANT_SETTINGS_DEFAULTS, ...settings };
  listeners.forEach(fn => fn(current));
};

// Recharge depuis le serveur (après connexion ou après enregistrement)
export function refreshTenantSettings() {
  pending = tenantSettingsAPI.get()
    .then(res => publish(res.data.settings))
    .catch(() => { pending = null; }); // réessai au prochain écran
  return pending;
}

// Après enregistrement : valeurs renvoyées par le serveur, sans nouvel appel
export const setTenantSettings = publish;

export default function useTenantSettings({ enabled = true } = {}) {
  const [settings, setSettings] = useState(current);
  useEffect(() => {
    listeners.add(setSettings);
    if (enabled && !pending && localStorage.getItem('token')) refreshTenantSettings();
    setSettings(current);
    return () => listeners.delete(setSettings);
  }, [enabled]);
  return settings;
}
