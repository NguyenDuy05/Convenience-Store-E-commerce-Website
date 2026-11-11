import { useRef, useState } from 'react';
import '../../styles/qk-tokens.css';
import '../../styles/order-issues.css';
import Icon from '../common/Icon';
import { handleOrderIssue, resolveOrderIssue } from '../../api/order.api';
import { formatDateTime } from '../../utils/format';

// UC-34.4 Danh sách sự cố của đơn, ghi sự cố mới và ghi hướng xử lý
export default function OrderIssues({ orderId, issues, onChanged, onAuthError }) {
  const [desc, setDesc] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [openId, setOpenId] = useState('');
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const busy = useRef(false);

  const open = issues.filter((i) => i.status === 'open');
  const done = issues.filter((i) => i.status !== 'open');

  const add = async (e) => {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true; setAdding(true); setAddError('');
    try {
      await handleOrderIssue(orderId, { description: desc });
      setDesc('');
      await onChanged();
    } catch (err) {
      if (await onAuthError(err)) return;
      setAddError(err.response?.data?.message || "Could not record the issue. Please try again.");
    } finally { busy.current = false; setAdding(false); }
  };

  const resolve = async (e, issueId) => {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true; setResolving(true); setResolveError('');
    try {
      await resolveOrderIssue(orderId, issueId, { resolution });
      setOpenId(''); setResolution('');
      await onChanged();
    } catch (err) {
      if (await onAuthError(err)) return;
      setResolveError(err.response?.data?.message || "Could not save the resolution. Please try again.");
      if (err.response?.status === 409) { setOpenId(''); await onChanged(); }
    } finally { busy.current = false; setResolving(false); }
  };

  const Item = ({ i }) => (
    <li className={`oiss-item ${i.status}`}>
      <div className="oiss-top">
        <span className={`oiss-badge ${i.status}`}>{i.status === 'open' ? "Open" : "Resolved"}</span>
        <span className="oiss-meta">{i.reportedBy} • {formatDateTime(i.createdAt)}</span>
      </div>
      <p className="oiss-desc">{i.description}</p>
      {i.status !== 'open' && (
        <div className="oiss-res"><Icon name="task_alt" size="md" fill /><div><b>Resolution:</b> {i.resolution}<small>{i.handledBy} • {formatDateTime(i.resolvedAt)}</small></div></div>
      )}
      {i.status === 'open' && openId !== i._id && (
        <button type="button" className="oiss-btn ghost" onClick={() => { setOpenId(i._id); setResolution(''); setResolveError(''); }}>Resolve this issue</button>
      )}
      {i.status === 'open' && openId === i._id && (
        <form className="oiss-form" onSubmit={(e) => resolve(e, i._id)}>
          <label htmlFor={`res-${i._id}`}>Resolution / outcome</label>
          <textarea id={`res-${i._id}`} rows={2} maxLength={1000} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Example: contacted the customer and refunded through VNPay on…" required />
          {resolveError && <p className="oiss-error" role="alert"><Icon name="error" size="md" />{resolveError}</p>}
          <div className="oiss-actions">
            <button type="submit" className="oiss-btn" disabled={resolving || resolution.trim().length < 3}>{resolving ? "Saving…" : "Mark resolved"}</button>
            <button type="button" className="oiss-btn ghost" onClick={() => setOpenId('')} disabled={resolving}>Cancel</button>
          </div>
        </form>
      )}
    </li>
  );

  return (
    <div className="oiss">
      {issues.length === 0 && <p className="oiss-empty">No issues have been reported for this order.</p>}
      {open.length > 0 && <ul className="oiss-list">{open.map((i) => <Item key={i._id} i={i} />)}</ul>}
      {done.length > 0 && <><h3 className="oiss-sub">Resolved ({done.length})</h3><ul className="oiss-list">{done.map((i) => <Item key={i._id} i={i} />)}</ul></>}

      <form className="oiss-add" onSubmit={add}>
        <label htmlFor="oiss-new">Report a new issue</label>
        <textarea id="oiss-new" rows={2} maxLength={1000} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Example: a customer reports a missing item at pickup" />
        {addError && <p className="oiss-error" role="alert"><Icon name="error" size="md" />{addError}</p>}
        <button type="submit" className="oiss-btn" disabled={adding || desc.trim().length < 5}>{adding ? "Saving…" : "Report issue"}</button>
      </form>
    </div>
  );
}
