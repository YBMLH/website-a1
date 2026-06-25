import { useState, useEffect, useMemo } from 'react';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../components/ConfirmDialog';
import Modal from '../../components/Modal';
import { ImageGallery } from '../../components/ImageUploader';
import { Loading, ErrorState, Empty } from '../../components/DataState';
import { formatPrice } from '../../utils/format';

const BLANK = {
  title: '', short_description: '', description: '', price: '', sale_price: '', currency: 'USD',
  sku: '', category_id: '', city_id: '', image: '', images: [], cities: [], specifications: [],
  featured: false, active: true, sort_order: 0,
};

export default function AdminProducts() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [cats, setCats] = useState([]);
  const [cities, setCities] = useState([]);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');

  const load = () => {
    setError(null);
    api.get('/admin/products').then((r) => setRows(r.data)).catch((e) => setError(errMsg(e)));
  };
  useEffect(() => {
    load();
    api.get('/admin/categories').then((r) => setCats(r.data)).catch(() => {});
    api.get('/admin/cities').then((r) => setCities(r.data)).catch(() => {});
  }, []);

  const filtered = useMemo(
    () => (rows || []).filter((r) => r.title.toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );

  const save = async (form) => {
    try {
      if (form.id) await api.put(`/admin/products/${form.id}`, form);
      else await api.post('/admin/products', form);
      toast.success('Product saved');
      setEditing(null); load();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async (row) => {
    if (!(await confirm({ title: 'Delete product?', message: `Delete "${row.title}"? This cannot be undone.`, danger: true, confirmText: 'Delete' }))) return;
    await api.delete(`/admin/products/${row.id}`); toast.success('Deleted'); load();
  };
  const duplicate = async (row) => {
    await api.post(`/admin/products/${row.id}/duplicate`); toast.success('Duplicated'); load();
  };
  const toggle = async (row, field) => {
    await api.put(`/admin/products/${row.id}`, { [field]: !row[field] }); load();
  };

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <div className="toolbar">
        <input className="search" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn btn-primary" onClick={() => setEditing(BLANK)}>+ Add Product</button>
      </div>

      {!rows ? <Loading /> : filtered.length === 0 ? <Empty message="No products yet." /> : (
        <div className="panel">
          <table className="data-table">
            <thead><tr><th></th><th>Title</th><th>Category</th><th>Price</th><th>Featured</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>{p.image ? <img src={p.image} className="table-thumb" alt="" /> : <div className="table-thumb" />}</td>
                  <td><strong>{p.title}</strong><div className="muted small">{p.cities?.length || 0} cities · {p.image_count || 0} images</div></td>
                  <td className="muted">{p.category_name || '—'}</td>
                  <td>{formatPrice(p.sale_price ?? p.price, p.currency) || '—'}</td>
                  <td><button className={`badge toggle-pill ${p.featured ? 'badge-accent' : 'badge-off'}`} onClick={() => toggle(p, 'featured')}>{p.featured ? '★ Yes' : 'No'}</button></td>
                  <td><button className={`badge toggle-pill ${p.active ? 'badge-on' : 'badge-off'}`} onClick={() => toggle(p, 'active')}>{p.active ? 'Active' : 'Hidden'}</button></td>
                  <td><div className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...p, images: p.images || [], specifications: p.specifications || [] })}>Edit</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => duplicate(p)}>Duplicate</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>Delete</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductForm initial={editing} cats={cats} cities={cities} onSave={save} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function ProductForm({ initial, cats, cities, onSave, onClose }) {
  const [f, setF] = useState({ ...BLANK, ...initial });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggleCity = (id) => set('cities', f.cities.includes(id) ? f.cities.filter((c) => c !== id) : [...f.cities, id]);
  const setSpec = (i, key, v) => { const s = [...f.specifications]; s[i] = { ...s[i], [key]: v }; set('specifications', s); };

  return (
    <Modal wide title={f.id ? 'Edit Product' : 'Add Product'} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => onSave(f)}>Save</button></>}>
      <div className="field"><label>Title *</label><input value={f.title} onChange={(e) => set('title', e.target.value)} /></div>
      <div className="field"><label>Short description</label><input value={f.short_description || ''} onChange={(e) => set('short_description', e.target.value)} /></div>
      <div className="field"><label>Description</label><textarea rows="4" value={f.description || ''} onChange={(e) => set('description', e.target.value)} /></div>

      <div className="field-row">
        <div className="field"><label>Price</label><input type="number" step="0.01" value={f.price ?? ''} onChange={(e) => set('price', e.target.value)} /></div>
        <div className="field"><label>Sale price</label><input type="number" step="0.01" value={f.sale_price ?? ''} onChange={(e) => set('sale_price', e.target.value)} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Currency</label><input value={f.currency || 'USD'} onChange={(e) => set('currency', e.target.value)} /></div>
        <div className="field"><label>SKU</label><input value={f.sku || ''} onChange={(e) => set('sku', e.target.value)} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Category</label>
          <select value={f.category_id || ''} onChange={(e) => set('category_id', e.target.value)}>
            <option value="">— none —</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Primary city</label>
          <select value={f.city_id || ''} onChange={(e) => set('city_id', e.target.value)}>
            <option value="">— none —</option>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="field"><label>Also available in cities</label>
        <div className="chip-select">
          {cities.map((c) => (
            <span key={c.id} className={`chip${f.cities.includes(c.id) ? ' on' : ''}`} onClick={() => toggleCity(c.id)}>{c.name}</span>
          ))}
        </div>
      </div>

      <div className="field"><label>Images (drag to reorder · ★ sets featured)</label>
        <ImageGallery value={f.images} onChange={(v) => set('images', v)} featured={f.image} onFeatured={(p) => set('image', p)} />
      </div>

      <div className="field"><label>Specifications</label>
        {f.specifications.map((sp, i) => (
          <div key={i} style={{ display: 'flex', gap: '.5rem', marginBottom: '.4rem' }}>
            <input placeholder="Label" value={sp.label || ''} onChange={(e) => setSpec(i, 'label', e.target.value)} />
            <input placeholder="Value" value={sp.value || ''} onChange={(e) => setSpec(i, 'value', e.target.value)} />
            <button className="btn btn-ghost btn-sm" onClick={() => set('specifications', f.specifications.filter((_, x) => x !== i))}>×</button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => set('specifications', [...f.specifications, { label: '', value: '' }])}>+ Add spec</button>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <label className="checkbox"><input type="checkbox" checked={!!f.featured} onChange={(e) => set('featured', e.target.checked)} /> Featured</label>
        <label className="checkbox"><input type="checkbox" checked={!!f.active} onChange={(e) => set('active', e.target.checked)} /> Active</label>
      </div>
    </Modal>
  );
}
