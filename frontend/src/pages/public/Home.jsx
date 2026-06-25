import { Link } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { useSettings } from '../../context/SettingsContext';
import { useInquiry } from '../../components/InquiryProvider';
import SectionRenderer from '../../components/SectionRenderer';
import CatalogCard from '../../components/CatalogCard';
import { Loading } from '../../components/DataState';

export default function Home() {
  const { settings: s } = useSettings();
  const { openInquiry } = useInquiry();
  const { data: sections, loading } = useFetch('/public/sections');
  const { data: featProducts } = useFetch('/public/products?featured=1');
  const { data: featServices } = useFetch('/public/services?featured=1');
  const { data: cities } = useFetch('/public/cities');

  if (loading) return <Loading />;
  const featuredCities = (cities || []).filter((c) => c.featured).slice(0, 8);

  return (
    <>
      {(sections || []).map((sec) => <SectionRenderer key={sec.id} section={sec} />)}

      {s.enable_products && featProducts?.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2 className="section-title">Featured Products</h2>
              <Link to="/products" className="link-more">View all →</Link>
            </div>
            <div className="card-grid">
              {featProducts.slice(0, 8).map((p) => <CatalogCard key={p.id} item={p} kind="products" onInquire={openInquiry} />)}
            </div>
          </div>
        </section>
      )}

      {s.enable_services && featServices?.length > 0 && (
        <section className="section alt">
          <div className="container">
            <div className="section-head">
              <h2 className="section-title">Featured Services</h2>
              <Link to="/services" className="link-more">View all →</Link>
            </div>
            <div className="card-grid">
              {featServices.slice(0, 8).map((p) => <CatalogCard key={p.id} item={p} kind="services" onInquire={openInquiry} />)}
            </div>
          </div>
        </section>
      )}

      {s.enable_cities && featuredCities.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2 className="section-title">Our Locations</h2>
              <Link to="/cities" className="link-more">View all →</Link>
            </div>
            <div className="city-grid">
              {featuredCities.map((c) => (
                <Link key={c.id} to={`/cities/${c.id}`} className="city-card">
                  {c.image ? <img src={c.image} alt={c.name} loading="lazy" /> : <div className="city-card-ph">📍</div>}
                  <div className="city-card-body">
                    <h3>{c.name}</h3>
                    <span className="muted small">{c.country}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
