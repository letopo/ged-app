// frontend/src/components/SessionWarning.jsx
import { Clock, LogOut, RefreshCw } from 'lucide-react';

export default function SessionWarning({ remainingSeconds, onExtend, onLogout }) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div className="animate-fadeIn" style={{
        position: 'relative', background: 'var(--surface)', borderRadius: 'var(--radius-4)',
        boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 360, overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        <div style={{ padding: 24, textAlign: 'center' }}>
          {/* Icon */}
          <div style={{
            margin: '0 auto 16px', width: 56, height: 56,
            background: 'var(--warning-soft)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Clock size={28} style={{ color: 'var(--warning)' }} />
          </div>

          {/* Title */}
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>
            Session bientôt expirée
          </h3>

          {/* Countdown */}
          <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--warning)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>

          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 24 }}>
            Votre session va expirer par inactivité. Souhaitez-vous rester connecté ?
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={onLogout}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 16px', fontSize: 13, fontWeight: 500,
                color: 'var(--fg)', background: 'var(--surface-2)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
            >
              <LogOut size={15} /> Déconnexion
            </button>
            <button
              onClick={onExtend}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 16px', fontSize: 13, fontWeight: 500,
                color: '#fff', background: 'var(--brand)',
                border: 'none', borderRadius: 'var(--radius-3)', cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-active)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
            >
              <RefreshCw size={15} /> Rester connecté
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
