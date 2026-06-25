import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { errMsg } from '../../api/client';
import '../../styles/admin.css';

export default function Login() {
  const { login, user, ready } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', pin: '' });
  const [pinRequired, setPinRequired] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (ready && user) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await login(form);
      navigate('/admin');
    } catch (err) {
      if (err.response?.data?.pin_required) { setPinRequired(true); setError('Enter your admin PIN'); }
      else setError(errMsg(err, 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1>{settings.site_name || 'Admin'}</h1>
        <p className="muted center" style={{ marginTop: 0 }}>Sign in to your dashboard</p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="field"><label>Username</label>
          <input autoFocus value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div className="field"><label>Password</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        {pinRequired && (
          <div className="field"><label>PIN</label>
            <input type="password" inputMode="numeric" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} />
          </div>
        )}
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="muted small center" style={{ marginTop: '1rem' }}>Default: admin / admin123</p>
      </form>
    </div>
  );
}
