import { useState, useEffect, useRef } from 'react';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../components/ConfirmDialog';
import { Loading, ErrorState, Empty } from '../../components/DataState';
import { formatDate } from '../../utils/format';

export default function AdminBackup() {
  const toast = useToast();
  const confirm = useConfirm();
  const ref = useRef();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => { setError(null); api.get('/admin/backup').then((r) => setRows(r.data)).catch((e) => setError(errMsg(e))); };
  useEffect(load, []);

  const create = async () => {
    setBusy(true);
    try { await api.post('/admin/backup'); toast.success('Backup created'); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  // Authenticated blob download.
  const download = async (filename) => {
    try {
      const res = await api.get(`/admin/backup/download/${filename}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const restore = async (filename) => {
    if (!(await confirm({ title: 'Restore backup?', message: 'This OVERWRITES all current data with the backup. Continue?', danger: true, confirmText: 'Restore' }))) return;
    try { await api.post(`/admin/backup/restore/${filename}`); toast.success('Restored. Reloading…'); setTimeout(() => window.location.reload(), 1000); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const remove = async (filename) => {
    if (!(await confirm({ title: 'Delete backup?', message: 'Delete this backup file?', danger: true, confirmText: 'Delete' }))) return;
    await api.delete(`/admin/backup/${filename}`); toast.success('Deleted'); load();
  };

  const importDb = async (e) => {
    if (!e.target.files?.length) return;
    if (!(await confirm({ title: 'Import database?', message: 'This OVERWRITES all current data with the uploaded file. Continue?', danger: true, confirmText: 'Import' }))) { ref.current.value = ''; return; }
    const fd = new FormData(); fd.append('file', e.target.files[0]);
    try { await api.post('/admin/backup/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); toast.success('Imported. Reloading…'); setTimeout(() => window.location.reload(), 1000); }
    catch (err) { toast.error(errMsg(err)); } finally { ref.current.value = ''; }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  return (
    <>
      <div className="toolbar">
        <h2 style={{ margin: 0 }}>Backup & Restore</h2>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button className="btn btn-ghost" onClick={() => ref.current.click()}>⬆ Import DB</button>
          <button className="btn btn-primary" disabled={busy} onClick={create}>{busy ? 'Working…' : '+ Create Backup'}</button>
          <input ref={ref} type="file" accept=".db,.sqlite" hidden onChange={importDb} />
        </div>
      </div>
      <p className="muted small">Backups are full snapshots of the SQLite database. Download one to keep it safe off-server, or restore/import to roll back.</p>

      {!rows ? <Loading /> : rows.length === 0 ? <Empty message="No backups yet. Create one to get started." /> : (
        <div className="panel"><table className="data-table">
          <thead><tr><th>Filename</th><th>Size</th><th>Created</th><th></th></tr></thead>
          <tbody>{rows.map((b) => (
            <tr key={b.filename}>
              <td><strong>{b.filename}</strong></td>
              <td className="muted small">{(b.size / 1024).toFixed(0)} KB</td>
              <td className="muted small">{formatDate(b.created_at)}</td>
              <td><div className="row-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => download(b.filename)}>Download</button>
                <button className="btn btn-ghost btn-sm" onClick={() => restore(b.filename)}>Restore</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(b.filename)}>Delete</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}
