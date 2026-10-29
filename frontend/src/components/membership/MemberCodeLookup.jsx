import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lookupMemberCode } from '../../api/membership.api';
import '../../styles/member-code-lookup.css';

export default function MemberCodeLookup() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const { data } = await lookupMemberCode(code.trim());
      navigate(`/staff/customers/${data.customerId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tra cứu được thành viên. Vui lòng thử lại.');
    } finally { setBusy(false); }
  };
  return <section className="member-code-lookup" aria-label="Tra cứu mã thành viên">
    <form onSubmit={submit}>
      <label htmlFor="counter-member-code">Mã thành viên<small>Chọn ô bên dưới rồi quét QR bằng máy quét, hoặc nhập mã và nhấn Enter.</small></label>
      <div><input id="counter-member-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="QUICK-…" maxLength={30} autoComplete="off" spellCheck={false} disabled={busy} required /><button disabled={busy || !code.trim()}>{busy ? 'Đang tìm…' : 'Tra cứu thành viên'}</button></div>
    </form>
    {error && <p role="alert">{error}</p>}
  </section>;
}
