import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyShifts, clockIn, clockOut } from '../../api/workShift.api';
import '../../styles/work-shift.css';

const LIMIT = 10;
const STATUS_LABEL = { scheduled: 'Sắp tới', in_progress: 'Đang làm', completed: 'Hoàn tất', missed: 'Lỡ ca' };
const hm = (d) => (d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—');
const dayText = (d) => new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
const dur = (min) => (min == null ? '—' : `${Math.floor(min / 60)}g ${String(min % 60).padStart(2, '0')}p`);
const EMPTY = { status: '', from: '', to: '' };

const Chip = ({ status }) => <span className={`wsp-chip ${status}`}>{STATUS_LABEL[status] || status}</span>;

// UC-24 Manage Work Shift (Staff): xem ca làm, vào ca, ra ca
export default function WorkShiftPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);     // { type: 'success' | 'error', title, text }
  const [clock, setClock] = useState(new Date());

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    const params = { page, limit: LIMIT };
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    return listMyShifts(params)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Không tải được thông tin ca làm. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {          // đồng hồ + làm mới nhẹ mỗi phút để trạng thái nút luôn theo giờ thực
    const t = setInterval(() => { setClock(new Date()); }, 30000);
    const r = setInterval(() => { load(true); }, 60000);
    return () => { clearInterval(t); clearInterval(r); };
  }, [load]);

  const act = (fn, shift, okTitle) => {
    setBusy(true);
    setNotice(null);
    fn({ shiftId: shift._id })
      .then((res) => setNotice({ type: 'success', title: res.data.message, text: `Thời điểm ghi nhận: ${hm(new Date())}` }))
      .catch((err) => setNotice({ type: 'error', title: 'Không thực hiện được', text: err.response?.data?.message || `${okTitle} thất bại. Vui lòng kiểm tra lại trạng thái ca rồi thử lại.` }))
      .finally(() => { setBusy(false); load(true); });   // luôn tải lại để hiện trạng thái thật sau khi thao tác
  };
  const onClockOut = (shift) => {
    if (new Date(shift.endAt) > new Date() && !window.confirm('Chưa đến giờ kết thúc ca. Bạn có chắc muốn ra ca sớm?')) return;
    act(clockOut, shift, 'Ra ca');
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const totalPages = Math.max(Math.ceil((data?.total || 0) / LIMIT), 1);
  const cur = data?.current;

  return (
    <section className="wsp">
      <nav className="wsp-crumb" aria-label="Breadcrumb">
        <Link to="/staff">Nhân viên</Link><span>›</span><span aria-current="page">Ca làm việc</span>
      </nav>
      <div className="wsp-head">
        <div>
          <h1>Ca làm việc</h1>
          <p>Xem ca làm của bạn, vào ca và ra ca. Thời gian do hệ thống ghi nhận.</p>
        </div>
        <div className="wsp-now"><strong>{hm(clock)}</strong>{clock.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</div>
      </div>

      {notice && <div className={`wsp-banner ${notice.type}`} role="alert"><strong>{notice.title}</strong><span>{notice.text}</span></div>}

      {loading && !data ? <div className="wsp-skeleton" /> : error && !data ? (
        <div className="wsp-card wsp-state"><h3>Không tải được ca làm</h3><p>{error}</p><button type="button" className="wsp-btn" onClick={() => load()}>Thử lại</button></div>
      ) : data && (
        <>
          <h2 className="wsp-section" style={{ marginTop: 8 }}>Ca hiện tại</h2>
          {cur ? (
            <div className={`wsp-card wsp-current${cur.status === 'in_progress' ? ' active' : ''}`}>
              <div className="wsp-current-main">
                <div><Chip status={cur.status} />{cur.late && <> <span className="wsp-chip warn">Vào trễ {cur.lateMinutes} phút</span></>}{cur.overdue && <> <span className="wsp-chip warn">Đã quá giờ kết thúc</span></>}</div>
                <div className="wsp-time">{cur.startTime} – {cur.endTime}</div>
                <div className="wsp-sub">{dayText(cur.shiftDate)} · {dur(cur.plannedMinutes)}{cur.clockInAt ? ` · Vào ca lúc ${hm(cur.clockInAt)}` : ''}</div>
                {!cur.actions.canClockIn && !cur.actions.canClockOut && cur.actions.reason && <div className="wsp-reason">{cur.actions.reason}</div>}
              </div>
              {cur.actions.canClockIn && <button type="button" className="wsp-btn" disabled={busy} onClick={() => act(clockIn, cur, 'Vào ca')}>{busy ? 'Đang xử lý...' : 'Vào ca'}</button>}
              {cur.actions.canClockOut && <button type="button" className="wsp-btn out" disabled={busy} onClick={() => onClockOut(cur)}>{busy ? 'Đang xử lý...' : 'Ra ca'}</button>}
            </div>
          ) : (
            <div className="wsp-card wsp-state"><h3>Hiện không có ca nào để vào</h3><p>Nút vào ca chỉ xuất hiện trước giờ bắt đầu tối đa 30 phút. Xem các ca sắp tới bên dưới.</p></div>
          )}

          <h2 className="wsp-section">Ca sắp tới</h2>
          {data.upcoming.length === 0 ? <div className="wsp-card wsp-state">Bạn chưa có ca nào sắp tới.</div> : (
            <div className="wsp-upcoming">
              {data.upcoming.map((s) => (
                <div className="wsp-shift" key={s._id}>
                  <Chip status={s.status} />
                  <b>{s.startTime} – {s.endTime}</b>
                  <span className="wsp-sub">{dayText(s.shiftDate)} · {dur(s.plannedMinutes)}</span>
                </div>
              ))}
            </div>
          )}

          <h2 className="wsp-section">Lịch sử ca làm</h2>
          <form className="wsp-filters" onSubmit={(e) => { e.preventDefault(); setPage(1); setFilters(form); }}>
            <label>Trạng thái
              <select value={form.status} onChange={set('status')}>
                <option value="">Tất cả</option>
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label>Từ ngày<input type="date" value={form.from} onChange={set('from')} /></label>
            <label>Đến ngày<input type="date" value={form.to} onChange={set('to')} /></label>
            <button type="submit" className="wsp-btn">Lọc</button>
            <button type="button" className="wsp-btn ghost" onClick={() => { setForm(EMPTY); setFilters(EMPTY); setPage(1); }}>Xóa lọc</button>
          </form>
          {error && <div className="wsp-banner error"><strong>{error}</strong></div>}
          <div className="wsp-card wsp-table-wrap">
            {data.items.length === 0 ? <div className="wsp-state"><h3>Không có ca làm phù hợp</h3><p>Hãy thử thay đổi bộ lọc.</p></div> : (
              <table className="wsp-table">
                <thead><tr><th>Ngày</th><th>Ca</th><th>Vào ca</th><th>Ra ca</th><th>Thời gian làm</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {data.items.map((s) => (
                    <tr key={s._id}>
                      <td>{dayText(s.shiftDate)}</td>
                      <td>{s.startTime} – {s.endTime}</td>
                      <td>{hm(s.clockInAt)}{s.late && <> <span className="wsp-chip warn">Trễ {s.lateMinutes}p</span></>}</td>
                      <td>{hm(s.clockOutAt)}{s.earlyLeave && <> <span className="wsp-chip warn">Ra sớm</span></>}</td>
                      <td>{dur(s.workedMinutes)}</td>
                      <td><Chip status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="wsp-pager">
            <button type="button" className="wsp-btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button>
            <span>Trang {page} / {totalPages}</span>
            <button type="button" className="wsp-btn ghost sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau</button>
          </div>
        </>
      )}
    </section>
  );
}
