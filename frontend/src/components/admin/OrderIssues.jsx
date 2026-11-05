import { useRef, useState } from 'react';
import '../../styles/qk-tokens.css';
import '../../styles/order-issues.css';
import Icon from '../common/Icon';
import { handleOrderIssue, resolveOrderIssue } from '../../api/order.api';
import { formatDateTime } from '../../utils/format';

// UC-34.4 Handle Order Issue: danh sách sự cố của đơn, ghi nhận sự cố mới, ghi hướng xử lý khi xong.
// onChanged() để trang cha tải lại đơn; onAuthError(err) trả true nếu đã xử lý lỗi 401.
export default function OrderIssues({ orderId, issues, onChanged, onAuthError }) {
  const [desc, setDesc] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [openId, setOpenId] = useState('');          // sự cố đang mở form xử lý
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
      setAddError(err.response?.data?.message || 'Không ghi nhận được sự cố. Vui lòng thử lại.');
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
      setResolveError(err.response?.data?.message || 'Không lưu được hướng xử lý. Vui lòng thử lại.');
      if (err.response?.status === 409) { setOpenId(''); await onChanged(); }   // người khác đã xử lý: tải lại
    } finally { busy.current = false; setResolving(false); }
  };

  const Item = ({ i }) => (
    <li className={`oiss-item ${i.status}`}>
      <div className="oiss-top">
        <span className={`oiss-badge ${i.status}`}>{i.status === 'open' ? 'Chưa xử lý' : 'Đã xử lý'}</span>
        <span className="oiss-meta">{i.reportedBy} • {formatDateTime(i.createdAt)}</span>
      </div>
      <p className="oiss-desc">{i.description}</p>
      {i.status !== 'open' && (
        <div className="oiss-res"><Icon name="task_alt" size="md" fill /><div><b>Hướng xử lý:</b> {i.resolution}<small>{i.handledBy} • {formatDateTime(i.resolvedAt)}</small></div></div>
      )}
      {i.status === 'open' && openId !== i._id && (
        <button type="button" className="oiss-btn ghost" onClick={() => { setOpenId(i._id); setResolution(''); setResolveError(''); }}>Xử lý sự cố này</button>
      )}
      {i.status === 'open' && openId === i._id && (
        <form className="oiss-form" onSubmit={(e) => resolve(e, i._id)}>
          <label htmlFor={`res-${i._id}`}>Hướng xử lý / kết quả</label>
          <textarea id={`res-${i._id}`} rows={2} maxLength={1000} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Ví dụ: đã liên hệ khách, hoàn tiền qua VNPay ngày..." required />
          {resolveError && <p className="oiss-error" role="alert"><Icon name="error" size="md" />{resolveError}</p>}
          <div className="oiss-actions">
            <button type="submit" className="oiss-btn" disabled={resolving || resolution.trim().length < 3}>{resolving ? 'Đang lưu…' : 'Đánh dấu đã xử lý'}</button>
            <button type="button" className="oiss-btn ghost" onClick={() => setOpenId('')} disabled={resolving}>Hủy</button>
          </div>
        </form>
      )}
    </li>
  );

  return (
    <div className="oiss">
      {issues.length === 0 && <p className="oiss-empty">Đơn này chưa có sự cố nào được ghi nhận.</p>}
      {open.length > 0 && <ul className="oiss-list">{open.map((i) => <Item key={i._id} i={i} />)}</ul>}
      {done.length > 0 && <><h3 className="oiss-sub">Đã xử lý ({done.length})</h3><ul className="oiss-list">{done.map((i) => <Item key={i._id} i={i} />)}</ul></>}

      <form className="oiss-add" onSubmit={add}>
        <label htmlFor="oiss-new">Ghi nhận sự cố mới</label>
        <textarea id="oiss-new" rows={2} maxLength={1000} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ví dụ: khách báo thiếu sản phẩm khi nhận hàng" />
        {addError && <p className="oiss-error" role="alert"><Icon name="error" size="md" />{addError}</p>}
        <button type="submit" className="oiss-btn" disabled={adding || desc.trim().length < 5}>{adding ? 'Đang lưu…' : 'Ghi nhận sự cố'}</button>
      </form>
    </div>
  );
}
