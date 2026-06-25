import { useState, useEffect } from 'react';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../components/ConfirmDialog';
import Modal from '../../components/Modal';
import { ImageField, ImageGallery } from '../../components/ImageUploader';
import { Loading, ErrorState, Empty } from '../../components/DataState';

const TYPES = ['hero', 'text', 'features', 'gallery', 'testimonials', 'faq', 'stats', 'cta', 'html'];
const BLANK = { type: 'text', title: '', subtitle: '', content: '', image: '', config: {}, active: true };

export default function AdminSections() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);

  const load = () => { setError(null); api.get('/admin/sections').then((r) => setRows(r.data)).catch((e) => setError(errMsg(e))); };
  useEffect(load, []);

  const save = async (f) => {
    try { if (f.id) await api.put(`/admin/sections/${f.id}`, f); else await api.post('/admin/sections', f); toast.success('Saved'); setEditing(null); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async (row) => {
    if (!(await confirm({ title: 'Delete section?', message: `Delete the "${row.title || row.type}" section?`, danger: true, confirmText: 'Delete' }))) return;
    await api.delete(`/admin/sections/${row.id}`); toast.success('Deleted'); load();
  };
  const toggle = async (row) => { await api.put(`/admin/sections/${row.id}`, { active: !row.active }); load(); };

  const onDrop = async (idx) => {
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...rows];
    const [m] = next.splice(dragIdx, 1); next.splice(idx, 0, m);
    setRows(next); setDragIdx(null);
    await api.post('/admin/sections/reorder', { order: next.map((s) => s.id) });
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  return (
    <>
      <div className="toolbar">
        <h2 style={{ margin: 0 }}>Homepage Sections</h2>
        <button className="btn btn-primary" onClick={() => setEditing(BLANK)}>+ Add Section</button>
      </div>
      <p className="muted small">Drag rows to reorder how they appear on the homepage.</p>
      {!rows ? <Loading /> : rows.length === 0 ? <Empty message="No sections yet." /> : (
        <div className="panel">
          {rows.map((s, i) => (
            <div key={s.id} className={`section-row${dragIdx === i ? ' dragging' : ''}`}
              draggable onDragStart={() => setDragIdx(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(i)}>
              <span className="grip">⠿</span>
              <span className="type-pill">{s.type}</span>
              <div style={{ flex: 1 }}><strong>{s.title || <span className="muted">(untitled)</span>}</strong>{s.subtitle && <div className="muted small">{s.subtitle}</div>}</div>
              <button className={`badge toggle-pill ${s.active ? 'badge-on' : 'badge-off'}`} onClick={() => toggle(s)}>{s.active ? 'Visible' : 'Hidden'}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...s, config: s.config || {} })}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(s)}>Delete</button>
            </div>
          ))}
        </div>
      )}
      {editing && <SectionForm initial={editing} onSave={save} onClose={() => setEditing(null)} />}
    </>
  );
}

