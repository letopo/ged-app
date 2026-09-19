// Composant skeleton loader réutilisable

const Pulse = ({ style = {} }) => (
  <div className="animate-pulse" style={{ background: 'var(--surface-3)', borderRadius: 'var(--radius-2)', ...style }} />
);

/** Carte document (grid view) */
export const DocumentCardSkeleton = () => (
  <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <Pulse style={{ width: 24, height: 24, borderRadius: 'var(--radius-2)' }} />
        <Pulse style={{ width: 80, height: 20, borderRadius: 999 }} />
      </div>
      <Pulse style={{ width: '75%', height: 16, marginBottom: 8 }} />
      <Pulse style={{ width: 64, height: 12, borderRadius: 999 }} />
    </div>
    <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Pulse style={{ width: '100%', height: 12 }} />
      <Pulse style={{ width: '66%', height: 12 }} />
    </div>
    <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
      <Pulse style={{ flex: 1, height: 36, borderRadius: 'var(--radius-2)' }} />
      <Pulse style={{ width: 36, height: 36, borderRadius: 'var(--radius-2)' }} />
      <Pulse style={{ width: 36, height: 36, borderRadius: 'var(--radius-2)' }} />
    </div>
  </div>
);

/** Grille de n cartes document */
export const DocumentGridSkeleton = ({ count = 6 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
    {Array.from({ length: count }).map((_, i) => <DocumentCardSkeleton key={i} />)}
  </div>
);

/** Ligne tableau (list view) */
export const DocumentRowSkeleton = () => (
  <tr>
    <td style={{ padding: '16px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Pulse style={{ width: 20, height: 20, borderRadius: 'var(--radius-2)' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Pulse style={{ width: '66%', height: 14 }} />
          <Pulse style={{ width: '33%', height: 12 }} />
        </div>
      </div>
    </td>
    <td style={{ padding: '16px 24px' }}><Pulse style={{ width: 96, height: 20, borderRadius: 999 }} /></td>
    <td style={{ padding: '16px 24px' }}><Pulse style={{ width: 80, height: 12 }} /></td>
    <td style={{ padding: '16px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Pulse style={{ width: 28, height: 28, borderRadius: 'var(--radius-2)' }} />
        <Pulse style={{ width: 28, height: 28, borderRadius: 'var(--radius-2)' }} />
        <Pulse style={{ width: 28, height: 28, borderRadius: 'var(--radius-2)' }} />
      </div>
    </td>
  </tr>
);

/** Table complète skeleton */
export const DocumentTableSkeleton = ({ count = 8 }) => (
  <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-1)', border: '1px solid var(--border)', overflow: 'hidden' }}>
    <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
      <thead style={{ background: 'var(--surface-2)' }}>
        <tr>
          {['Document', 'Statut', 'Date', 'Actions'].map(h => (
            <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: count }).map((_, i) => <DocumentRowSkeleton key={i} />)}
      </tbody>
    </table>
  </div>
);

/** Page entière centrée */
export const PageSkeleton = ({ rows = 5, title }) => (
  <div style={{ width: '100%', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
    {title && <Pulse style={{ width: 224, height: 32, marginBottom: 8 }} />}
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', border: '1px solid var(--border)', padding: 16, display: 'flex', gap: 16 }}>
      <Pulse style={{ flex: 1, height: 40, borderRadius: 'var(--radius-2)' }} />
      <Pulse style={{ width: 160, height: 40, borderRadius: 'var(--radius-2)' }} />
      <Pulse style={{ width: 128, height: 40, borderRadius: 'var(--radius-2)' }} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-3)', border: '1px solid var(--border)', padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Pulse style={{ width: 32, height: 32, borderRadius: 'var(--radius-2)' }} />
          <Pulse style={{ flex: 1, height: 16 }} />
          <Pulse style={{ width: 96, height: 16 }} />
          <Pulse style={{ width: 80, height: 16 }} />
        </div>
      ))}
    </div>
  </div>
);

export default DocumentGridSkeleton;
