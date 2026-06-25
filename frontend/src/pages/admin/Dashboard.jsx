import { Link } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { Loading, ErrorState } from '../../components/DataState';
import { formatDate } from '../../utils/format';

const CARDS = [
  ['products', 'Products', '🛍️', '/admin/products'],
  ['services', 'Services', '🧰', '/admin/services'],
  ['categories', 'Categories', '🏷️', '/admin/categories'],
  ['cities', 'Cities', '📍', '/admin/cities'],
  ['featured_products', 'Featured Products', '⭐', '/admin/products'],
  ['new_inquiries', 'New Inquiries', '📨', '/admin/inquiries'],
];

export default function Dashboard() {
  const { data, loading, error, reload } = useFetch('/admin/dashboard');
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const { stats, recent_inquiries, recent_activity } = data;

  return (
    <>
      <div className="stat-cards">
        {CARDS.map(([key, label, icon, to]) => (
          <Link key={key} to={to} className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ fontSize: '1.4rem' }}>{icon}</div>
            <div className="n">{stats[key] ?? 0}</div>
            <div className="l">{label}</div>
          </Link>
        ))}
      </div>

      <div className="dash-cols">
        <div className="panel">
          <div style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>Recent Inquiries</div>
          {recent_inquiries.length === 0 ? <div className="empty" style={{ border: 'none' }}>No inquiries yet.</div> : (
            <table className="data-table"><tbody>
              {recent_inquiries.map((i) => (
                <tr key={i.id}>
                  <td><strong>{i.customer_name || 'Anonymous'}</strong><div className="muted small">{i.item_name || 'General'}</div></td>
                  <td className="muted small">{i.phone}</td>
                  <td className="muted small">{formatDate(i.created_at)}</td>
                </tr>
              ))}
            </tbody></table>
          )}
        </div>

        <div className="panel">
          <div style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>Recent Activity</div>
          {recent_activity.length === 0 ? <div className="empty" style={{ border: 'none' }}>No activity yet.</div> : (
            <table className="data-table"><tbody>
              {recent_activity.map((a) => (
                <tr key={a.id}>
                  <td><span className="type-pill">{a.action}</span></td>
                  <td className="muted small">{a.user}</td>
                  <td className="muted small">{formatDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody></table>
          )}
        </div>
      </div>
    </>
  );
}
