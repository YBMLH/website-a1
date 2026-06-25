import { createContext, useContext, useState, useCallback } from 'react';
import Modal from './Modal';
import api from '../api/client';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { buildWhatsAppMessage, openWhatsApp } from '../utils/whatsapp';
import { formatPrice } from '../utils/format';

const InquiryContext = createContext(null);
export const useInquiry = () => useContext(InquiryContext);

// Provides openInquiry(item, kind). `item` null => general contact inquiry.
export function InquiryProvider({ children }) {
  const { settings } = useSettings();
  const toast = useToast();
  const [target, setTarget] = useState(null); // { item, kind }
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [busy, setBusy] = useState(false);

  const openInquiry = useCallback((item, kind) => {
    setForm({ name: '', phone: '', message: '' });
    setTarget({ item: item || null, kind: kind || 'contact' });
  }, []);

  const close = () => setTarget(null);

  const submit = async () => {
    const item = target.item;
    setBusy(true);
    try {
      // Persist the lead so it appears in the admin Inquiries panel.
      await api.post('/public/inquiries', {
        customer_name: form.name,
        phone: form.phone,
        item_type: item ? (target.kind === 'services' ? 'service' : 'product') : 'contact',
        item_id: item?.id,
        item_name: item?.title || '',
        price: item ? String(item.sale_price ?? item.price ?? '') : '',
        city: item?.city_name || '',
        message: form.message || 'I would like more information regarding this item.',
      });
    } catch { /* still proceed to WhatsApp even if logging fails */ }

    const msg = buildWhatsAppMessage({
      item, customerName: form.name, customerPhone: form.phone, currency: settings.currency,
    });
    const number = settings.contact_whatsapp || settings.contact_phone;
    if (number) openWhatsApp(number, msg);
    else toast.error('No WhatsApp number configured.');
    setBusy(false);
    close();
    toast.success('Opening WhatsApp…');
  };

  const item = target?.item;
  const price = item ? (item.sale_price ?? item.price) : null;

  return (
    <InquiryContext.Provider value={{ openInquiry }}>
      {children}
      {target && (
        <Modal
          title={item ? `Inquire about ${item.title}` : 'Contact us on WhatsApp'}
          onClose={close}
          footer={
            <>
              <button className="btn btn-ghost" onClick={close}>Cancel</button>
              <button className="btn btn-whatsapp" disabled={busy} onClick={submit}>
                {busy ? 'Sending…' : 'Send via WhatsApp'}
              </button>
            </>
          }
        >
          {item && (
            <div className="card" style={{ padding: '.8rem 1rem', marginBottom: '1rem', boxShadow: 'none' }}>
              <strong>{item.title}</strong>
              <div className="muted small">
                {price != null && <>Price: {formatPrice(price, item.currency || settings.currency)} · </>}
                {item.city_name && <>Location: {item.city_name}</>}
              </div>
            </div>
          )}
          <div className="field">
            <label>Your Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
          </div>
          <div className="field">
            <label>Phone Number</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Your phone number" />
          </div>
          <div className="field">
            <label>Message (optional)</label>
            <textarea rows="3" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="I would like more information…" />
          </div>
          <p className="muted small">This opens WhatsApp with a pre-filled message to the business.</p>
        </Modal>
      )}
    </InquiryContext.Provider>
  );
}
