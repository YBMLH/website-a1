import { useState } from 'react';
import api, { errMsg } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function AdminAccount() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pin, setPin] = useState({ current: '', next: '' });
  const [busy, setBusy] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) return toast.error('New passwords do not match');
    setBusy(true);
    try {
      await api.post('/auth/change-password', { current: pw.current, next: pw.next });
      toast.success('Password changed');
      setPw({ current: '', next: '', confirm: '' });
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const changePin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/auth/change-pin', { current: pin.current, next: pin.next });
      toast.success(pin.next ? 'PIN updated' : 'PIN cleared');
      setUser({ ...user, has_pin: data.has_pin });
      setPin({ current: '', next: '' });
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <>
      <h2>Account — {user?.username}</h2>
      <div className="dash-cols" style={{ marginTop: '1.2rem' }}>
        <form className="form-card" onSubmit={changePassword}>
          <h3 style={{ marginTop: 0 }}>Change Password</h3>
          <div className="field"><label>Current password</label><input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></div>
          <div className="field"><label>New password</label><input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /></div>
          <div className="field"><label>Confirm new password</label><input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required /></div>
          <button className="btn btn-primary" disabled={busy}>Update password</button>
        </form>

        <form className="form-card" onSubmit={changePin}>
          <h3 style={{ marginTop: 0 }}>Admin PIN {user?.has_pin && <span className="badge badge-on">Enabled</span>}</h3>
          <p className="muted small">Optional second factor required at login. Leave the new PIN blank and submit to remove it.</p>
          {user?.has_pin && <div className="field"><label>Current PIN</label><input type="password" inputMode="numeric" value={pin.current} onChange={(e) => setPin({ ...pin, current: e.target.value })} /></div>}
          <div className="field"><label>New PIN (4–8 digits)</label><input type="password" inputMode="numeric" value={pin.next} onChange={(e) => setPin({ ...pin, next: e.target.value })} /></div>
          <button className="btn btn-primary" disabled={busy}>{pin.next ? 'Set PIN' : 'Remove PIN'}</button>
        </form>
      </div>
    </>
  );
}
