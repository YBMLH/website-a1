import { Link } from 'react-router-dom';

// Renders a configurable homepage section by type. `config` holds type data.
export default function SectionRenderer({ section: s }) {
  const cfg = s.config || {};

  switch (s.type) {
    case 'hero':
      return (
        <section className="hero" style={s.image ? { backgroundImage: `linear-gradient(rgba(15,23,42,.55),rgba(15,23,42,.55)), url(${s.image})` } : undefined}>
          <div className="container hero-inner">
            {s.title && <h1>{s.title}</h1>}
            {s.subtitle && <p className="hero-subtitle">{s.subtitle}</p>}
            {s.content && <p className="hero-text">{s.content}</p>}
            <div className="hero-actions">
              {cfg.button_text && <Link to={cfg.button_link || '#'} className="btn btn-accent btn-lg">{cfg.button_text}</Link>}
              {cfg.button2_text && <Link to={cfg.button2_link || '#'} className="btn btn-outline btn-lg" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.6)' }}>{cfg.button2_text}</Link>}
            </div>
          </div>
        </section>
      );

    case 'text':
      return (
        <section className="section">
          <div className="container narrow">
            {s.title && <h2 className="section-title">{s.title}</h2>}
            {s.subtitle && <p className="section-subtitle">{s.subtitle}</p>}
            {s.content && <div style={{ whiteSpace: 'pre-line' }}>{s.content}</div>}
          </div>
        </section>
      );

    case 'features':
      return (
        <section className="section">
          <div className="container">
            {s.title && <h2 className="section-title center">{s.title}</h2>}
            {s.subtitle && <p className="section-subtitle center">{s.subtitle}</p>}
            <div className="feature-grid">
              {(cfg.items || []).map((f, i) => (
                <div className="feature-item" key={i}>
                  {f.icon && <div className="feature-icon">{f.icon}</div>}
                  <h3>{f.title}</h3>
                  <p className="muted">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'gallery':
      return (
        <section className="section">
          <div className="container">
            {s.title && <h2 className="section-title center">{s.title}</h2>}
            <div className="gallery-grid">
              {(cfg.images || []).map((img, i) => {
                const src = typeof img === 'string' ? img : img.src;
                return <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="gallery-cell"><img src={src} alt="" loading="lazy" /></a>;
              })}
            </div>
          </div>
        </section>
      );

    case 'testimonials':
      return (
        <section className="section alt">
          <div className="container">
            {s.title && <h2 className="section-title center">{s.title}</h2>}
            <div className="testimonial-grid">
              {(cfg.items || []).map((t, i) => (
                <figure className="testimonial" key={i} style={{ margin: 0 }}>
                  <blockquote>“{t.text}”</blockquote>
                  <figcaption><strong>{t.name}</strong>{t.role && <span className="muted"> — {t.role}</span>}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      );

    case 'faq':
      return (
        <section className="section">
          <div className="container narrow">
            {s.title && <h2 className="section-title center">{s.title}</h2>}
            <div className="faq-list">
              {(cfg.items || []).map((f, i) => (
                <details className="faq-item" key={i}>
                  <summary>{f.q}</summary>
                  <div className="muted" style={{ paddingBottom: '.8rem' }}>{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      );

    case 'stats':
      return (
        <section className="section stats-section">
          <div className="container">
            {s.title && <h2 className="section-title center" style={{ color: '#fff' }}>{s.title}</h2>}
            <div className="stats-grid">
              {(cfg.items || []).map((st, i) => (
                <div key={i}><div className="stat-value">{st.value}</div><div className="stat-label">{st.label}</div></div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'cta':
      return (
        <section className="section cta-section">
          <div className="container cta-inner">
            <div>
              {s.title && <h2>{s.title}</h2>}
              {s.subtitle && <p style={{ opacity: .95, margin: 0 }}>{s.subtitle}</p>}
            </div>
            {cfg.button_text && <Link to={cfg.button_link || '#'} className="btn btn-accent btn-lg">{cfg.button_text}</Link>}
          </div>
        </section>
      );

    case 'html':
      return (
        <section className="section">
          <div className="container" dangerouslySetInnerHTML={{ __html: s.content || '' }} />
        </section>
      );

    default:
      return null;
  }
}
