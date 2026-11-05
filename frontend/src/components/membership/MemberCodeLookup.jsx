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
      setError(err.response?.data?.message || 'Unable to look up the member. Please try again.');
    } finally { setBusy(false); }
  };
  return <section className="member-code-lookup" aria-label="Member code lookup">
    <form onSubmit={submit}>
      <label htmlFor="counter-member-code">Member code<small>Select the field below and scan the QR code, or enter the code and press Enter.</small></label>
      <div><input id="counter-member-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="QUICK-…" maxLength={30} autoComplete="off" spellCheck={false} disabled={busy} required /><button disabled={busy || !code.trim()}>{busy ? 'Searching...' : 'Find member'}</button></div>
    </form>
    {error && <p role="alert">{error}</p>}
  </section>;
}
