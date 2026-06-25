import { useState, useEffect } from 'react';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../components/ConfirmDialog';
import Modal from '../../components/Modal';
import { ImageField } from '../../components/ImageUploader';
import { Loading, ErrorState, Empty } from '../../components/DataState';

const BLANK = { name: '', type: 'both', description: '', image: '', icon: '', active: true, sort_order: 0 };

export default function AdminCategories() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = () => { setError(null); api.get('/admin/categories').then((r) => setRows(r.data)).catch((e) => setError(errMsg(e))); };
  useEffect(load, []);

  const save = async (f) => {
    try {
      if (f.id) await api.put(`/admin/categories/${f.id}`, f); else await api.post('/admin/categories', f);
      toast.success('Saved'); setEditing(null); load();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async (row) => {
    if (!(await confirm({ title: 'Delete category?', message: `Delete "${row.name}"?`, danger: true, confirmText: 'Delete' }))) return;
    await api.delete(`/admin/categories/${row.id}`); toast.success('Deleted'); load();
  };
  const toggle = async (row) => { await api.put(`/admin/categories/${row.id}`, { active: !row.active }); load(); };

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <div className="toolbar"><h2 style={{ margin: 0 }}>Categories</h2><button className="btn btn-primary" onClick={() => setEditing(BLANK)}>+ Add Category</button></div>
      {!rows ? <Loading /> : rows.length === 0 ? <Empty message="No categories yet." /> : (
        <div className="panel"><table className="data-table">
          <thead><tr><th>Name</th><th>Type</th><th>Used by</th><th>Status</th><th></th></tr></thead>
          <tbody>{rows.map((c) => (
            <tr key={c.id}>
              <td><strong>{c.name}</strong><div className="muted small">{c.slug}</div></td>
              <td><span className="type-pill">{c.type}</span></td>
              <td className="muted small">{c.product_count} products · {c.service_count} services</td>
              <td><button className={`badge toggle-pill ${c.active ? 'badge-on' : 'badge-off'}`} onClick={() => toggle(c)}>{c.active ? 'Active' : 'Hidden'}</button></td>
              <td><div className="row-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(c)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>Delete</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {editing && <CategoryForm initial={editing} onSave={save} onClose={() => setEditing(null)} />}
    </>
  );
}

function CategoryForm({ initial, onSave, onClose }) {
  const [f, setF] = useState({ ...BLANK, ...initial });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Modal title={f.id ? 'Edit Category' : 'Add Category'} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => onSave(f)}>Save</button></>}>
      <div className="field"><label>Name *</label><input value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
      <div className="field"><label>Type</label>
        <select value={f.type} onChange={(e) => set('type', e.target.value)}>
          <option value="both">Both</option><option value="product">Products only</option><option value="service">Services only</option>
        </select>
      </div>
      <div className="field"><label>Description</label><textarea rows="2" value={f.description || ''} onChange={(e) => set('description', e.target.value)} /></div>
      <div className="field"><label>Icon (emoji or text)</label><input value={f.icon || ''} onChange={(e) => set('icon', e.target.value)} /></div>
      <div className="field"><label>Image</label><ImageField value={f.image} onChange={(v) => set('image', v)} /></div>
      <label className="checkbox"><input type="checkbox" checked={!!f.active} onChange={(e) => set('active', e.target.checked)} /> Active</label>
    </Modal>
  );
}
