import { useState } from 'react';
import { findMember } from '../../api/customer.api';
import Icon from '../common/Icon';
import RegisterMemberForm from './RegisterMemberForm';
import '../../styles/member-picker.css';

// POS: tìm thành viên cho hóa đơn (SĐT / email / mã) hoặc đăng ký thành viên mới
export default function MemberPicker({ value, onChange, disabled }) {
  const [q, setQ] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notFound, setNotFound] = useState(false);
  const [registering, setRegistering] = useState(false), [notice, setNotice] = useState('');

  const search = async (e) => {
    e?.preventDefault();
    const term = q.trim();
    if (term.length < 3) { setError('Enter a phone number, email or member code.'); return; }
    setBusy(true); setError(''); setNotFound(false); setNotice('');
    try { const r = await findMember(term); onChange(r.data.member); setQ(''); }
    catch (err) {
      if (err.response?.data?.code === 'MEMBER_NOT_FOUND') setNotFound(true);
      else setError(err.response?.data?.message || 'Could not look up this member.');
    } finally { setBusy(false); }
  };
  const registered = (member, info) => {
    onChange(member); setRegistering(false); setNotFound(false); setQ('');
    setNotice(info?.created ? `Member registered${info.invited ? ' · a set-password email was sent' : ''}.` : '');
  };

  if (value) return (
    <div className="mbr-card">
      <span className="mbr-avatar"><Icon name="loyalty" /></span>
      <div>
        <b>{value.fullName}</b>
        <small>{[value.phone, value.email].filter(Boolean).join(' · ') || value.memberCode}</small>
        <small>{value.tier || 'Member'} · {value.points} pts · earns points on this sale</small>
        {notice && <small className="mbr-ok">{notice}</small>}
      </div>
      <button type="button" className="mbr-remove" disabled={disabled} onClick={() => { onChange(null); setNotice(''); }} aria-label="Remove member"><Icon name="close" size="sm" /></button>
    </div>
  );

  if (registering) {
    const looksEmail = q.includes('@');
    return <RegisterMemberForm initial={looksEmail ? { email: q.trim() } : { phone: q.trim() }} onDone={registered} onCancel={() => setRegistering(false)} />;
  }

  return (
    <div className="mbr-picker">
      <form className="mbr-search" onSubmit={search}>
        <label>Member (optional)<input value={q} maxLength={254} placeholder="Phone, email or member code" onChange={(e) => { setQ(e.target.value); setError(''); setNotFound(false); }} disabled={disabled || busy} /></label>
        <button className="ui-button secondary" disabled={disabled || busy}>{busy ? '…' : <Icon name="search" size="sm" />}</button>
      </form>
      {error && <p className="mbr-error" role="alert">{error}</p>}
      {notFound && <p className="mbr-error" role="status">No member found for “{q.trim()}”.</p>}
      <button type="button" className="mbr-new" disabled={disabled} onClick={() => setRegistering(true)}><Icon name="person_add" size="sm" />{notFound ? 'Register this customer as a member' : 'Register new member'}</button>
    </div>
  );
}
