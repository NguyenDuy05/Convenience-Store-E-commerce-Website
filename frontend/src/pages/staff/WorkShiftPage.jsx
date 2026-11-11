import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyShifts, clockIn, clockOut, listOpenSlots, claimSlot, releaseShift } from '../../api/workShift.api';
import '../../styles/work-shift.css';

const LIMIT = 10;
const STATUS_LABEL = { scheduled: "Upcoming", in_progress: "In progress", completed: "Completed", missed: "Missed shift" };
// Định dạng giờ:phút
const hm = (d) => (d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—');
// Định dạng ngày kèm thứ
const dayText = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
// Đổi số phút thành "8h 00m"
const dur = (min) => (min == null ? '—' : `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`);
const EMPTY = { status: '', from: '', to: '' };
// Định dạng tiền VND
const vnd = (v) => `${Math.round(v || 0).toLocaleString('vi-VN')} ₫`;

// Nhãn trạng thái ca
const Chip = ({ status }) => <span className={`wsp-chip ${status}`}>{STATUS_LABEL[status] || status}</span>;

// UC-24 Nhân viên nhận ca, vào / ra ca, xem lịch sử và thu nhập
export default function WorkShiftPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [clock, setClock] = useState(new Date());
  const [openSlots, setOpenSlots] = useState(null);

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    const params = { page, limit: LIMIT };
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    return listMyShifts(params)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load your shifts. Please try again."))
      .finally(() => setLoading(false));
  }, [filters, page]);

  const loadOpen = useCallback(() => listOpenSlots({ days: 14 }).then((r) => setOpenSlots(r.data)).catch(() => setOpenSlots({ items: [], error: true })), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadOpen(); }, [loadOpen]);
  useEffect(() => {
    const t = setInterval(() => { setClock(new Date()); }, 30000);
    const r = setInterval(() => { load(true); loadOpen(); }, 60000);
    return () => { clearInterval(t); clearInterval(r); };
  }, [load, loadOpen]);

  const act = (fn, shift, okTitle) => {
    setBusy(true);
    setNotice(null);
    fn({ shiftId: shift._id })
      .then((res) => setNotice({ type: 'success', title: res.data.message, text: `Recorded at: ${hm(new Date())}` }))
      .catch((err) => setNotice({ type: 'error', title: "Could not complete", text: err.response?.data?.message || `${okTitle} failed. Check the shift status before trying again.` }))
      .finally(() => { setBusy(false); load(true); });
  };
  const slotAct = (fn, okTitle, okText) => {
    setBusy(true); setNotice(null);
    fn().then(() => setNotice({ type: 'success', title: okTitle, text: okText }))
      .catch((err) => setNotice({ type: 'error', title: 'Could not complete', text: err.response?.data?.message || 'Please refresh and try again.' }))
      .finally(() => { setBusy(false); load(true); loadOpen(); });
  };
  const take = (slot) => slotAct(() => claimSlot(slot._id), 'Shift taken', `${dayText(slot.shiftDate)} · ${slot.startTime} – ${slot.endTime}. It now appears in your upcoming shifts.`);
  const release = (shiftId, label) => { if (!window.confirm(`Cancel your shift ${label}? The place will open for other staff.`)) return; slotAct(() => releaseShift(shiftId), 'Shift cancelled', label); };
  const onClockOut = (shift) => {
    if (new Date(shift.endAt) > new Date() && !window.confirm("This shift has not ended. Are you sure you want to check out early?")) return;
    act(clockOut, shift, 'Check out');
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const totalPages = Math.max(Math.ceil((data?.total || 0) / LIMIT), 1);
  const cur = data?.current;

  return (
    <section className="wsp">
      <nav className="wsp-crumb" aria-label="Breadcrumb">
        <Link to="/staff">Staff</Link><span>›</span><span aria-current="page">Work shifts</span>
      </nav>
      <div className="wsp-head">
        <div>
          <h1>Work shifts</h1>
          <p>Pick the shifts you want to work, then check in and check out. Times are recorded by the system.</p>
        </div>
        <div className="wsp-now"><strong>{hm(clock)}</strong>{clock.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: '2-digit' })}</div>
      </div>

      {notice && <div className={`wsp-banner ${notice.type}`} role="alert"><strong>{notice.title}</strong><span>{notice.text}</span></div>}
      {data?.earnings && <div className="wsp-earn">
        <div><span>Earnings this month</span><strong>{vnd(data.earnings.amount)}</strong><small>{data.earnings.shifts} shift{data.earnings.shifts === 1 ? '' : 's'} · {dur(data.earnings.dayMinutes)} day · {dur(data.earnings.nightMinutes)} night</small></div>
        {data.rates && <p>Pay: <b>{vnd(data.rates.day)}/h</b> 06:00–22:00 · <b>{vnd(data.rates.night)}/h</b> 22:00–06:00. Only time worked inside the shift counts.</p>}
      </div>}

      {loading && !data ? <div className="wsp-skeleton" /> : error && !data ? (
        <div className="wsp-card wsp-state"><h3>Could not load shifts</h3><p>{error}</p><button type="button" className="wsp-btn" onClick={() => load()}>Try again</button></div>
      ) : data && (
        <>
          <h2 className="wsp-section" style={{ marginTop: 8 }}>Current shift</h2>
          {cur ? (
            <div className={`wsp-card wsp-current${cur.status === 'in_progress' ? ' active' : ''}`}>
              <div className="wsp-current-main">
                <div><Chip status={cur.status} />{cur.late && <> <span className="wsp-chip warn">Late by {cur.lateMinutes} minutes</span></>}{cur.overdue && <> <span className="wsp-chip warn">Past the shift end time</span></>}</div>
                <div className="wsp-time">{cur.startTime} – {cur.endTime}</div>
                <div className="wsp-sub">{dayText(cur.shiftDate)} · {dur(cur.plannedMinutes)}{cur.clockInAt ? ` · Checked in at ${hm(cur.clockInAt)}` : ''}</div>
                {!cur.actions.canClockIn && !cur.actions.canClockOut && cur.actions.reason && <div className="wsp-reason">{cur.actions.reason}</div>}
              </div>
              {cur.actions.canClockIn && <button type="button" className="wsp-btn" disabled={busy} onClick={() => act(clockIn, cur, "Check in")}>{busy ? "Processing..." : "Check in"}</button>}
              {cur.actions.canClockOut && <button type="button" className="wsp-btn out" disabled={busy} onClick={() => onClockOut(cur)}>{busy ? "Processing..." : 'Check out'}</button>}
            </div>
          ) : (
            <div className="wsp-card wsp-state"><h3>No shifts available for check-in</h3><p>Check-in opens 30 minutes before the shift starts. Upcoming shifts are listed below.</p></div>
          )}

          <h2 className="wsp-section">Open shifts <small>· pick the shifts you want to work (next 14 days)</small></h2>
          {!openSlots ? <div className="wsp-card wsp-state">Loading open shifts…</div> : openSlots.error ? <div className="wsp-card wsp-state">Could not load open shifts.</div> : !openSlots.items.length ? (
            <div className="wsp-card wsp-state"><h3>No open shifts right now</h3><p>Your manager has not opened any shifts for the next 14 days.</p></div>
          ) : (
            <div className="wsp-open">
              {openSlots.items.map((s) => {
                const left = s.capacity - s.filled;
                const label = `${dayText(s.shiftDate)} ${s.startTime} – ${s.endTime}`;
                return (
                  <div className={`wsp-slot${s.mine ? ' mine' : ''}${!s.mine && (s.full || s.conflict) ? ' off' : ''}`} key={s._id}>
                    <div>
                      <b>{s.startTime} – {s.endTime}</b>
                      <span className="wsp-sub">{dayText(s.shiftDate)} · {dur(s.plannedMinutes)}{s.note ? ` · ${s.note}` : ''}</span>
                      <span className="wsp-seats">{s.filled}/{s.capacity} taken{!s.full && !s.mine ? ` · ${left} place${left === 1 ? '' : 's'} left` : ''}</span>
                      <span className="wsp-pay">≈ {vnd(s.estimatedPay?.amount)}{s.estimatedPay?.nightMinutes > 0 ? ' · includes night rate' : ''}</span>
                    </div>
                    {s.mine ? (
                      <div className="wsp-slot-act"><span className="wsp-chip completed">You're on this shift</span>
                        {s.mine.canRelease ? <button type="button" className="wsp-btn ghost sm" disabled={busy} onClick={() => release(s.mine.shiftId, label)}>Cancel</button>
                          : <small>Cancel at least {openSlots.releaseHours} h before start</small>}</div>
                    ) : s.full ? <span className="wsp-chip">Full</span>
                      : s.conflict ? <span className="wsp-chip warn">Overlaps your shift</span>
                        : <button type="button" className="wsp-btn sm" disabled={busy} onClick={() => take(s)}>{busy ? '…' : 'Take shift'}</button>}
                  </div>
                );
              })}
            </div>
          )}

          <h2 className="wsp-section">Upcoming shifts</h2>
          {data.upcoming.length === 0 ? <div className="wsp-card wsp-state">You have no upcoming shifts.</div> : (
            <div className="wsp-upcoming">
              {data.upcoming.map((s) => (
                <div className="wsp-shift" key={s._id}>
                  <Chip status={s.status} />
                  <b>{s.startTime} – {s.endTime}</b>
                  <span className="wsp-sub">{dayText(s.shiftDate)} · {dur(s.plannedMinutes)}</span>
                  {s.canRelease && <button type="button" className="wsp-btn ghost sm" disabled={busy} onClick={() => release(s._id, `${dayText(s.shiftDate)} ${s.startTime} – ${s.endTime}`)}>Cancel</button>}
                </div>
              ))}
            </div>
          )}

          <h2 className="wsp-section">Shift history</h2>
          <form className="wsp-filters" onSubmit={(e) => { e.preventDefault(); setPage(1); setFilters(form); }}>
            <label>Status
              <select value={form.status} onChange={set('status')}>
                <option value="">All</option>
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label>From date<input type="date" value={form.from} onChange={set('from')} /></label>
            <label>To date<input type="date" value={form.to} onChange={set('to')} /></label>
            <button type="submit" className="wsp-btn">Filter</button>
            <button type="button" className="wsp-btn ghost" onClick={() => { setForm(EMPTY); setFilters(EMPTY); setPage(1); }}>Clear filters</button>
          </form>
          {error && <div className="wsp-banner error"><strong>{error}</strong></div>}
          <div className="wsp-card wsp-table-wrap">
            {data.items.length === 0 ? <div className="wsp-state"><h3>No matching shifts</h3><p>Try changing the filters.</p></div> : (
              <table className="wsp-table">
                <thead><tr><th>Date</th><th>Shift</th><th>Check in</th><th>Check out</th><th>Working hours</th><th>Pay</th><th>Status</th></tr></thead>
                <tbody>
                  {data.items.map((s) => (
                    <tr key={s._id}>
                      <td>{dayText(s.shiftDate)}</td>
                      <td>{s.startTime} – {s.endTime}</td>
                      <td>{hm(s.clockInAt)}{s.late && <> <span className="wsp-chip warn">Late {s.lateMinutes} min</span></>}</td>
                      <td>{hm(s.clockOutAt)}{s.earlyLeave && <> <span className="wsp-chip warn">Left early</span></>}</td>
                      <td>{dur(s.workedMinutes)}</td>
                      <td>{s.pay ? vnd(s.pay.amount) : s.status === 'missed' ? vnd(0) : `≈ ${vnd(s.estimatedPay)}`}</td>
                      <td><Chip status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="wsp-pager">
            <button type="button" className="wsp-btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page} / {totalPages}</span>
            <button type="button" className="wsp-btn ghost sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
    </section>
  );
}
