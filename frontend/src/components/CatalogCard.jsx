import { Link } from 'react-router-dom';
import { formatPrice } from '../utils/format';
import { useSettings } from '../context/SettingsContext';

// Card used for both products and services. `kind` = 'products' | 'services'.
export default function CatalogCard({ item, kind, onInquire }) {
  const { settings } = useSettings();
  const href = `/${kind}/${item.slug}`;
  const price = item.sale_price != null && item.sale_price !== '' ? item.sale_price : item.price;

  return (
    <article className="card catalog-card">
      <Link to={href} className="card-media">
        {item.image
          ? <img src={item.image} alt={item.title} loading="lazy" />
          : <div className="card-placeholder">{(item.title || '?').charAt(0).toUpperCase()}</div>}
        {!!item.featured && <span className="badge badge-accent">Featured</span>}
      </Link>
      <div className="card-body">
        {item.category_name && <span className="card-tag">{item.category_name}</span>}
        <h3 className="card-title"><Link to={href}>{item.title}</Link></h3>
        {item.short_description && <p className="card-desc">{item.short_description}</p>}
        <div className="card-meta">
          {price != null && price !== '' && (
            <span className="price">
              {item.sale_price != null && item.sale_price !== '' && (
                <span className="price-old">{formatPrice(item.price, item.currency)}</span>
              )}
              {formatPrice(price, item.currency)}
              {item.price_unit && <span className="price-unit"> {item.price_unit}</span>}
            </span>
          )}
          {item.city_name && settings.enable_cities && <span className="badge badge-city">📍 {item.city_name}</span>}
        </div>
        <div className="card-actions">
          <Link to={href} className="btn btn-outline btn-sm btn-block">View Details</Link>
          {settings.enable_whatsapp && (
            <button className="btn btn-whatsapp btn-sm" title="WhatsApp inquiry" onClick={() => onInquire?.(item, kind)}>WhatsApp</button>
          )}
        </div>
      </div>
    </article>
  );
}
