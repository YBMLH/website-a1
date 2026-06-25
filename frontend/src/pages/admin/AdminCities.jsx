import { useState, useEffect } from 'react';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../components/ConfirmDialog';
import Modal from '../../components/Modal';
import { ImageField } from '../../components/ImageUploader';
import { Loading, ErrorState, Empty } from '../../components/DataState';

const BLANK = {
  name: '', region_id: '', region: '', country: '', state_province: '', address: '', postal_code: '',
  google_maps_link: '', latitude: '', longitude: '', image: '', description: '', active: true, featured: false, sort_order: 0,
};

export default function AdminCities() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [regions, setRegions] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => { setError(null); api.get('/admin/cities').then((r) => setRows(r.data)).catch((e) => setError(errMsg(e))); };
  useEffect(() => { load(); api.get('/admin/regions').then((r) => setRegions(r.data)).catch(() => {}); }, []);

  const save = async (f) => {
    try { if (f.id) await api.put(`/admin/cities/${f.id}`, f); else await api.post('/admin/cities', f); toast.success('Saved'); setEditing(null); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async (row) => {
    if (!(await confirm({ title: 'Delete city?', message: `Delete "${row.name}"?`, danger: true, confirmText: 'Delete' }))) return;
    await api.delete(`/admin/cities/${row.id}`); toast.success('Deleted'); load();
  };
  const patch = async (row, field) => { await api.patch(`/admin/cities/${row.id}`, { [field]: !row[field] }); load(); };

  if (error) return <ErrorState message={error} onRetry={load} />;
  return (
    <>
      <div className="toolbar"><h2 style={{ margin: 0 }}>Cities / Locations</h2><button className="btn btn-primary" onClick={() => setEditing(BLANK)}>+ Add City</button></div>
      {!rows ? <Loading /> : rows.length === 0 ? <Empty message="No cities yet." /> : (
        <div className="panel"><table className="data-table">
          <thead><tr><th>Name</th><th>Region</th><th>Country</th><th>Items</th><th>Featured</th><th>Status</th><th></th></tr></thead>
          <tbody>{rows.map((c) => (
            <tr key={c.id}>
              <td><strong>{c.name}</strong>{c.state_province && <div className="muted small">{c.state_province}</div>}</td>
              <td className="muted">{c.region_name || c.region || '—'}</td>
              <td className="muted">{c.country || '—'}</td>
              <td className="muted small">{c.product_count}p · {c.service_count}s</td>
              <td><button className={`badge toggle-pill ${c.featured ? 'badge-accent' : 'badge-off'}`} onClick={() => patch(c, 'featured')}>{c.featured ? '★' : 'No'}</button></td>
              <td><button className={`badge toggle-pill ${c.active ? 'badge-on' : 'badge-off'}`} onClick={() => patch(c, 'active')}>{c.active ? 'Active' : 'Hidden'}</button></td>
              <td><div className="row-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(c)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>Delete</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {editing && <CityForm initial={editing} regions={regions} onSave={save} onClose={() => setEditing(null)} />}
    </>
  );
}

function CityForm({ initial, regions, onSave, onClose }) {
  const [f, setF] = useState({ ...BLANK, ...initial });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Modal wide title={f.id ? 'Edit City' : 'Add City'} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => onSave(f)}>Save</button></>}>
      <div className="field-row">
        <div className="field"><label>City name *</label><input value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="field"><label>Region</label>
          <select value={f.region_id || ''} onChange={(e) => { const r = regions.find((x) => String(x.id) === e.target.value); set('region_id', e.target.value); set('region', r?.name || ''); }}>
            <option value="">— none —</option>{regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field"><label>Country</label><input value={f.country || ''} onChange={(e) => set('country', e.target.value)} /></div>
        <div className="field"><label>State / Province</label><input value={f.state_province || ''} onChange={(e) => set('state_province', e.target.value)} /></div>
      </div>
      <div className="field"><label>Full address</label><input value={f.address || ''} onChange={(e) => set('address', e.target.value)} /></div>
      <div className="field-row">
        <div className="field"><label>Postal code</label><input value={f.postal_code || ''} onChange={(e) => set('postal_code', e.target.value)} /></div>
        <div className="field"><label>Google Maps link</label><input value={f.google_maps_link || ''} onChange={(e) => set('google_maps_link', e.target.value)} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Latitude</label><input type="number" step="any" value={f.latitude ?? ''} onChange={(e) => set('latitude', e.target.value)} /></div>
        <div className="field"><label>Longitude</label><input type="number" step="any" value={f.longitude ?? ''} onChange={(e) => set('longitude', e.target.value)} /></div>
      </div>
      <div className="field"><label>Description</label><textarea rows="2" value={f.description || ''} onChange={(e) => set('description', e.target.value)} /></div>
      <div className="field"><label>Image</label><ImageField value={f.image} onChange={(v) => set('image', v)} /></div>
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <label className="checkbox"><input type="checkbox" checked={!!f.featured} onChange={(e) => set('featured', e.target.checked)} /> Featured</label>
        <label className="checkbox"><input type="checkbox" checked={!!f.active} onChange={(e) => set('active', e.target.checked)} /> Active</label>
      </div>
    </Modal>
  );
}
