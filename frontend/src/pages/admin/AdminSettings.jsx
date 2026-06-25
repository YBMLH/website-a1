import { useState, useEffect } from 'react';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { ImageField } from '../../components/ImageUploader';
import { Loading, ErrorState } from '../../components/DataState';

const GROUP_LABELS = {
  branding: 'Branding', colors: 'Colors', contact: 'Contact', social: 'Social Media',
  business: 'Business', seo: 'SEO', general: 'Features',
};
const GROUP_ORDER = ['branding', 'colors', 'contact', 'social', 'business', 'seo', 'general'];

export default function AdminSettings() {
  const toast = useToast();
  const { reload } = useSettings();
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState(null);
  const [values, setValues] = useState({});
  const [tab, setTab] = useState('branding');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setError(null);
    api.get('/admin/settings').then((r) => {
      setGroups(r.data);
      const v = {};
      Object.values(r.data).flat().forEach((s) => { v[s.key] = s.value; });
      setValues(v);
    }).catch((e) => setError(errMsg(e)));
  };
  useEffect(load, []);

  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    try { await api.put('/admin/settings', values); toast.success('Settings saved'); await reload(); }
    catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!groups) return <Loading />;

  const tabs = GROUP_ORDER.filter((g) => groups[g]);

  return (
    <>
      <div className="toolbar">
        <h2 style={{ margin: 0 }}>Settings</h2>
        <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>

      <div className="settings-tabs">
        {tabs.map((g) => <button key={g} className={tab === g ? 'active' : ''} onClick={() => setTab(g)}>{GROUP_LABELS[g] || g}</button>)}
      </div>

      <div className="settings-grid">
        {(groups[tab] || []).map((s) => (
          <div className="field" key={s.key}>
            <label>{s.label || s.key}</label>
            <SettingInput setting={s} value={values[s.key]} onChange={(v) => set(s.key, v)} />
          </div>
        ))}
      </div>
    </>
  );
}

function SettingInput({ setting, value, onChange }) {
  switch (setting.type) {
    case 'color':
      return (
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} style={{ width: 52, padding: 2 }} />
          <input value={value || ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case 'boolean':
      return (
        <label className="checkbox">
          <input type="checkbox" checked={value === '1' || value === 'true' || value === true} onChange={(e) => onChange(e.target.checked ? '1' : '0')} />
          {value === '1' || value === 'true' || value === true ? 'Enabled' : 'Disabled'}
        </label>
      );
    case 'image':
      return <ImageField value={value} onChange={onChange} />;
    case 'text':
      return <textarea rows="3" value={value || ''} onChange={(e) => onChange(e.target.value)} />;
    default:
      return <input value={value || ''} onChange={(e) => onChange(e.target.value)} />;
  }
}
