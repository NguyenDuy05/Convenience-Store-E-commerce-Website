import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTransactions, getTransaction } from '../../api/transaction.api';
import { formatCurrency } from '../../utils/format';
import '../../styles/admin-transactions.css';

const LIMIT = 10;
const STATUS_LABEL = { pending: 'Đang chờ', success: 'Thành công', failed: 'Thất bại' };
const METHOD_LABEL = { cash: 'Tiền mặt', card: 'Thẻ', vnpay: 'VNPay', momo: 'MoMo' };
const dt = (d) => (d ? new Date(d).toLocaleString('vi-VN') : '—');
const EMPTY = { q: '', status: '', method: '', from: '', to: '' };

const Badge = ({ status }) => <span className={`atx-chip ${status}`}>{STATUS_LABEL[status] || status}</span>;
const Row = ({ k, v }) => <div className="atx-row"><span>{k}</span><span>{v}</span></div>;

// Giao diện dùng chung: Admin (UC-35.1, 35.2) và Staff (UC-23.1, 23.2, 23.3). Chỉ đọc.
export default function TransactionManager({ homePath, homeLabel, subtitle }) {
  const [form, setForm] = useState(EMPTY);
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, summary: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = { page, limit: LIMIT };
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    listTransactions(params)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Không tải được danh sách giao dịch. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const onSearch = (e) => { e.preventDefault(); setPage(1); setFilters(form); };
  const onReset = () => { setForm(EMPTY); setFilters(EMPTY); setPage(1); };

  const openDetail = (id) => {
    setDetailLoading(true);
    setDetailError('');
    setDetail(null);
    getTransaction(id)
      .then((res) => setDetail(res.data))
      .catch((err) => setDetailError(err.response?.data?.message || 'Không tải được chi tiết giao dịch'))
      .finally(() => setDetailLoading(false));
  };

  const totalPages = Math.max(Math.ceil(data.total / LIMIT), 1);

  return (
    <section className="atx">
      <nav className="atx-crumb" aria-label="Breadcrumb">
        <Link to={homePath}>{homeLabel}</Link><span>›</span><span aria-current="page">Giao dịch</span>
      </nav>
      <div className="atx-head">
        <div>
          <h1>Giao dịch</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      <form className="atx-filters" onSubmit={onSearch}>
        <label className="atx-q">Mã giao dịch / mã đơn
          <input value={form.q} onChange={set('q')} placeholder="VD: CM-20261021-0001" maxLength={100} />
        </label>
        <label>Trạng thái
          <select value={form.status} onChange={set('status')}>
            <option value="">Tất cả</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>Phương thức
          <select value={form.method} onChange={set('method')}>
            <option value="">Tất cả</option>
            {Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>Từ ngày<input type="date" value={form.from} onChange={set('from')} /></label>
        <label>Đến ngày<input type="date" value={form.to} onChange={set('to')} /></label>
        <button type="submit" className="atx-btn">Tìm kiếm</button>
        <button type="button" className="atx-btn ghost" onClick={onReset}>Xóa lọc</button>
      </form>

      {loading ? <div className="atx-skeleton" /> : error ? (
        <div className="atx-card atx-state">
          <h3>Không tải được dữ liệu</h3>
          <p>{error}</p>
          <button type="button" className="atx-btn" onClick={load}>Thử lại</button>
        </div>
      ) : (
        <>
          {data.summary && (
            <div className="atx-banner">
              <div><strong>{data.total}</strong><span>Tổng giao dịch</span></div>
              <div><strong>{data.summary.successCount}</strong><span>Giao dịch thành công</span></div>
              <div><strong>{formatCurrency(data.summary.successAmount)}</strong><span>Tổng tiền thành công</span></div>
            </div>
          )}
          <div className="atx-card atx-table-wrap">
            {data.items.length === 0 ? (
              <div className="atx-state"><h3>Không có giao dịch phù hợp</h3><p>Hãy thử thay đổi điều kiện tìm kiếm.</p></div>
            ) : (
              <table className="atx-table">
                <thead>
                  <tr><th>Thời gian</th><th>Mã đơn</th><th>Mã tham chiếu</th><th>Khách hàng</th><th>Phương thức</th><th className="atx-num">Số tiền</th><th>Trạng thái</th><th /></tr>
                </thead>
                <tbody>
                  {data.items.map((t) => (
                    <tr key={t._id}>
                      <td>{dt(t.createdAt)}</td>
                      <td className="atx-mono">{t.order?.orderCode || '—'}</td>
                      <td>{t.txnRef || '—'}</td>
                      <td>{t.customer?.fullName || 'Khách vãng lai'}</td>
                      <td>{METHOD_LABEL[t.method] || t.method}</td>
                      <td className="atx-num">{formatCurrency(t.amount)}</td>
                      <td><Badge status={t.status} /></td>
                      <td><button type="button" className="atx-btn ghost sm" onClick={() => openDetail(t._id)}>Chi tiết</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="atx-pager">
            <button type="button" className="atx-btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button>
            <span>Trang {page} / {totalPages}</span>
            <button type="button" className="atx-btn ghost sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau</button>
          </div>
        </>
      )}

      {detailLoading && <div className="atx-skeleton atx-detail" />}
      {detailError && <div className="atx-banner error atx-detail"><div><strong>Không tải được chi tiết</strong><span>{detailError}</span></div></div>}
      {detail && (
        <div className="atx-detail">
          <div className="atx-detail-head">
            <h2>Chi tiết giao dịch <Badge status={detail.status} /></h2>
            <button type="button" className="atx-btn ghost" onClick={() => setDetail(null)}>Đóng</button>
          </div>
          {detail.status === 'failed' && detail.failureReason && (
            <div className="atx-banner error"><div><strong>Thanh toán thất bại</strong><span>{detail.failureReason}</span></div></div>
          )}
          <div className="atx-grid">
            <div className="atx-card">
              <h2>Thông tin giao dịch</h2>
              <div className="atx-rows">
                <Row k="Mã tham chiếu" v={detail.txnRef || '—'} />
                <Row k="Phương thức" v={METHOD_LABEL[detail.method] || detail.method} />
                <Row k="Khách hàng" v={detail.customer ? `${detail.customer.fullName} (${detail.customer.email})` : 'Khách vãng lai'} />
                <Row k="Nhân viên xử lý" v={detail.processedBy?.fullName || '—'} />
                <Row k="Thời điểm tạo" v={dt(detail.createdAt)} />
                <Row k="Thời điểm thanh toán" v={dt(detail.paidAt)} />
                {detail.gateway?.provider && <>
                  <div className="atx-sep" />
                  <Row k="Cổng thanh toán" v={detail.gateway.provider} />
                  <Row k="Mã giao dịch cổng" v={detail.gateway.transactionNo || '—'} />
                  <Row k="Mã phản hồi" v={detail.gateway.responseCode || '—'} />
                  <Row k="Ngân hàng" v={detail.gateway.bankCode || '—'} />
                </>}
                {detail.cash && detail.cash.received != null && <>
                  <div className="atx-sep" />
                  <Row k="Tiền khách đưa" v={formatCurrency(detail.cash.received)} />
                  <Row k="Tiền thối" v={formatCurrency(detail.cash.change)} />
                </>}
              </div>
              <h2 style={{ marginTop: 20 }}>Lịch sử giao dịch</h2>
              <ul className="atx-timeline">
                {detail.timeline.map((s, i) => (
                  <li key={i}><b>{s.label}</b><small>{dt(s.at)}{s.note ? ` · ${s.note}` : ''}</small></li>
                ))}
              </ul>
            </div>

            <div className="atx-side">
              <div className="atx-card">
                <h2>Đơn hàng liên quan</h2>
                <div className="atx-rows">
                  <Row k="Mã đơn" v={detail.order?.orderCode || '—'} />
                  <Row k="Trạng thái đơn" v={detail.order?.status || '—'} />
                  <Row k="Thanh toán đơn" v={detail.order?.paymentStatus || '—'} />
                  <div className="atx-sep" />
                  <div className="atx-row strong"><span>Số tiền giao dịch</span><span>{formatCurrency(detail.amount)}</span></div>
                  {detail.order && <Row k="Tổng tiền đơn" v={formatCurrency(detail.order.totalAmount)} />}
                </div>
              </div>
              {detail.relatedTransactions?.length > 0 && (
                <div className="atx-card">
                  <h2>Giao dịch khác của đơn này</h2>
                  <ul className="atx-related">
                    {detail.relatedTransactions.map((r) => (
                      <li key={r._id}>
                        <button type="button" className="atx-btn ghost sm" onClick={() => openDetail(r._id)}>{r.txnRef || 'Xem'}</button>
                        {METHOD_LABEL[r.method] || r.method} · {formatCurrency(r.amount)} <Badge status={r.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
