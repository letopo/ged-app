// frontend/src/components/SageSettingsPanel.jsx
// Paramètres › Intégrations › Sage : import automatique des factures PHP depuis
// Sage 100 (SQL Server, lecture seule). Tenant courant, ou `tenantId` fourni
// (Clients SaaS, superadmin). Le mot de passe n'est jamais renvoyé.
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, Database, Save, Eye, EyeOff, CheckCircle, AlertCircle, Info, Plug, Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { integrationsAPI } from '../services/api';
import { inputStyle, hintStyle, btn, Field, Notice, SectionTitle, EnableToggle } from './SettingsFormParts';

const FILTER_LABELS = {
  none: 'Aucun critère — rien n’est importé',
  compte_collectif: 'Compte collectif du client (recommandé)',
  client_name: 'Le nom du client contient…',
  cat_tarif: 'Catégorie tarifaire du client égale à…',
  client_nums: 'Numéros de client (liste)…',
};
const FILTER_HINTS = {
  compte_collectif: 'Patients PHP : 4127000 = employés, 4122000 = familles. Séparez plusieurs comptes par une virgule.',
  client_name: 'Ex. « PHP » : toutes les factures dont le client (ou la mutuelle) contient ce texte.',
  cat_tarif: 'Numéro de la catégorie tarifaire Sage des patients PHP (ex. 3).',
  client_nums: 'Codes clients Sage séparés par des virgules ou des retours à la ligne.',
};

