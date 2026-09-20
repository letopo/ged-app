/**
 * Composant état vide réutilisable
 * Props:
 *   icon        — composant Lucide
 *   title       — titre principal
 *   description — texte secondaire (optionnel)
 *   action      — { label, onClick, to }
 *   compact     — version réduite (default: false)
 */
import { Link } from 'react-router-dom';

export default function EmptyState({ icon: Icon, title, description, action, compact = false }) {
  const btnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 34, padding: '0 14px', borderRadius: 'var(--radius-2)',
    background: 'var(--brand)', color: '#fff',
    fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
    textDecoration: 'none',
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center',
      padding: compact ? '32px 16px' : '64px 16px',
    }}>
      {Icon && (
        <div style={{
          marginBottom: compact ? 10 : 14,
          padding: compact ? 10 : 14,
          background: 'var(--surface-2)',
          borderRadius: 'var(--radius-4)',
        }}>
          <Icon size={compact ? 24 : 36} color="var(--fg-subtle)" />
        </div>
      )}

      <div style={{
        fontSize: compact ? 13 : 15, fontWeight: 600,
        color: 'var(--fg-muted)', marginBottom: description ? 6 : 0,
      }}>
        {title}
      </div>

      {description && (
        <div style={{
          fontSize: 12, color: 'var(--fg-subtle)',
          maxWidth: 280, lineHeight: 1.5, marginBottom: action ? 16 : 0,
        }}>
          {description}
        </div>
      )}

      {action && (
        action.to ? (
          <Link to={action.to} style={btnStyle}>{action.label}</Link>
        ) : (
          <button onClick={action.onClick} style={btnStyle}>{action.label}</button>
        )
      )}
    </div>
  );
}
