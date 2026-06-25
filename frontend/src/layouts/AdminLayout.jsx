import { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { ConfirmProvider } from '../components/ConfirmDialog';
import '../styles/admin.css';

const NAV = [
  { group: 'Overview', items: [['', 'Dashboard', '📊']] },
  { group: 'Catalog', items: [
    ['products', 'Products', '🛍️'], ['services', 'Services', '🧰'],
    ['categories', 'Categories', '🏷️'],
  ] },
  { group: 'Locations', items: [['cities', 'Cities', '📍'], ['regions', 'Regions', '🗺️']] },
  { group: 'Content', items: [['sections', 'Homepage Sections', '🧩'], ['media', 'Media Library', '🖼️']] },
  { group: 'Business', items: [['inquiries', 'Inquiries', '📨'], ['settings', 'Settings', '⚙️']] },
  { group: 'System', items: [['audit', 'Audit Log', '📜'], ['backup', 'Backup', '💾'], ['account', 'Account', '👤']] },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = async () => { await logout(); navigate('/admin/login'); };

  return (
    <ConfirmProvider>
      <div className="admin-shell">
        <aside className={`admin-sidebar${open ? ' open' : ''}`}>
          <div className="admin-brand">🧩 {settings.site_name || 'Admin'}</div>
          <nav className="admin-nav" onClick={() => setOpen(false)}>
            {NAV.map((g) => (
              <div key={g.group}>
                <div className="nav-group">{g.group}</div>
                {g.items.map(([path, label, icon]) => (
                  <NavLink key={path} to={`/admin/${path}`} end={path === ''}>
                    <span>{icon}</span> {label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
          <div style={{ padding: '.8rem 1.3rem', borderTop: '1px solid var(--border)' }}>
            <Link to="/" target="_blank" className="muted small">↗ View website</Link>
          </div>
        </aside>

        <div className="admin-main">
          <div className="admin-topbar">
            <button className="sidebar-toggle" onClick={() => setOpen((o) => !o)}>☰</button>
            <div style={{ flex: 1 }} />
            <div className="admin-user">
              <button className="theme-toggle" onClick={toggle} title="Toggle theme">{theme === 'dark' ? '☀️' : '🌙'}</button>
              <span className="muted small">👤 {user?.username}</span>
              <button className="btn btn-ghost btn-sm" onClick={doLogout}>Logout</button>
            </div>
          </div>
          <div className="admin-content"><Outlet /></div>
        </div>
      </div>
    </ConfirmProvider>
  );
}
