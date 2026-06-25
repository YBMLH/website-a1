import { useState, useEffect } from 'react';
import api, { errMsg } from '../../api/client';
import { Loading, ErrorState, Empty } from '../../components/DataState';
import { formatDate } from '../../utils/format';

export default function AdminAudit() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [actions, setActions] = useState([]);
  const [action, setAction] = useState('');

  const load = () => { setError(null); api.get(`/admin/audit?limit=300${action ? `&action=${action}` : ''}`).then((r) => setRows(r.data)).catch((e) => setError(errMsg(e))); };
  useEffect(load, [action]);
  useEffect(() => { api.get('/admin/audit/actions').then((r) => setActions(r.data)).catch(() => {}); }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  return (
    <>
      <div className="toolbar">
        <h2 style={{ margin: 0 }}>Audit Log</h2>
        <select className="search" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      {!rows ? <Loading /> : rows.length === 0 ? <Empty message="No activity logged." /> : (
        <div className="panel"><table className="data-table">
          <thead><tr><th>Action</th><th>User</th><th>Details</th><th>IP</th><th>When</th></tr></thead>
          <tbody>{rows.map((a) => (
            <tr key={a.id}>
              <td><span className="type-pill">{a.action}</span></td>
              <td className="muted">{a.user}</td>
              <td className="muted small" style={{ maxWidth: 360, wordBreak: 'break-word' }}>{a.details}</td>
              <td className="muted small">{a.ip}</td>
              <td className="muted small">{formatDate(a.created_at)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}
