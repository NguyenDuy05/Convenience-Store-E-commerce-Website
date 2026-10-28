import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/staff-complaint-detail.css';
import { getSupportRequest, handleComplaint } from '../../api/support.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import ComplaintBadge from '../../components/staff/ComplaintBadge';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import { newIdempotencyKey } from '../../utils/idempotency';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { COMPLAINT_STATUS, STATUS_ACTION } from '../../utils/complaintMeta';

// UC-19.3 Handle Customer Complaint (Staff): xem khiếu nại, phản hồi khách, chuyển trạng thái theo luồng cho phép
export default function StaffComplaintDetailPage() {
  const { id } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [r, setR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('');            // '' = giữ nguyên trạng thái, chỉ gửi phản hồi
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(null);              // { replayed }
  const lock = useRef(false);
  const keyRef = useRef(newIdempotencyKey());          // giữ nguyên khi gửi lại do lỗi mạng; đổi sau khi lưu xong hoặc lỗi dứt khoát

  const onAuth = useCallback(async (err) => {
    if (err.response?.status !== 401) return false;
    await logout(); navigate('/login', { state: { from: location }, replace: true }); return true;
  }, [logout, navigate, location]);

  const load = useCallback(async (spinner = false) => {
    if (spinner) setLoading(true);
    try { const res = await getSupportRequest(id); setR(res.data); setError(null); }
    catch (err) {
      if (await onAuth(err)) return;
      const code = err.response?.status;
      setError({ notFound: code === 404, denied: code === 403, message: code === 404 ? 'Không tìm thấy yêu cầu này.' : code === 403 ? 'Bạn không có quyền xử lý khiếu nại.' : (err.response?.data?.message || 'Không tải được yêu cầu. Vui lòng thử lại.') });
    } finally { setLoading(false); }
  }, [id, onAuth]);

  useEffect(() => { setR(null); load(true); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const backTo = location.state?.from || '/staff/complaints';
  const crumb = (
    <nav className="cmpd-crumb" aria-label="Breadcrumb">
      <Link to="/staff">Nhân viên</Link><Icon name="chevron_right" size="sm" />
      <Link to={backTo}>Khiếu nại</Link><Icon name="chevron_right" size="sm" /><span aria-current="page">{r ? r.subject : 'Chi tiết'}</span>
    </nav>
  );

  if (loading && !r) return <div className="cmpd">{crumb}<div className="cmpd-skeleton" aria-busy="true" aria-label="Đang tải yêu cầu" /></div>;
  if (error && !r) {
    return (
      <div className="cmpd">{crumb}
        <div className="cmpd-state" role="alert"><Icon name={error.denied ? 'lock' : error.notFound ? 'search_off' : 'cloud_off'} size="xl" /><h2>{error.denied ? 'Không có quyền truy cập' : error.notFound ? 'Không tìm thấy yêu cầu' : 'Chưa tải được yêu cầu'}</h2><p>{error.message}</p>
          <div className="cmpd-actions">{!error.notFound && !error.denied && <button type="button" className="cmpd-btn" onClick={() => load(true)}><Icon name="refresh" size="md" />Thử lại</button>}
            <Link className="cmpd-btn ghost" to="/staff/complaints"><Icon name="arrow_back" size="md" />Về danh sách</Link></div></div>
      </div>
    );
  }

  const closed = r.allowedStatuses.length === 0 && r.status === 'resolved';
  const needMsg = target === 'resolved';
  const canSubmit = !saving && (message.trim().length > 0 || (target && target !== r.status)) && !(needMsg && message.trim().length === 0);

  const submit = async (e) => {
    e.preventDefault();
    if (lock.current || !canSubmit) return;
    lock.current = true; setSaving(true); setFormError(''); setDone(null);
    try {
      const res = await handleComplaint(id, { message: message.trim() || undefined, status: target || undefined }, keyRef.current);
      setR(res.data); setDone({ replayed: res.data.replayed });
      setMessage(''); setTarget(''); keyRef.current = newIdempotencyKey();
    } catch (err) {
      if (await onAuth(err)) return;
      const st = err.response?.status; const data = err.response?.data || {};
      if (!err.response || st >= 500) {
        // Không biết đã lưu chưa: GIỮ khoá, bấm lại sẽ không ghi trùng phản hồi
        setFormError('Chưa nhận được phản hồi từ hệ thống nên chưa biết đã lưu hay chưa. Bạn có thể bấm gửi lại, hệ thống sẽ không ghi trùng phản hồi.');
      } else {
        keyRef.current = newIdempotencyKey();
        setFormError(data.message || 'Không lưu được. Vui lòng thử lại.');
        if (['INVALID_TRANSITION', 'STALE_STATUS', 'CLOSED'].includes(data.code)) { setTarget(''); await load(); }   // hiển thị lại các bước được phép
      }
    } finally { lock.current = false; setSaving(false); }
  };

  return (
    <div className="cmpd">
      {crumb}
      <header className="cmpd-head">
        <div>
          <div className="cmpd-title"><h1>{r.subject}</h1><ComplaintBadge type={r.type} /><ComplaintBadge status={r.status} /></div>
          <p>Gửi lúc {formatDateTime(r.createdAt)}{r.handledBy ? ` • Người xử lý: ${r.handledBy}` : ''}{r.resolvedAt ? ` • Đóng lúc ${formatDateTime(r.resolvedAt)}` : ''}</p>
        </div>
        <Link className="cmpd-btn ghost" to={backTo}><Icon name="arrow_back" size="md" />Quay lại</Link>
      </header>

      <div className="cmpd-grid">
        <div className="cmpd-col">
          <section className="cmpd-card">
            <h2><Icon name="forum" />Trao đổi</h2>
            <ol className="cmpd-thread">
              <li className="cust"><div className="cmpd-who"><b>{r.customer ? r.customer.fullName : 'Khách hàng'}</b><span>{formatDateTime(r.createdAt)}</span></div><p>{r.message}</p></li>
              {r.responses.map((x) => (
                <li className="staff" key={x._id}><div className="cmpd-who"><b>{x.responder || 'Nhân viên'}</b><span>{formatDateTime(x.createdAt)}</span></div><p>{x.message}</p></li>
              ))}
            </ol>
            {r.responses.length === 0 && <p className="cmpd-muted">Chưa có phản hồi nào cho yêu cầu này.</p>}
          </section>

          <section className="cmpd-card">
            <h2><Icon name="reply" />Xử lý yêu cầu</h2>
            {done && <div className="cmpd-ok" role="status"><Icon name="check_circle" size="lg" fill /><div><b>{done.replayed ? 'Phản hồi này đã được lưu trước đó, không ghi trùng.' : 'Đã lưu xử lý.'}</b><span>Chưa có chính sách thông báo nào được duyệt nên hệ thống không gửi thông báo cho khách; kết quả đã được lưu vào hồ sơ yêu cầu.</span></div></div>}
            {closed ? (
              <p className="cmpd-muted"><Icon name="lock" size="md" />Yêu cầu này đã được giải quyết và đóng, không thể xử lý thêm.</p>
            ) : (
              <form className="cmpd-form" onSubmit={submit}>
                <label htmlFor="cmpd-msg">Phản hồi gửi khách</label>
                <textarea id="cmpd-msg" rows={4} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Nhập nội dung phản hồi cho khách hàng…" />
                <small>{message.length}/2000</small>
                <fieldset>
                  <legend>Trạng thái sau khi lưu</legend>
                  <label className="cmpd-radio"><input type="radio" name="st" checked={target === ''} onChange={() => setTarget('')} />Giữ nguyên ({COMPLAINT_STATUS[r.status].label}), chỉ gửi phản hồi</label>
                  {r.allowedStatuses.map((s) => (
                    <label className="cmpd-radio" key={s}><input type="radio" name="st" checked={target === s} onChange={() => setTarget(s)} /><span><b>{STATUS_ACTION[s].label}</b><small>{STATUS_ACTION[s].hint}</small></span></label>
                  ))}
                </fieldset>
                {needMsg && message.trim().length === 0 && <p className="cmpd-warn"><Icon name="info" size="md" />Cần nhập phản hồi để đánh dấu đã giải quyết.</p>}
                {formError && <p className="cmpd-error" role="alert"><Icon name="error" size="md" />{formError}</p>}
                <button type="submit" className="cmpd-btn" disabled={!canSubmit}>{saving ? 'Đang lưu…' : 'Lưu xử lý'}</button>
              </form>
            )}
          </section>
        </div>

        <div className="cmpd-col">
          <section className="cmpd-card">
            <h2><Icon name="person" />Khách hàng</h2>
            {r.customer ? (<div className="cmpd-kv"><b>{r.customer.fullName}</b><span>{r.customer.email}</span>
              <Link to={`/staff/customers/${r.customer._id}`} state={{ from: `/staff/complaints/${r._id}` }}>Xem hồ sơ khách hàng</Link></div>) : <p className="cmpd-muted">Không xác định được khách hàng.</p>}
          </section>
          <section className="cmpd-card">
            <h2><Icon name="receipt_long" />Đơn hàng liên quan</h2>
            {r.order ? (<div className="cmpd-kv"><b>#{r.order.orderCode}</b><span><OrderStatusBadge status={r.order.status} /></span><span>{formatCurrency(r.order.totalAmount)} • {formatDateTime(r.order.createdAt)}</span></div>)
              : <p className="cmpd-muted">{r.type === 'complaint' ? 'Khiếu nại này chưa gắn với đơn hàng nào. Nếu liên quan đến sản phẩm, hãy hỏi khách mã đơn để truy vết.' : 'Yêu cầu này không gắn với đơn hàng.'}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
