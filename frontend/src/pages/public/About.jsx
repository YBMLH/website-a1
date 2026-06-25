import { useSettings } from '../../context/SettingsContext';

export default function About() {
  const { settings: s } = useSettings();
  return (
    <>
      <section className="page-header"><div className="container"><h1>About {s.site_name}</h1></div></section>
      <section className="section"><div className="container narrow">
        {s.business_about && <div style={{ whiteSpace: 'pre-line', fontSize: '1.1rem' }}>{s.business_about}</div>}

        <div className="card-grid" style={{ marginTop: '2rem', gridTemplateColumns: '1fr 1fr' }}>
          {s.business_mission && (
            <div className="feature-item"><div className="feature-icon">🎯</div><h3>Mission</h3><p className="muted">{s.business_mission}</p></div>
          )}
          {s.business_vision && (
            <div className="feature-item"><div className="feature-icon">🔭</div><h3>Vision</h3><p className="muted">{s.business_vision}</p></div>
          )}
        </div>

        <ul className="info-list" style={{ marginTop: '2rem' }}>
          {s.business_name && <li><strong>Business:</strong> {s.business_name}</li>}
          {s.business_hours && <li><strong>Hours:</strong> {s.business_hours}</li>}
          {s.contact_email && <li><strong>Email:</strong> <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a></li>}
          {s.contact_phone && <li><strong>Phone:</strong> {s.contact_phone}</li>}
          {s.contact_address && <li><strong>Address:</strong> {s.contact_address}</li>}
        </ul>
      </div></section>
    </>
  );
}
