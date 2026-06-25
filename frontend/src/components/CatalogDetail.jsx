import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import { useSettings } from '../context/SettingsContext';
import { useInquiry } from './InquiryProvider';
import { Loading, ErrorState } from './DataState';
import CatalogCard from './CatalogCard';
import { formatPrice } from '../utils/format';

export default function CatalogDetail({ kind }) {
  const { slug } = useParams();
  const { settings: s } = useSettings();
  const { openInquiry } = useInquiry();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImg, setActiveImg] = useState(null);

  useEffect(() => {
    setLoading(true); setError(null); setActiveImg(null);
    api.get(`/public/${kind}/${slug}`)
      .then((r) => { setItem(r.data); setActiveImg(r.data.image || (r.data.images || r.data.gallery || [])[0] || null); })
      .catch((e) => setError(e.response?.status === 404 ? 'Not found' : errMsg(e)))
      .finally(() => setLoading(false));
  }, [kind, slug]);

  if (loading) return <Loading />;
  if (error) return <div className="container section"><ErrorState message={error} /></div>;

  const gallery = item.images || item.gallery || [];
  const thumbs = [item.image, ...gallery].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
  const price = item.sale_price ?? item.price;
  const backTo = kind === 'services' ? '/services' : '/products';

  return (
    <section className="section"><div className="container">
      <nav className="breadcrumb">
        <Link to="/">Home</Link> / <Link to={backTo}>{kind === 'services' ? 'Services' : 'Products'}</Link> / <span>{item.title}</span>
      </nav>

      <div className="detail-grid">
        <div>
          {activeImg
            ? <img src={activeImg} alt={item.title} className="detail-main-img" />
            : <div className="card-placeholder large">{item.title.charAt(0).toUpperCase()}</div>}
          {thumbs.length > 1 && (
            <div className="thumb-row">
              {thumbs.map((t) => (
                <img key={t} src={t} className={t === activeImg ? 'active' : ''} onClick={() => setActiveImg(t)} alt="" />
              ))}
            </div>
          )}
        </div>

        <div>
          {item.category_name && <span className="card-tag">{item.category_name}</span>}
          <h1>{item.title}</h1>
          {price != null && price !== '' && (
            <div className="detail-price">
              {item.sale_price != null && item.sale_price !== '' && <span className="price-old">{formatPrice(item.price, item.currency)}</span>}
              {formatPrice(price, item.currency)}
              {item.price_unit && <span className="price-unit"> {item.price_unit}</span>}
            </div>
          )}
          {item.short_description && <p className="lead">{item.short_description}</p>}
          {item.sku && <p className="muted small">SKU: {item.sku}</p>}

          {s.enable_cities && item.cities?.length > 0 && (
            <div className="location-badges">
              <span className="muted small">Available in:</span>
              {item.cities.map((c) => <Link key={c.id} to={`/cities/${c.id}`} className="badge badge-city">📍 {c.name}</Link>)}
            </div>
          )}

          {item.description && <div style={{ whiteSpace: 'pre-line', marginTop: '1rem' }}>{item.description}</div>}

          {item.specifications?.length > 0 && (
            <table className="spec-table"><tbody>
              {item.specifications.map((sp, i) => (
                <tr key={i}><td>{sp.label}</td><td>{sp.value}</td></tr>
              ))}
            </tbody></table>
          )}

          <div className="detail-actions">
            {s.enable_whatsapp && <button className="btn btn-whatsapp btn-lg" onClick={() => openInquiry(item, kind)}>💬 Inquire on WhatsApp</button>}
            <Link to="/contact" className="btn btn-outline btn-lg">Contact</Link>
          </div>
        </div>
      </div>

      {item.related?.length > 0 && (
        <>
          <h2 className="section-title" style={{ marginTop: '3rem' }}>Related</h2>
          <div className="card-grid">
            {item.related.map((r) => <CatalogCard key={r.id} item={r} kind={kind} onInquire={openInquiry} />)}
          </div>
        </>
      )}
    </div></section>
  );
}
