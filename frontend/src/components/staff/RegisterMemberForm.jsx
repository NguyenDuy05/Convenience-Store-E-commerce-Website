import { useState } from 'react';
import { registerMember } from '../../api/customer.api';
import Icon from '../common/Icon';
import '../../styles/member-picker.css';

const PHONE_RE = /^(\+?84|0)\d{9,10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Form đăng ký thành viên tại quầy: họ tên + email (bắt buộc), số điện thoại (tùy chọn).
// onDone(member) khi tạo xong hoặc khi chọn thành viên đã tồn tại.
export default function RegisterMemberForm({ initial = {}, onDone, onCancel }) {
  const [form, setForm] = useState({ fullName: initial.fullName || '', phone: initial.phone || '', email: initial.email || '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [existing, setExisting] = useState(null);
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setError(''); setExisting(null); };
  const phone = form.phone.trim().replace(/[\s.-]/g, ''), email = form.email.trim();
  const problem = form.fullName.trim().length < 2 ? "Enter the customer's full name."
    : !email ? "Enter the customer's email address."
    : !EMAIL_RE.test(email) ? 'Email address is invalid.'
    : phone && !PHONE_RE.test(phone) ? 'Phone number is invalid (e.g. 0901234567).' : '';

  const submit = async (e) => {
    e.preventDefault();
    if (problem) { setError(problem); return; }
    setBusy(true); setError(''); setExisting(null);
    try {
      const r = await registerMember({ fullName: form.fullName.trim(), phone: phone || undefined, email: email || undefined });
      onDone(r.data.member, { created: true, invited: r.data.invited });
    } catch (err) {
      const d = err.response?.data;
      setError(d?.message || 'Could not register this member. Please try again.');
      if (d?.code === 'MEMBER_EXISTS' && d.member) setExisting(d.member);
    } finally { setBusy(false); }
  };

  return (
    <form className="mbr-form" onSubmit={submit} noValidate>
      <h3><Icon name="person_add" size="md" />Register new member</h3>
      <p className="mbr-hint">For customers without an account. <b>Email is required</b>: the customer receives a link to set a password and can then sign in online. Add a phone number so you can find them quickly at the counter.</p>
      <label>Full name *<input value={form.fullName} maxLength={100} onChange={set('fullName')} autoFocus disabled={busy} /></label>
      <label>Email *<input value={form.email} maxLength={254} type="email" placeholder="name@example.com" onChange={set('email')} disabled={busy} /></label>
      <label>Phone number (optional)<input value={form.phone} maxLength={15} inputMode="tel" placeholder="0901234567" onChange={set('phone')} disabled={busy} /></label>
      {error && <p className="mbr-error" role="alert">{error}</p>}
      {existing && <button type="button" className="ui-button secondary" onClick={() => onDone(existing, { created: false })}><Icon name="how_to_reg" size="sm" />Use existing member: {existing.fullName}</button>}
      <div className="mbr-actions">
        <button className="ui-button" disabled={busy}>{busy ? 'Registering…' : 'Register member'}</button>
        {onCancel && <button type="button" className="ui-button secondary" disabled={busy} onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
