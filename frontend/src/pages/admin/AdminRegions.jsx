import { useState, useEffect } from 'react';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../components/ConfirmDialog';
import Modal from '../../components/Modal';
import { Loading, ErrorState, Empty } from '../../components/DataState';

const BLANK = { name: '', country: '', description: '', active: true, sort_order: 0 };

export default function AdminRegions() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = () => { setError(null); api.get('/admin/regions').then((r) => setRows(r.data)).catch((e) => setError(errMsg(e))); };
  useEffect(load, []);

  const save = async (f) => {
    try { if (f.id) await api.put(`/admin/regions/${f.id}`, f); else await api.post('/admin/regions', f); toast.success('Saved'); setEditing(null); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async (row) => {
    if (!(await confirm({ title: 'Delete region?', message: `Delete "${row.name}"? Cities keep existing but lose this region.`, danger: true, confirmText: 'Delete' }))) return;
    await api.delete(`/admin/regions/${row.id}`); toast.success('Deleted'); load();
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  return (
    <>
      <div className="toolbar"><h2 style={{ margin: 0 }}>Regions</h2><button className="btn btn-primary" onClick={() => setEditing(BLANK)}>+ Add Region</button></div>
      {!rows ? <Loading /> : rows.length === 0 ? <Empty message="No regions yet." /> : (
        <div className="panel"><table className="data-table">
          <thead><tr><th>Name</th><th>Country</th><th>Cities</th><th>Status</th><th></th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><strong>{r.name}</strong></td><td className="muted">{r.country || '—'}</td>
              <td className="muted small">{r.city_count}</td>
              <td><span className={`badge ${r.active ? 'badge-on' : 'badge-off'}`}>{r.active ? 'Active' : 'Hidden'}</span></td>
              <td><div className="row-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(r)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>Delete</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {editing && (
        <Modal title={editing.id ? 'Edit Region' : 'Add Region'} onClose={() => setEditing(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={() => save(editing)}>Save</button></>}>
          <div className="field"><label>Name *</label><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
          <div className="field"><label>Country</label><input value={editing.country || ''} onChange={(e) => setEditing({ ...editing, country: e.target.value })} /></div>
          <div className="field"><label>Description</label><textarea rows="2" value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
          <label className="checkbox"><input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
        </Modal>
      )}
    </>
  );
}
