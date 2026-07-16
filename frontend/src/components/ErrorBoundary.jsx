// frontend/src/components/ErrorBoundary.jsx
// Filet de sécurité global : sans lui, la moindre erreur de rendu (ex: JSON.parse
// d'un localStorage corrompu) fait disparaître tout l'arbre React sans laisser de
// trace — exactement le bug "page blanche sur iPhone" qu'on n'arrivait pas à
// diagnostiquer faute de visibilité.
import React from 'react';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('❌ Erreur applicative interceptée par ErrorBoundary:', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetLocalData = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch { /* ignore */ }
    window.location.href = '/login';
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24,
        background: '#f8fafc', color: '#1f2937', textAlign: 'center', fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={28} color="#dc2626" />
        </div>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>Une erreur est survenue</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0, maxWidth: 340 }}>
            L'application a rencontré un problème inattendu. Recharger la page suffit en général.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={this.handleReload} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px',
            borderRadius: 8, border: 'none', background: '#1B3A6B', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <RotateCcw size={14} /> Recharger la page
          </button>
          <button onClick={this.handleResetLocalData} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px',
            borderRadius: 8, border: '1px solid #e5e7eb', background: 'transparent', color: '#6b7280', fontSize: 13, cursor: 'pointer',
          }}>
            <Trash2 size={14} /> Réinitialiser et se reconnecter
          </button>
        </div>
        {import.meta.env.DEV && (
          <pre style={{ marginTop: 16, maxWidth: 600, overflow: 'auto', fontSize: 11, color: '#dc2626', textAlign: 'left', background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}>
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
