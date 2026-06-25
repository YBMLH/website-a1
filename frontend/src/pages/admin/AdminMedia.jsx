import { useState, useEffect, useRef } from 'react';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../components/ConfirmDialog';
import { Loading, ErrorState, Empty } from '../../components/DataState';

export default function AdminMedia() {
  const toast = useToast();
  const confirm = useConfirm();
  const ref = useRef();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => { setError(null); api.get('/admin/media').then((r) => setItems(r.data)).catch((e) => setError(errMsg(e))); };
  useEffect(load, []);

  const upload = async (e) => {
    if (!e.target.files?.length) return;
    setBusy(true);
    const fd = new FormData();
    Array.from(e.target.files).forEach((f) => fd.append('files', f));
    try { await api.post('/admin/media', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); toast.success('Uploaded'); load(); }
    catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); ref.current.value = ''; }
  };
  const remove = async (it) => {
    if (!(await confirm({ title: 'Delete file?', message: 'Delete this media file? Items using it will lose the image.', danger: true, confirmText: 'Delete' }))) return;
    await api.delete(`/admin/media/${it.filename}`); toast.success('Deleted'); load();
  };
  const copy = (path) => { navigator.clipboard?.writeText(window.location.origin + path); toast.info('Path copied'); };

  if (error) return <ErrorState message={error} onRetry={load} />;
  return (
    <>
      <div className="toolbar">
        <h2 style={{ margin: 0 }}>Media Library</h2>
        <button className="btn btn-primary" disabled={busy} onClick={() => ref.current.click()}>{busy ? 'Uploading…' : '+ Upload'}</button>
        <input ref={ref} type="file" accept="image/*" multiple hidden onChange={upload} />
      </div>
      {!items ? <Loading /> : items.length === 0 ? <Empty message="No media uploaded yet." /> : (
        <div className="media-grid">
          {items.map((it) => (
            <div key={it.filename} className="media-item">
              <img src={it.path} alt={it.filename} onClick={() => copy(it.path)} title="Click to copy URL" style={{ cursor: 'pointer' }} />
              <div className="meta">
                <span className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(it.size / 1024).toFixed(0)} KB</span>
                <button className="icon-btn" style={{ fontSize: '1rem' }} onClick={() => remove(it)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
