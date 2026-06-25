const SYMBOLS = { USD: '$', EUR: '€', GBP: '£', MAD: 'DH ', AED: 'AED ', SAR: 'SAR ', INR: '₹' };

export function formatPrice(amount, currency = 'USD') {
  if (amount == null || amount === '') return '';
  const sym = SYMBOLS[currency] || (currency ? currency + ' ' : '');
  const num = Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${sym}${num}`;
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.includes('Z') || iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString();
}

export function truncate(str, n = 120) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}
