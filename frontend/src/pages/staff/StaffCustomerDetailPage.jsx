import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/staff-customer-detail.css';
import { getCustomer } from '../../api/customer.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import ComplaintBadge from '../../components/staff/ComplaintBadge';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import { CUSTOMER_STATUS } from '../../utils/complaintMeta';
import { PAYMENT_METHOD } from '../../utils/orderMeta';

// UC-19.2 View Customer Details (Staff): thông tin tối thiểu + tóm tắt đơn hàng/khiếu nại. Chỉ xem.
export default function StaffCustomerDetailPage() {
  const { id } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    getCustomer(id)
      .then((res) => setC(res.data))
      .catch(async (err) => {
        if (err.response?.status === 401) { await logout(); navigate('/login', { state: { from: location }, replace: true }); return; }
        const code = err.response?.status;
        setError({ notFound: code === 404, denied: code === 403, message: code === 404 ? 'Không tìm thấy khách hàng này.' : code === 403 ? 'Bạn không có quyền xem thông tin khách hàng.' : (err.response?.data?.message || 'Không tải được thông tin khách hàng. Vui lòng thử lại.') });
      })
      .finally(() => setLoading(false));
  }, [id, logout, navigate, location]);

  useEffect(() => { setC(null); load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const backTo = location.state?.from || '/staff/customers';
  const crumb = (
    <nav className="scdt-crumb" aria-label="Breadcrumb">
      <Link to="/staff">Nhân viên</Link><Icon name="chevron_right" size="sm" />
      <Link to={backTo}>Khách hàng</Link><Icon name="chevron_right" size="sm" />
      <span aria-current="page">{c ? c.fullName : 'Chi tiết'}</span>
    </nav>
  );

  if (loading) return <div className="scdt">{crumb}<div className="scdt-skeleton" aria-busy="true" aria-label="Đang tải khách hàng" /></div>;
  if (error) {
    return (
      <div className="scdt">{crumb}
        <div className="scdt-state" role="alert"><Icon name={error.denied ? 'lock' : error.notFound ? 'person_off' : 'cloud_off'} size="xl" />
          <h2>{error.denied ? 'Không có quyền truy cập' : error.notFound ? 'Không tìm thấy khách hàng' : 'Chưa tải được thông tin'}</h2><p>{error.message}</p>
          <div className="scdt-actions">{!error.notFound && !error.denied && <button type="button" className="scdt-btn" onClick={load}><Icon name="refresh" size="md" />Thử lại</button>}
            <Link className="scdt-btn ghost" to="/staff/customers"><Icon name="arrow_back" size="md" />Về danh sách</Link></div></div>
      </div>
    );
  }

  return (
    <div className="scdt">
      {crumb}
      <header className="scdt-head">
        <div>
          <div className="scdt-title"><h1>{c.fullName}</h1><span className={`scdt-status ${c.status}`}>{CUSTOMER_STATUS[c.status] || c.status}</span></div>
          <p><Icon name="shield_person" size="md" />Thông tin liên hệ được che một phần. Trang này chỉ để xem, không sửa dữ liệu khách hàng.</p>
        </div>
        <Link className="scdt-btn ghost" to={backTo}><Icon name="arrow_back" size="md" />Quay lại danh sách</Link>
      </header>

      <div className="scdt-stats">
        <div><span>Đơn hàng</span><b>{c.stats.orderCount}</b></div>
        <div><span>Đã nhận hàng</span><b>{c.stats.completedCount}</b></div>
        <div><span>Tổng chi tiêu</span><b>{formatCurrency(c.stats.totalSpent)}</b></div>
        <div><span>Đơn gần nhất</span><b>{c.stats.lastOrderAt ? formatDate(c.stats.lastOrderAt) : '—'}</b></div>
      </div>

      <div className="scdt-grid">
        <section className="scdt-card">
          <h2><Icon name="badge" />Thông tin khách hàng</h2>
          <dl className="scdt-dl">
            <dt>Email</dt><dd>{c.email || '—'}</dd>
            <dt>Số điện thoại</dt><dd>{c.phone || '—'}</dd>
            <dt>Tham gia</dt><dd>{formatDate(c.joinedAt)}</dd>
            <dt>Hạng thành viên</dt><dd>{c.membership.tier || '—'}</dd>
            <dt>Điểm hiện có</dt><dd>{c.membership.points}</dd>
          </dl>
        </section>

        <section className="scdt-card">
          <h2><Icon name="report" />Khiếu nại / hỗ trợ {c.complaints.openCount > 0 && <span className="scdt-count">{c.complaints.openCount} đang mở</span>}</h2>
          {c.complaints.recent.length === 0 && <p className="scdt-muted">Khách chưa gửi khiếu nại hay yêu cầu hỗ trợ nào.</p>}
          <ul className="scdt-list">
            {c.complaints.recent.map((r) => (
              <li key={r._id}>
                <Link to={`/staff/complaints/${r._id}`} state={{ from: `/staff/customers/${c._id}` }}>{r.subject}</Link>
                <span><ComplaintBadge type={r.type} /> <ComplaintBadge status={r.status} /></span>
                <small>{formatDateTime(r.createdAt)}</small>
              </li>
            ))}
          </ul>
        </section>

        <section className="scdt-card wide">
          <h2><Icon name="receipt_long" />Đơn hàng gần đây</h2>
          {c.recentOrders.length === 0 && <p className="scdt-muted">Khách chưa có đơn hàng nào.</p>}
          {c.recentOrders.length > 0 && (
            <div className="scdt-table-wrap">
              <table className="scdt-table">
                <thead><tr><th>Mã đơn</th><th>Trạng thái</th><th>Thanh toán</th><th className="num">Tổng tiền</th><th>Ngày đặt</th></tr></thead>
                <tbody>{c.recentOrders.map((o) => (
                  <tr key={o._id}><td><b>#{o.orderCode}</b></td><td><OrderStatusBadge status={o.status} /></td><td>{PAYMENT_METHOD[o.paymentMethod] || '—'}</td><td className="num">{formatCurrency(o.totalAmount)}</td><td>{formatDateTime(o.createdAt)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
