import { useParams, Link } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { useSettings } from '../../context/SettingsContext';
import { useInquiry } from '../../components/InquiryProvider';
import CatalogCard from '../../components/CatalogCard';
import { Loading, ErrorState } from '../../components/DataState';

export default function CityDetail() {
  const { id } = useParams();
  const { settings: s } = useSettings();
  const { openInquiry } = useInquiry();
  const { data: city, loading, error } = useFetch(`/public/cities/${id}`, [id]);

  if (loading) return <Loading />;
  if (error) return <div className="container section"><ErrorState message={error} /></div>;

  return (
    <>
      <section className="page-header"><div className="container">
        <nav className="breadcrumb"><Link to="/">Home</Link> / <Link to="/cities">Locations</Link> / <span>{city.name}</span></nav>
        <h1>{city.name}</h1>
        <p className="muted">{[city.region_name, city.state_province, city.country].filter(Boolean).join(' · ')}</p>
      </div></section>

      <section className="section"><div className="container city-detail-grid">
        <aside className="city-info">
          {city.image && <img src={city.image} alt={city.name} style={{ borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }} />}
          {city.description && <p>{city.description}</p>}
          <ul className="info-list">
            {city.address && <li><strong>Address:</strong> {city.address}</li>}
            {city.postal_code && <li><strong>Postal:</strong> {city.postal_code}</li>}
            {city.latitude != null && city.longitude != null && <li><strong>Coords:</strong> {city.latitude}, {city.longitude}</li>}
          </ul>
          {s.enable_maps && city.google_maps_link && (
            <a href={city.google_maps_link} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">Open in Google Maps ↗</a>
          )}
          {s.enable_maps && city.latitude != null && city.longitude != null && (
            <iframe className="map-embed" loading="lazy" title="map"
              src={`https://maps.google.com/maps?q=${city.latitude},${city.longitude}&z=12&output=embed`} />
          )}
        </aside>

        <div>
          {s.enable_products && city.products?.length > 0 && (
            <>
              <h2 className="section-title">Products in {city.name}</h2>
              <div className="card-grid">{city.products.map((p) => <CatalogCard key={p.id} item={p} kind="products" onInquire={openInquiry} />)}</div>
            </>
          )}
          {s.enable_services && city.services?.length > 0 && (
            <>
              <h2 className="section-title" style={{ marginTop: '2rem' }}>Services in {city.name}</h2>
              <div className="card-grid">{city.services.map((p) => <CatalogCard key={p.id} item={p} kind="services" onInquire={openInquiry} />)}</div>
            </>
          )}
          {!city.products?.length && !city.services?.length && (
            <div className="empty">No products or services listed for this location yet.</div>
          )}
        </div>
      </div></section>
    </>
  );
}
