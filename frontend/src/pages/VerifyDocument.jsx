// frontend/src/pages/VerifyDocument.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, ShieldX, Loader, FileText, Calendar, User, CheckCircle } from 'lucide-react';
import api from '../services/api';

const STATUS_LABELS = {
  approved:           'Approuvé',
  rejected:           'Rejeté',
  pending_validation: 'En attente',
  in_progress:        'En cours',
  draft:              'Brouillon',
};

export default function VerifyDocument() {
  const { hash } = useParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const verify = async () => {
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

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Loader size={32} color="var(--brand)" className="animate-spin" />
      <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Vérification en cours…</div>
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
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', marginBottom: 8 }}>Erreur de vérification</div>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Impossible de vérifier ce document. Le lien est peut-être invalide.</div>
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
            {verified ? 'Document vérifié' : 'Document non vérifié'}
          </div>
          <div style={{ fontSize: 13, color: verified ? 'var(--success)' : 'var(--danger)' }}>
            {verified
              ? 'Ce document a été signé électroniquement et est authentique.'
              : result.message || "Ce document n'a pas pu être vérifié."}
          </div>
        </div>

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
                  <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>Créé par</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{data.createdBy}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-3)' }}>
                <Calendar size={13} color="var(--fg-subtle)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>Date de création</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{new Date(data.createdAt).toLocaleDateString('fr-FR')}</div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--success-soft)', borderRadius: 'var(--radius-3)' }}>
              <CheckCircle size={13} color="var(--success)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 10, color: 'var(--success)' }}>Statut</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)' }}>{STATUS_LABELS[data.status] || data.status}</div>
              </div>
            </div>

            {/* Signatures */}
            {data.signatures && data.signatures.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  Signatures ({data.signatures.length})
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
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{new Date(sig.date).toLocaleDateString('fr-FR')}</div>
                        <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{new Date(sig.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hash footer */}
            <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                Hash : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{data.verificationHash}</span>
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
