import { useState, useEffect } from 'react';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../components/ConfirmDialog';
import { Loading, ErrorState, Empty } from '../../components/DataState';
import { formatDate } from '../../utils/format';

const FILTERS = [['', 'All'], ['new', 'New'], ['read', 'Read'], ['archived', 'Archived']];

export default function AdminInquiries() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');

  const load = () => { setError(null); api.get(`/admin/inquiries${filter ? `?status=${filter}` : ''}`).then((r) => setRows(r.data)).catch((e) => setError(errMsg(e))); };
  useEffect(load, [filter]);

  const setStatus = async (row, status) => { await api.patch(`/admin/inquiries/${row.id}`, { status }); load(); };
  const remove = async (row) => {
    if (!(await confirm({ title: 'Delete inquiry?', message: 'Delete this inquiry permanently?', danger: true, confirmText: 'Delete' }))) return;
    await api.delete(`/admin/inquiries/${row.id}`); toast.success('Deleted'); load();
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  return (
    <>
      <div className="toolbar">
        <h2 style={{ margin: 0 }}>Inquiries</h2>
        <div className="settings-tabs" style={{ margin: 0 }}>
          {FILTERS.map(([v, l]) => <button key={v} className={filter === v ? 'active' : ''} onClick={() => setFilter(v)}>{l}</button>)}
        </div>
      </div>
      {!rows ? <Loading /> : rows.length === 0 ? <Empty message="No inquiries." /> : (
        <div className="panel"><table className="data-table">
          <thead><tr><th>Customer</th><th>Item</th><th>Message</th><th>Date</th><th>Status</th><th></th></tr></thead>
          <tbody>{rows.map((i) => (
            <tr key={i.id}>
              <td><strong>{i.customer_name || 'Anonymous'}</strong><div className="muted small">{i.phone} {i.email && `· ${i.email}`}</div></td>
              <td>{i.item_name || <span className="muted">General</span>}<div className="muted small">{[i.item_type, i.price, i.city].filter(Boolean).join(' · ')}</div></td>
              <td className="muted small" style={{ maxWidth: 280 }}>{i.message}</td>
              <td className="muted small">{formatDate(i.created_at)}</td>
              <td><span className={`badge ${i.status === 'new' ? 'badge-new' : i.status === 'archived' ? 'badge-off' : 'badge-on'}`}>{i.status}</span></td>
              <td><div className="row-actions">
                {i.status !== 'read' && <button className="btn btn-ghost btn-sm" onClick={() => setStatus(i, 'read')}>Mark read</button>}
                {i.status !== 'archived' && <button className="btn btn-ghost btn-sm" onClick={() => setStatus(i, 'archived')}>Archive</button>}
                <button className="btn btn-danger btn-sm" onClick={() => remove(i)}>Delete</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}
