import { formatPrice } from './format';

/**
 * Build the professional WhatsApp inquiry message described in the spec.
 * `item` is a product/service (optional — falls back to a general contact msg).
 */
export function buildWhatsAppMessage({ item, customerName = '', customerPhone = '', currency = 'USD' } = {}) {
  if (!item) {
    return [
      'Hello,',
      '',
      'I would like more information about your business.',
      '',
      `Customer Name:\n${customerName}`,
      '',
      `Phone Number:\n${customerPhone}`,
      '',
      'Thank you.',
    ].join('\n');
  }
  const price = item.sale_price ?? item.price;
  return [
    'Hello,',
    '',
    'I am interested in the following item:',
    '',
    `Name: ${item.title || item.name || ''}`,
    '',
    `Price: ${price != null ? formatPrice(price, item.currency || currency) : 'N/A'}`,
    '',
    `Location: ${item.city_name || (item.cities && item.cities[0]?.name) || 'N/A'}`,
    '',
    `Customer Name:\n${customerName}`,
    '',
    `Phone Number:\n${customerPhone}`,
    '',
    'Message:\nI would like more information regarding this item.',
    '',
    'Thank you.',
  ].join('\n');
}

/** Open WhatsApp with the prepared message to the business number. */
export function openWhatsApp(number, message) {
  const digits = String(number || '').replace(/[^0-9]/g, '');
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener');
}
