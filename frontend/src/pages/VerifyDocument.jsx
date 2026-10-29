// frontend/src/pages/VerifyDocument.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ShieldX, Loader, FileText, Calendar, User, CheckCircle, Search } from 'lucide-react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const BCP47_LOCALES = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', ar: 'ar-SA' };

const STATUS_LABELS = {
  approved:           'Approuvé',
  rejected:           'Rejeté',
  pending_validation: 'En attente',
  in_progress:        'En cours',
  draft:              'Brouillon',
};

// Saisie du code imprimé sous le QR (16 caractères) : copies papier, ou QR
// illisible / dont l'adresse est fausse (anciens documents signés vers localhost).
function CodeForm({ autoFocus = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const clean = code.toLowerCase().replace(/[^0-9a-f]/g, '');
  const submit = (e) => {
    e.preventDefault();
    if (clean.length === 16) navigate(`/verify/${clean}`);
  };
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label htmlFor="verify-code" style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)' }}>
        {t('Code imprimé sous le QR code (16 caractères)')}
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input id="verify-code" value={code} onChange={e => setCode(e.target.value)} autoFocus={autoFocus}
          placeholder="ex. 3f9a1c0b7d2e4a68" autoComplete="off" spellCheck={false}
          style={{ flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: 'var(--radius-2)', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 14, fontFamily: 'var(--font-mono)', outline: 'none' }} />
        <button type="submit" disabled={clean.length !== 16}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 'var(--radius-2)', border: 'none', background: clean.length === 16 ? 'var(--brand)' : 'var(--fg-subtle)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: clean.length === 16 ? 'pointer' : 'default' }}>
          <Search size={14} /> {t('Vérifier')}
        </button>
      </div>
    </form>
  );
}

export default function VerifyDocument() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const locale = BCP47_LOCALES[lang] || 'fr-FR';
  const { hash } = useParams();
  const [loading, setLoading] = useState(!!hash);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const verify = async () => {
      setLoading(true);
      setError(false);
      setResult(null);
      try {
        const res = await api.get(`/verify/${hash}`);
        setResult(res.data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    if (hash) verify();
  }, [hash]);

  /* ── Saisie du code (lien /verify sans code) ── */
  if (!hash) return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-5)', boxShadow: 'var(--shadow-3)', maxWidth: 440, width: '100%', padding: '28px 24px' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--brand-soft)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={26} color="var(--brand)" />
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg)', textAlign: 'center', marginBottom: 6 }}>{t('Vérifier un document')}</div>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)', textAlign: 'center', marginBottom: 18 }}>
          {t('Scannez le QR code du document, ou saisissez le code imprimé juste en dessous.')}
        </div>
        <CodeForm autoFocus />
      </div>
    </div>
  );

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Loader size={32} color="var(--brand)" className="animate-spin" />
      <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Vérification en cours…')}</div>
    </div>
  );

  /* ── Error ── */
  if (error || !result) return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-5)', boxShadow: 'var(--shadow-3)',
        maxWidth: 400, width: '100%', padding: '32px 28px', textAlign: 'center',
      }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--danger-soft)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldX size={26} color="var(--danger)" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', marginBottom: 8 }}>{t('Erreur de vérification')}</div>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 18 }}>{t('Impossible de vérifier ce document. Le lien est peut-être invalide.')}</div>
        <div style={{ textAlign: 'left' }}><CodeForm /></div>
      </div>
    </div>
  );

  const { verified, data } = result;

  /* ── Result ── */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-5)', boxShadow: 'var(--shadow-3)',
        maxWidth: 480, width: '100%', overflow: 'hidden',
      }}>

        {/* Status header */}
        <div style={{
          padding: '24px 28px', textAlign: 'center',
          background: verified ? 'var(--success-soft)' : 'var(--danger-soft)',
          borderBottom: `1px solid ${verified ? 'var(--success)' : 'var(--danger)'}`,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px',
            background: verified ? 'rgba(26,122,74,0.15)' : 'rgba(192,57,43,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {verified
              ? <ShieldCheck size={28} color="var(--success)" />
              : <ShieldX size={28} color="var(--danger)" />}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: verified ? 'var(--success)' : 'var(--danger)', marginBottom: 6 }}>
            {verified ? t('Document vérifié') : t('Document non vérifié')}
          </div>
          <div style={{ fontSize: 13, color: verified ? 'var(--success)' : 'var(--danger)' }}>
            {verified
              ? t('Ce document a été signé électroniquement et est authentique.')
              : result.message || t("Ce document n'a pas pu être vérifié.")}
          </div>
        </div>

        {!verified && (
          <div style={{ padding: '18px 24px' }}><CodeForm /></div>
        )}

        {/* Details */}
        {verified && data && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Document title */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-3)' }}>
              <FileText size={16} color="var(--brand)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{data.title}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{data.category}</div>
              </div>
            </div>

            {/* Meta grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-3)' }}>
                <User size={13} color="var(--fg-subtle)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{t('Créé par')}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{data.createdBy}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-3)' }}>
                <Calendar size={13} color="var(--fg-subtle)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{t('Date de création')}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{new Date(data.createdAt).toLocaleDateString(locale)}</div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--success-soft)', borderRadius: 'var(--radius-3)' }}>
              <CheckCircle size={13} color="var(--success)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 10, color: 'var(--success)' }}>{t('Statut')}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)' }}>{t(STATUS_LABELS[data.status] || data.status)}</div>
              </div>
            </div>

            {/* Signatures */}
            {data.signatures && data.signatures.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  {t('Signatures ({{count}})', { count: data.signatures.length })}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.signatures.map((sig, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)' }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'var(--brand)', color: '#fff',
                        fontSize: 10, fontWeight: 700, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{sig.step}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sig.validator}</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{sig.role}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{new Date(sig.date).toLocaleDateString(locale)}</div>
                        <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{new Date(sig.date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hash footer */}
            <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                {t('Hash :')} <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{data.verificationHash}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 3 }}>
                Hôpital Saint Jean de Malte — Système GED
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
