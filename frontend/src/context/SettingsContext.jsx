import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const SettingsContext = createContext(null);
export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/public/settings');
      setSettings(data);
      applyTheme(data);
      applyMeta(data);
    } catch { /* ignore */ } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SettingsContext.Provider value={{ settings, loaded, reload: load }}>
      {children}
    </SettingsContext.Provider>
  );
}

// Apply brand colors as CSS variables (overridable per client, no code change).
export function applyTheme(s) {
  const root = document.documentElement;
  if (s.color_primary) root.style.setProperty('--brand-primary', s.color_primary);
  if (s.color_secondary) root.style.setProperty('--brand-secondary', s.color_secondary);
  if (s.color_accent) root.style.setProperty('--brand-accent', s.color_accent);
}

function applyMeta(s) {
  if (s.seo_title || s.site_name) document.title = s.seo_title || s.site_name;
  setMeta('description', s.seo_description);
  setMeta('keywords', s.seo_keywords);
  if (s.favicon) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = s.favicon;
  }
}
function setMeta(name, content) {
  if (content == null) return;
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) { tag = document.createElement('meta'); tag.name = name; document.head.appendChild(tag); }
  tag.content = content;
}
