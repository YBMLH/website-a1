import { useState } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { InquiryProvider, useInquiry } from '../components/InquiryProvider';
import '../styles/public.css';

function Header() {
  const { settings: s } = useSettings();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand" onClick={close}>
          {s.logo ? <img src={s.logo} alt={s.site_name} /> : <span>{s.site_name || 'Business Platform'}</span>}
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <button className="theme-toggle" onClick={toggle} title="Toggle theme" aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="nav-toggle" onClick={() => setOpen((o) => !o)} aria-label="Menu">☰</button>
          <nav className={`site-nav${open ? ' open' : ''}`}>
            <NavLink to="/" end onClick={close}>Home</NavLink>
            {s.enable_products && <NavLink to="/products" onClick={close}>Products</NavLink>}
            {s.enable_services && <NavLink to="/services" onClick={close}>Services</NavLink>}
            {s.enable_cities && <NavLink to="/cities" onClick={close}>Locations</NavLink>}
            <NavLink to="/about" onClick={close}>About</NavLink>
            <NavLink to="/contact" className="btn btn-primary btn-sm" style={{ color: '#fff' }} onClick={close}>Contact</NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { settings: s } = useSettings();
  const socials = [
    ['social_facebook', 'Facebook'], ['social_instagram', 'Instagram'], ['social_twitter', 'Twitter/X'],
    ['social_linkedin', 'LinkedIn'], ['social_youtube', 'YouTube'], ['social_tiktok', 'TikTok'],
  ];
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h4>{s.site_name || 'Business Platform'}</h4>
          <p style={{ opacity: .85 }}>{s.tagline}</p>
          {s.business_about && <p className="small" style={{ opacity: .7 }}>{s.business_about}</p>}
        </div>
        <div>
          <h4>Contact</h4>
          <ul className="info-list">
            {s.contact_email && <li>✉ <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a></li>}
            {s.contact_phone && <li>☎ <a href={`tel:${s.contact_phone}`}>{s.contact_phone}</a></li>}
            {s.contact_address && <li>📍 {s.contact_address}</li>}
            {s.business_hours && <li>🕒 {s.business_hours}</li>}
          </ul>
        </div>
        <div>
          <h4>Follow</h4>
          <div className="social-row">
            {socials.map(([k, label]) => s[k] && (
              <a key={k} href={s[k]} target="_blank" rel="noopener noreferrer" className="social-link">{label}</a>
            ))}
          </div>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>{s.footer_text}</span>
        <Link to="/admin">Admin</Link>
      </div>
    </footer>
  );
}

function WhatsAppFab() {
  const { settings: s } = useSettings();
  const { openInquiry } = useInquiry();
  if (!s.enable_whatsapp || !(s.contact_whatsapp || s.contact_phone)) return null;
  return (
    <button className="fab-whatsapp" title="Chat on WhatsApp" onClick={() => openInquiry(null, 'contact')}>
      <span>💬</span>
    </button>
  );
}

export default function PublicLayout() {
  return (
    <InquiryProvider>
      <Header />
      <main><Outlet /></main>
      <WhatsAppFab />
      <Footer />
    </InquiryProvider>
  );
}
