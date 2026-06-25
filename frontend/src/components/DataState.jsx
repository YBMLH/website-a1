// Small helpers for consistent loading / error / empty states.
export function Loading({ label = 'Loading…' }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '3rem', gap: '1rem' }}>
      <div className="spinner" />
      <span className="muted">{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty">
      <p style={{ color: '#dc2626' }}>{message || 'Failed to load.'}</p>
      {onRetry && <button className="btn btn-ghost" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function Empty({ message = 'Nothing here yet.', children }) {
  return <div className="empty"><p>{message}</p>{children}</div>;
}
