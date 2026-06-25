import { useRef, useState } from 'react';
import api, { errMsg } from '../api/client';
import { useToast } from '../context/ToastContext';

async function uploadFiles(fileList) {
  const fd = new FormData();
  Array.from(fileList).forEach((f) => fd.append('files', f));
  const { data } = await api.post('/admin/media', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data.files.map((f) => f.path);
}

// Single-image picker (logo, favicon, category/city/section image).
export function ImageField({ value, onChange }) {
  const ref = useRef();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const pick = async (e) => {
    if (!e.target.files?.length) return;
    setBusy(true);
    try { const [path] = await uploadFiles(e.target.files); onChange(path); }
    catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div>
      {value ? (
        <div className="img-thumb" style={{ width: 120, height: 120 }}>
          <img src={value} alt="" />
          <button type="button" className="x" onClick={() => onChange('')}>×</button>
        </div>
      ) : (
        <div className="uploader" onClick={() => ref.current.click()}>
          {busy ? 'Uploading…' : '📁 Click to upload image'}
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
    </div>
  );
}

// Multiple-image gallery with drag-to-reorder + "set featured" star.
// value = array of paths. featured = single path (optional).
export function ImageGallery({ value = [], onChange, featured, onFeatured }) {
  const ref = useRef();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);

  const add = async (e) => {
    if (!e.target.files?.length) return;
    setBusy(true);
    try {
      const paths = await uploadFiles(e.target.files);
      const next = [...value, ...paths];
      onChange(next);
      if (onFeatured && !featured && next.length) onFeatured(next[0]);
    } catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); }
  };

  const remove = (path) => {
    const next = value.filter((p) => p !== path);
    onChange(next);
    if (featured === path && onFeatured) onFeatured(next[0] || '');
  };

  const onDrop = (idx) => {
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...value];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    onChange(next);
    setDragIdx(null);
  };

  return (
    <div>
      <div className="uploader" onClick={() => ref.current.click()}>
        {busy ? 'Uploading…' : '📁 Click to upload images (drag thumbnails to reorder)'}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={add} />
      {value.length > 0 && (
        <div className="img-thumbs">
          {value.map((p, i) => (
            <div key={p} className={`img-thumb${dragIdx === i ? ' dragging' : ''}`}
              draggable onDragStart={() => setDragIdx(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(i)}>
              <img src={p} alt="" />
              <button type="button" className="x" onClick={() => remove(p)}>×</button>
              {onFeatured && (
                <button type="button" className={`star${featured === p ? ' on' : ''}`} title="Featured image" onClick={() => onFeatured(p)}>★</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
