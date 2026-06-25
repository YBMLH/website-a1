import { useState } from 'react';
import api, { errMsg } from '../../api/client';
import { useSettings } from '../../context/SettingsContext';
import { useInquiry } from '../../components/InquiryProvider';

export default function Contact() {
  const { settings: s } = useSettings();
  const { openInquiry } = useInquiry();
  const [form, setForm] = useState({ customer_name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState(null); // 'sent' | 'error'
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setStatus(null);
    try {
      await api.post('/public/inquiries', { ...form, item_type: 'contact' });
      setStatus('sent');
      setForm({ customer_name: '', email: '', phone: '', message: '' });
    } catch (err) {
      setStatus(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <section className="page-header"><div className="container"><h1>Contact</h1></div></section>
      <section className="section"><div className="container contact-grid">
        <div>
          {status === 'sent' && <div className="alert alert-success">Thanks — your message has been received. We'll be in touch.</div>}
          {status && status !== 'sent' && <div className="alert alert-error">{status}</div>}
          <form className="form-card" onSubmit={submit}>
            <div className="field"><label>Name</label><input required value={form.customer_name} onChange={set('customer_name')} /></div>
            <div className="field-row">
              <div className="field"><label>Email</label><input type="email" value={form.email} onChange={set('email')} /></div>
              <div className="field"><label>Phone</label><input value={form.phone} onChange={set('phone')} /></div>
            </div>
            <div className="field"><label>Message</label><textarea rows="5" required value={form.message} onChange={set('message')} /></div>
            <div style={{ display: 'flex', gap: '.6rem' }}>
              <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
              {s.enable_whatsapp && (s.contact_whatsapp || s.contact_phone) && (
                <button type="button" className="btn btn-whatsapp btn-lg" onClick={() => openInquiry(null, 'contact')}>💬 WhatsApp</button>
              )}
            </div>
          </form>
        </div>

        <aside className="contact-info">
          <h3>Get in touch</h3>
          <ul className="info-list">
            {s.contact_email && <li>✉ <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a></li>}
            {s.contact_phone && <li>☎ <a href={`tel:${s.contact_phone}`}>{s.contact_phone}</a></li>}
            {s.contact_whatsapp && <li>💬 <a href={`https://wa.me/${s.contact_whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
            {s.contact_address && <li>📍 {s.contact_address}</li>}
            {(s.contact_city || s.contact_country) && <li>🏙 {[s.contact_city, s.contact_country].filter(Boolean).join(', ')}</li>}
            {s.business_hours && <li>🕒 {s.business_hours}</li>}
          </ul>
          {s.enable_maps && s.contact_map && (
            <iframe className="map-embed" loading="lazy" title="map"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(s.contact_address || s.contact_city || '')}&output=embed`} />
          )}
        </aside>
      </div></section>
    </>
  );
}