export default function SageSettingsPanel({ tenantId = null }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [enabled, setEnabled] = useState(true);
  const [cfg, setCfg] = useState({});
  const [adminCanManage, setAdminCanManage] = useState(false);
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(null);      // 'save' | 'test' | 'preview' | 'sync'
  const [result, setResult] = useState(null);  // { kind, ok, message, rows? }

  const apply = (payload) => {
    setData(payload);
    const i = payload.integration || {};
    setEnabled(payload.source === 'tenant' ? Boolean(i.enabled) : true);
    setCfg({ importFromDate: new Date().toISOString().slice(0, 10), ...(i.config || {}) });
    setAdminCanManage(Boolean(i.adminCanManage));
    setSecret('');
  };

  useEffect(() => {
    integrationsAPI.get('sage', tenantId)
      .then(res => apply(res.data))
      .catch(err => setData({ error: err.response?.data?.message || t('Impossible de charger les réglages.') }));
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><Loader size={20} className="animate-spin" color="var(--brand)" /></div>;
  if (data.error) return <Notice tone="error" icon={AlertCircle}>{data.error}</Notice>;
  if (!data.canManage) return <Notice tone="info" icon={Info}>{t('Ce réglage est géré par le super-administrateur.')}</Notice>;

  const i = data.integration;
  const set = (k) => (e) => setCfg(c => ({ ...c, [k]: e.target.value }));
  const fmt = (d) => (d ? new Date(d).toLocaleString() : null);
  const hasPassword = Boolean(secret || i?.hasSecret);
  const payload = () => ({ enabled, config: cfg, ...(secret ? { secret } : {}), ...(data.canDelegate ? { adminCanManage } : {}) });

  const run = async (kind, fn) => {
    setBusy(kind);
    setResult(null);
    try {
      const res = await fn();
      if (kind === 'save') { apply(res.data); toast.success(res.data.message || t('Réglages enregistrés.')); }
      else setResult({ kind, ok: true, message: res.data.message, rows: res.data.rows });
      if (kind === 'sync') integrationsAPI.get('sage', tenantId).then(r => apply(r.data)).catch(() => {});
    } catch (err) {
      const message = err.response?.data?.message || t('Échec.');
      if (kind === 'save') toast.error(message);
      else setResult({ kind, ok: false, message });
    } finally { setBusy(null); }
  };

  const ResultBox = ({ kind }) => (result?.kind === kind ? (
    <div style={{ marginTop: 10 }}>
      <Notice tone={result.ok ? 'ok' : 'error'} icon={result.ok ? CheckCircle : AlertCircle} style={{ marginBottom: result.rows?.length ? 10 : 0 }}>{result.message}</Notice>
      {result.rows?.length > 0 && (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', background: 'var(--surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>{t('Pièce')}</th><th style={{ padding: '6px 8px' }}>{t('Date')}</th><th style={{ padding: '6px 8px' }}>{t('État')}</th>
                <th style={{ padding: '6px 8px' }}>{t('Client')}</th><th style={{ padding: '6px 8px' }}>{t('Compte collectif')}</th><th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('Total TTC')}</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map(r => (
                <tr key={r.piece} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{r.piece}</td>
                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{r.date ? new Date(r.date).toLocaleDateString() : ''}</td>
                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', color: r.comptabilisee ? 'var(--fg-muted)' : 'var(--warning)' }}>{r.comptabilisee ? t('Comptabilisée') : t('Non comptabilisée')}</td>
                  <td style={{ padding: '6px 8px' }}>{r.client} <span style={{ color: 'var(--fg-subtle)' }}>({r.clientNum})</span></td>
                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                    {r.compteCollectif || '—'}{r.type && <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 999, fontSize: 11, background: r.type === 'Employé PHP' ? 'var(--brand-soft)' : 'var(--success-soft)', color: r.type === 'Employé PHP' ? 'var(--brand)' : 'var(--success)' }}>{t(r.type)}</span>}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{Number(r.totalTTC || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  ) : null);

  return (
    <form onSubmit={e => { e.preventDefault(); run('save', () => integrationsAPI.save('sage', payload(), tenantId)); }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Database size={20} /> {t('Intégrations · Sage')}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>
        {t('Import automatique des factures patients PHP depuis Sage 100 pour {{org}} : chaque facture devient un document PDF soumis au circuit de validation. La GED ne fait que lire Sage, elle n’y modifie jamais rien.', { org: data.tenant?.name })}
      </p>

      {i?.lastRunAt && (
        <Notice tone={i.lastRunOk ? 'ok' : 'error'} icon={i.lastRunOk ? CheckCircle : AlertCircle}>
          {t('Dernière synchronisation le {{date}} :', { date: fmt(i.lastRunAt) })} {i.lastRunMessage}
        </Notice>
      )}
      {i?.secretUnreadable && (
        <Notice tone="error" icon={AlertCircle}>{t('Le mot de passe enregistré ne peut plus être lu (clé de chiffrement du serveur changée) : ressaisissez-le.')}</Notice>
      )}

      <EnableToggle checked={enabled} onChange={e => setEnabled(e.target.checked)}>{t('Importer automatiquement les factures PHP depuis Sage')}</EnableToggle>

      {/* Connexion */}
      <SectionTitle>{t('Connexion au serveur Sage (SQL Server)')}</SectionTitle>
      <div className="mail-grid">
        <Field label={t('Serveur')} hint={t('Instance nommée : adresse\\INSTANCE (ex. 192.168.1.70\\SAGE100), le port est alors trouvé automatiquement.')}>
          <input style={inputStyle} value={cfg.host || ''} onChange={set('host')} placeholder="192.168.1.70\SAGE100" />
        </Field>
        <Field label={t('Port')}><input style={inputStyle} value={cfg.port ?? ''} onChange={set('port')} inputMode="numeric" placeholder="1433" /></Field>
        <Field label={t('Base de données')}><input style={inputStyle} value={cfg.database || ''} onChange={set('database')} placeholder="HSJM" /></Field>
      </div>
      <div className="mail-grid mail-grid-2">
        <Field label={t('Type de connexion')}>
          <select style={inputStyle} value={cfg.authType || 'ntlm'} onChange={set('authType')}>
            <option value="ntlm">{t('Compte Windows (domaine)')}</option>
            <option value="sql">{t('Compte SQL Server')}</option>
          </select>
        </Field>
        {cfg.authType !== 'sql'
          ? <Field label={t('Domaine Windows')}><input style={inputStyle} value={cfg.domain || ''} onChange={set('domain')} placeholder="HSJM" /></Field>
          : <div />}
      </div>
      <div className="mail-grid mail-grid-2">
        <Field label={t('Compte')} hint={t('Idéalement un compte en lecture seule, dédié à la GED.')}>
          <input style={inputStyle} value={cfg.username || ''} onChange={set('username')} autoComplete="off" />
        </Field>
        <Field label={t('Mot de passe')} hint={i?.hasSecret && !secret ? t('Un mot de passe est enregistré. Laissez vide pour le conserver.') : null}>
          <div style={{ position: 'relative' }}>
            <input style={{ ...inputStyle, paddingRight: 38 }} type={showSecret ? 'text' : 'password'} value={secret}
              onChange={e => setSecret(e.target.value)} autoComplete="new-password" placeholder={i?.hasSecret ? '••••••••••••' : ''} />
            <button type="button" onClick={() => setShowSecret(v => !v)} aria-label={t('Afficher le mot de passe')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4 }}>
              {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>
      </div>
      <div style={{ marginBottom: 20 }}>
        <button type="button" onClick={() => run('test', () => integrationsAPI.test('sage', payload(), tenantId))}
          disabled={busy || !cfg.host || !hasPassword} style={{ ...btn(false), opacity: busy || !cfg.host || !hasPassword ? 0.6 : 1 }}>
          {busy === 'test' ? <Loader size={13} className="animate-spin" /> : <Plug size={13} />} {t('Tester la connexion')}
        </button>
        <ResultBox kind="test" />
        {result?.kind !== 'test' && i?.lastTestAt && (
          <div style={{ ...hintStyle, marginTop: 8 }}>
            {i.lastTestOk ? t('Dernier test réussi le {{date}}.', { date: fmt(i.lastTestAt) }) : t('Dernier test échoué le {{date}} : {{error}}', { date: fmt(i.lastTestAt), error: i.lastTestError })}
          </div>
        )}
      </div>

      {/* Critère facture PHP */}
      <SectionTitle>{t('Quelles factures importer ?')}</SectionTitle>
      <p style={{ ...hintStyle, fontSize: 12, marginTop: -4, marginBottom: 12 }}>
        {t('Seules les factures de vente sont lues. Choisissez comment reconnaître celles des patients PHP, puis vérifiez avec l’aperçu.')}
      </p>
      <Field label={t('Critère')}>
        <select style={inputStyle} value={cfg.filterMode || 'none'} onChange={e => {
          const mode = e.target.value;
          setCfg(c => ({ ...c, filterMode: mode, filterValue: mode === 'compte_collectif' && !(c.filterValue || '').trim() ? '4127000, 4122000' : c.filterValue }));
        }}>
          {(data.filterModes || Object.keys(FILTER_LABELS)).map(m => <option key={m} value={m}>{t(FILTER_LABELS[m])}</option>)}
        </select>
      </Field>
      {cfg.filterMode && cfg.filterMode !== 'none' && (
        <Field label={t('Valeur')} hint={t(FILTER_HINTS[cfg.filterMode])}>
          {cfg.filterMode === 'client_nums'
            ? <textarea style={{ ...inputStyle, height: 70, padding: '8px 12px', resize: 'vertical' }} value={cfg.filterValue || ''} onChange={set('filterValue')} />
            : <input style={inputStyle} value={cfg.filterValue || ''} onChange={set('filterValue')} inputMode={cfg.filterMode === 'cat_tarif' ? 'numeric' : undefined} />}
        </Field>
      )}
      <Field label={t('Factures à importer')} hint={cfg.invoiceStatus === 'posted'
        ? t('Seules les factures déjà comptabilisées dans Sage sont importées (elles arrivent après la clôture comptable).')
        : t('Une facture non comptabilisée peut encore être modifiée dans Sage : la GED garde la version du moment de l’import. Une fois comptabilisée, elle n’est pas importée une seconde fois.')}>
        <select style={inputStyle} value={cfg.invoiceStatus || 'all'} onChange={set('invoiceStatus')}>
          <option value="all">{t('Comptabilisées et non comptabilisées (recommandé)')}</option>
          <option value="posted">{t('Comptabilisées seulement')}</option>
        </select>
      </Field>
      {(!cfg.filterMode || cfg.filterMode === 'none') && (
        <Notice tone="info" icon={Info}>{t('Sans critère, aucune facture n’est importée : mieux vaut ne rien importer que d’importer les mauvaises factures.')}</Notice>
      )}
      <div style={{ marginBottom: 20 }}>
        <button type="button" onClick={() => run('preview', () => integrationsAPI.preview(payload(), tenantId))}
          disabled={busy || !cfg.host || !hasPassword} style={{ ...btn(false), opacity: busy || !cfg.host || !hasPassword ? 0.6 : 1 }}>
          {busy === 'preview' ? <Loader size={13} className="animate-spin" /> : <Search size={13} />} {t('Aperçu des factures qui seraient importées')}
        </button>
        <ResultBox kind="preview" />
      </div>

      {/* Import */}
      <SectionTitle>{t('Import dans la GED')}</SectionTitle>
      <div className="mail-grid mail-grid-2">
        <Field label={t('Catégorie des documents créés')}><input style={inputStyle} value={cfg.documentCategory || ''} onChange={set('documentCategory')} /></Field>
        <Field label={t('Modèle de workflow')} hint={t('Nom exact d’un modèle existant (Modèles de workflow).')}>
          <input style={inputStyle} value={cfg.workflowTemplateName || ''} onChange={set('workflowTemplateName')} />
        </Field>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 16px' }}>
        <Field label={t('Importer les factures à partir du')} hint={t('Seules les factures Sage datées de ce jour ou après sont importées : l’historique ne l’est pas.')} style={{ flex: '1 1 260px', maxWidth: 360 }}>
          <input type="date" style={inputStyle} value={cfg.importFromDate || ''} onChange={set('importFromDate')} />
        </Field>
        <Field label={t('Fréquence de synchronisation (minutes)')} hint={t('Entre 5 et 1440 minutes.')} style={{ flex: '1 1 220px', maxWidth: 260 }}>
          <input style={inputStyle} value={cfg.syncIntervalMinutes ?? ''} onChange={set('syncIntervalMinutes')} inputMode="numeric" />
        </Field>
      </div>

      {data.canDelegate && (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '4px 0 20px', cursor: 'pointer', fontSize: 13, color: 'var(--fg)' }}>
          <input type="checkbox" checked={adminCanManage} onChange={e => setAdminCanManage(e.target.checked)} style={{ width: 16, height: 16, marginTop: 1, accentColor: 'var(--brand)' }} />
          <span>
            {t('Autoriser les administrateurs de {{org}} à gérer ces réglages', { org: data.tenant?.name })}
            <span style={{ display: 'block', ...hintStyle }}>{t('Ils ne verront que les réglages de leur organisation. Réservé au super-administrateur.')}</span>
          </span>
        </label>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <button type="button" onClick={() => run('sync', () => integrationsAPI.sync(tenantId))}
            disabled={busy || !i?.enabled} title={!i?.enabled ? t('Activez et enregistrez d’abord l’intégration.') : undefined}
            style={{ ...btn(false), opacity: busy || !i?.enabled ? 0.6 : 1 }}>
            {busy === 'sync' ? <Loader size={13} className="animate-spin" /> : <RefreshCw size={13} />} {t('Synchroniser maintenant')}
          </button>
          <ResultBox kind="sync" />
        </div>
        <button type="submit" disabled={Boolean(busy)} style={{ ...btn(true), opacity: busy ? 0.7 : 1, alignSelf: 'flex-start' }}>
          {busy === 'save' ? <Loader size={13} className="animate-spin" /> : <Save size={13} />} {t('Enregistrer')}
        </button>
      </div>
    </form>
  );
}
