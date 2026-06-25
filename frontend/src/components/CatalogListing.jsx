import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import { useSettings } from '../context/SettingsContext';
import { useInquiry } from './InquiryProvider';
import CatalogCard from './CatalogCard';
import { Loading, ErrorState, Empty } from './DataState';

// Generic listing for products or services with search + category + city filters.
export default function CatalogListing({ kind, title }) {
  const { settings: s } = useSettings();
  const { openInquiry } = useInquiry();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState(null);
  const [cats, setCats] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const city = params.get('city') || '';

  useEffect(() => {
    const type = kind === 'services' ? 'service' : 'product';
    api.get(`/public/categories?type=${type}`).then((r) => setCats(r.data)).catch(() => {});
    if (s.enable_cities) api.get('/public/cities').then((r) => setCities(r.data)).catch(() => {});
  }, [kind, s.enable_cities]);

  useEffect(() => {
    setLoading(true); setError(null);
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (category) qs.set('category', category);
    if (city) qs.set('city', city);
    api.get(`/public/${kind}?${qs.toString()}`)
      .then((r) => setItems(r.data))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [kind, q, category, city]);

  const setFilter = (key, val) => {
    const next = new URLSearchParams(params);
    if (val) next.set(key, val); else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <section className="page-header"><div className="container">
        <h1>{title}</h1>
        <p className="muted">{items ? `${items.length} item${items.length === 1 ? '' : 's'}` : ' '}</p>
      </div></section>

      <section className="section"><div className="container">
        <div className="filter-bar">
          <input type="search" placeholder={`Search ${title.toLowerCase()}…`} defaultValue={q}
            onChange={(e) => setFilter('q', e.target.value)} />
          {cats.length > 0 && (
            <select value={category} onChange={(e) => setFilter('category', e.target.value)}>
              <option value="">All categories</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {s.enable_cities && cities.length > 0 && (
            <select value={city} onChange={(e) => setFilter('city', e.target.value)}>
              <option value="">All locations</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {(q || category || city) && <button className="btn btn-ghost" onClick={() => setParams({}, { replace: true })}>Reset</button>}
        </div>

        {loading ? <Loading />
          : error ? <ErrorState message={error} />
          : items.length === 0 ? <Empty message="No items match your filters." />
          : <div className="card-grid">
              {items.map((it) => <CatalogCard key={it.id} item={it} kind={kind} onInquire={openInquiry} />)}
            </div>}
      </div></section>
    </>
  );
}
