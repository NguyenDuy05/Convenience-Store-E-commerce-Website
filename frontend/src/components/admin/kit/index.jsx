import { useCallback, useEffect, useRef, useState } from 'react';
import '../../../styles/admin-promotions.css';
import '../../../styles/admin-kit.css';

// Định dạng tiền VND
export const money = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v || 0);
// Định dạng tiền VND theo kiểu Việt Nam
export const moneyVi = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0);
// Định dạng ngày giờ
export const dt = (v) => (v ? new Date(v).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
// Định dạng ngày
export const d = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '—');
// Định dạng ngày giờ kiểu Việt Nam
export const dtVi = (v) => (v ? new Date(v).toLocaleString('vi-VN') : '—');

// Lấy thông báo lỗi từ response API
export const msgOf = (err, fallback = 'Unable to complete the request. Please try again.') => {
  if (err?.response?.status === 401) return 'Your session has expired. Please sign in again.';
  if (err?.response?.status === 403) return 'You do not have permission to do this.';
  return err?.response?.data?.message || fallback;
};

// Hook tải dữ liệu theo params; trả { data, loading, error, reload }
export function useFetch(fetcher, params) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(params);
  const ref = useRef(fetcher);
  ref.current = fetcher;
  useEffect(() => {
    let live = true;
    setLoading(true); setError('');
    ref.current(JSON.parse(key)).then((r) => { if (live) setData(r.data); })
      .catch((e) => { if (live) setError(msgOf(e, 'Unable to load data. Please try again.')); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [key, tick]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, loading, error, reload };
}

// Hook chạy thao tác ghi: quản lý đang xử lý / lỗi / thông báo thành công, xong thì tải lại
export function useAction(onDone) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const run = useCallback(async (op, notice) => {
    if (busy) return false;
    setBusy(true); setError(''); setSuccess('');
    try { await op(); setSuccess(notice || ''); if (onDone) onDone(); return true; }
    catch (e) { setError(msgOf(e)); return false; }
    finally { setBusy(false); }
  }, [busy, onDone]);
  return { busy, error, success, run, setError, setSuccess };
}

// Dòng thông báo thành công / lỗi
export function Notice({ success, error }) {
  return <>
    {success && <p className="pm-success" role="status">{success}</p>}
    {error && <p className="pm-error" role="alert">{error}</p>}
  </>;
}

// Thanh phân trang
export function Pager({ page, total, limit, onPage, busy }) {
  const pages = Math.max(1, Math.ceil((total || 0) / limit));
  return <nav className="pm-pagination" aria-label="Pagination">
    <button disabled={page <= 1 || busy} onClick={() => onPage(page - 1)}>Previous</button>
    <span>Page {page} of {pages}</span>
    <button disabled={page >= pages || busy} onClick={() => onPage(page + 1)}>Next</button>
  </nav>;
}

// Thanh tab lọc
export function Tabs({ tabs, value, onChange }) {
  return <div className="pm-tabs" role="tablist">
    {tabs.map((t) => <button key={t.key} role="tab" aria-selected={value === t.key} className={value === t.key ? 'on' : ''} onClick={() => onChange(t.key)}>
      {t.label}{t.count != null && <span className="pm-count">{t.count}</span>}
    </button>)}
  </div>;
}

// Ô số liệu thống kê
export function Stat({ label, value, tone }) {
  return <div className={`pm-stat ${tone || ''}`}><span>{label}</span><strong>{value}</strong></div>;
}

// Hộp xác nhận thao tác
export function Confirm({ title, children, confirmLabel = 'Confirm', danger, busy, error, onConfirm, onCancel }) {
  return <section className="pm-card pm-confirm" aria-labelledby="confirm-title">
    <h2 id="confirm-title">{title}</h2>
    {children}
    {error && <p className="pm-error" role="alert">{error}</p>}
    <div className="pm-actions">
      <button className={danger ? 'pm-danger' : 'pm-primary'} disabled={busy} onClick={onConfirm}>{busy ? 'Processing...' : confirmLabel}</button>
      <button disabled={busy} onClick={onCancel}>Cancel</button>
    </div>
  </section>;
}

// Nhãn trạng thái có màu
export const Badge = ({ tone = '', children }) => <span className={`pm-badge pm-tone-${tone}`}>{children}</span>;
export const STATUS_TONE = { active: 'ok', open: 'ok', success: 'ok', in: 'ok', locked: 'warn', closed: 'warn', pending: 'warn', low: 'warn', suspended: 'warn', inactive: 'muted', deleted: 'bad', failed: 'bad', out: 'bad', expired: 'bad', refunded: 'muted' };
