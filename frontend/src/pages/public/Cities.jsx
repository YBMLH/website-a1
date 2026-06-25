import { Link } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { Loading, ErrorState, Empty } from '../../components/DataState';

export default function Cities() {
  const { data: cities, loading, error, reload } = useFetch('/public/cities');
  return (
    <>
      <section className="page-header"><div className="container">
        <h1>Our Locations</h1>
        <p className="muted">{cities ? `${cities.length} location${cities.length === 1 ? '' : 's'}` : ' '}</p>
      </div></section>
      <section className="section"><div className="container">
        {loading ? <Loading />
          : error ? <ErrorState message={error} onRetry={reload} />
          : cities.length === 0 ? <Empty message="No locations published yet." />
          : <div className="city-grid">
              {cities.map((c) => (
                <Link key={c.id} to={`/cities/${c.id}`} className="city-card">
                  {c.image ? <img src={c.image} alt={c.name} loading="lazy" /> : <div className="city-card-ph">📍</div>}
                  <div className="city-card-body">
                    {!!c.featured && <span className="badge badge-accent">Featured</span>}
                    <h3>{c.name}</h3>
                    <p className="muted small">{[c.region_name, c.country].filter(Boolean).join(' · ')}</p>
                    <p className="muted small">{c.product_count} products · {c.service_count} services</p>
                  </div>
                </Link>
              ))}
            </div>}
      </div></section>
    </>
  );
}