function SectionForm({ initial, onSave, onClose }) {
  const [f, setF] = useState({ ...BLANK, ...initial, config: initial.config || {} });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setCfg = (k, v) => setF((s) => ({ ...s, config: { ...s.config, [k]: v } }));
  const items = f.config.items || [];
  const setItems = (v) => setCfg('items', v);
  const updItem = (i, key, v) => { const n = [...items]; n[i] = { ...n[i], [key]: v }; setItems(n); };
  const addItem = (tpl) => setItems([...items, tpl]);
  const delItem = (i) => setItems(items.filter((_, x) => x !== i));

  const hasTitle = !['gallery'].includes(f.type);

  return (
    <Modal wide title={f.id ? 'Edit Section' : 'Add Section'} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => onSave(f)}>Save</button></>}>
      <div className="field"><label>Type</label>
        <select value={f.type} onChange={(e) => set('type', e.target.value)} disabled={!!f.id}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {hasTitle && <div className="field"><label>Title</label><input value={f.title || ''} onChange={(e) => set('title', e.target.value)} /></div>}
      {['hero', 'text', 'cta'].includes(f.type) && <div className="field"><label>Subtitle</label><input value={f.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} /></div>}
      {['hero', 'text'].includes(f.type) && <div className="field"><label>Content</label><textarea rows="3" value={f.content || ''} onChange={(e) => set('content', e.target.value)} /></div>}
      {f.type === 'html' && <div className="field"><label>HTML content</label><textarea rows="6" value={f.content || ''} onChange={(e) => set('content', e.target.value)} placeholder="<div>…</div>" /></div>}

      {f.type === 'hero' && (
        <>
          <div className="field"><label>Background image</label><ImageField value={f.image} onChange={(v) => set('image', v)} /></div>
          <div className="field-row">
            <div className="field"><label>Button text</label><input value={f.config.button_text || ''} onChange={(e) => setCfg('button_text', e.target.value)} /></div>
            <div className="field"><label>Button link</label><input value={f.config.button_link || ''} onChange={(e) => setCfg('button_link', e.target.value)} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Button 2 text</label><input value={f.config.button2_text || ''} onChange={(e) => setCfg('button2_text', e.target.value)} /></div>
            <div className="field"><label>Button 2 link</label><input value={f.config.button2_link || ''} onChange={(e) => setCfg('button2_link', e.target.value)} /></div>
          </div>
        </>
      )}
      {f.type === 'cta' && (
        <div className="field-row">
          <div className="field"><label>Button text</label><input value={f.config.button_text || ''} onChange={(e) => setCfg('button_text', e.target.value)} /></div>
          <div className="field"><label>Button link</label><input value={f.config.button_link || ''} onChange={(e) => setCfg('button_link', e.target.value)} /></div>
        </div>
      )}

      {f.type === 'gallery' && (
        <div className="field"><label>Gallery images</label>
          <ImageGallery value={(f.config.images || []).map((x) => (typeof x === 'string' ? x : x.src))} onChange={(v) => setCfg('images', v)} />
        </div>
      )}

      {['features', 'testimonials', 'faq', 'stats'].includes(f.type) && (
        <div className="field"><label>Items</label>
          {items.map((it, i) => (
            <div key={i} className="card" style={{ padding: '.8rem', marginBottom: '.6rem', boxShadow: 'none' }}>
              {f.type === 'features' && (<>
                <input placeholder="Icon (emoji)" value={it.icon || ''} onChange={(e) => updItem(i, 'icon', e.target.value)} style={{ marginBottom: '.4rem' }} />
                <input placeholder="Title" value={it.title || ''} onChange={(e) => updItem(i, 'title', e.target.value)} style={{ marginBottom: '.4rem' }} />
                <input placeholder="Text" value={it.text || ''} onChange={(e) => updItem(i, 'text', e.target.value)} />
              </>)}
              {f.type === 'testimonials' && (<>
                <input placeholder="Name" value={it.name || ''} onChange={(e) => updItem(i, 'name', e.target.value)} style={{ marginBottom: '.4rem' }} />
                <input placeholder="Role" value={it.role || ''} onChange={(e) => updItem(i, 'role', e.target.value)} style={{ marginBottom: '.4rem' }} />
                <textarea placeholder="Quote" rows="2" value={it.text || ''} onChange={(e) => updItem(i, 'text', e.target.value)} />
              </>)}
              {f.type === 'faq' && (<>
                <input placeholder="Question" value={it.q || ''} onChange={(e) => updItem(i, 'q', e.target.value)} style={{ marginBottom: '.4rem' }} />
                <textarea placeholder="Answer" rows="2" value={it.a || ''} onChange={(e) => updItem(i, 'a', e.target.value)} />
              </>)}
              {f.type === 'stats' && (<div style={{ display: 'flex', gap: '.5rem' }}>
                <input placeholder="Value" value={it.value || ''} onChange={(e) => updItem(i, 'value', e.target.value)} />
                <input placeholder="Label" value={it.label || ''} onChange={(e) => updItem(i, 'label', e.target.value)} />
              </div>)}
              <button className="btn btn-ghost btn-sm" style={{ marginTop: '.4rem' }} onClick={() => delItem(i)}>Remove</button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={() => addItem(
            f.type === 'features' ? { icon: '', title: '', text: '' }
              : f.type === 'testimonials' ? { name: '', role: '', text: '' }
              : f.type === 'faq' ? { q: '', a: '' } : { value: '', label: '' }
          )}>+ Add item</button>
        </div>
      )}

      <label className="checkbox"><input type="checkbox" checked={!!f.active} onChange={(e) => set('active', e.target.checked)} /> Visible on homepage</label>
    </Modal>
  );
}
