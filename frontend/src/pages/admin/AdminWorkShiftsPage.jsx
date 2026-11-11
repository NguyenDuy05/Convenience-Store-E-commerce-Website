import { useMemo, useState } from 'react';
import { closeShift, createSlots, deleteShift, deleteSlot, listShifts, listSlots, updateSlot } from '../../api/workShift.api';
import { listStaff } from '../../api/staff.api';
import { Badge, Confirm, Notice, Stat, d, dt, useAction, useFetch } from '../../components/admin/kit';
import '../../styles/admin-shifts.css';

const STATUS = { scheduled: ['Upcoming', 'muted'], in_progress: ['In progress', 'warn'], completed: ['Completed', 'ok'], missed: ['Missed', 'bad'] };
const PRESETS = [['Morning', '06:00', '14:00'], ['Afternoon', '14:00', '22:00'], ['Night', '22:00', '06:00']];
const HALF_PRESETS = [['06–10', '06:00', '10:00'], ['10–14', '10:00', '14:00'], ['14–18', '14:00', '18:00'], ['18–22', '18:00', '22:00'], ['22–02', '22:00', '02:00'], ['02–06', '02:00', '06:00']];
// Định dạng tiền VND
const vnd = (v) => `${Math.round(v || 0).toLocaleString('vi-VN')} ₫`;
const WEEKDAYS = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 0]];
// Thêm số 0 phía trước (5 → "05")
const pad = (n) => String(n).padStart(2, '0');
// Đổi Date thành "YYYY-MM-DD"
const ymd = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
// Cộng thêm n ngày
const addDays = (x, n) => { const r = new Date(x); r.setDate(r.getDate() + n); return r; };
// Thứ Hai đầu tuần của một ngày
const mondayOf = (x) => { const r = new Date(x); r.setHours(0, 0, 0, 0); r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); return r; };
// Đổi số phút thành giờ (vd "7.5 h")
const hours = (min) => `${(Math.round((min || 0) / 6) / 10).toLocaleString('en-US')} h`;
// Định dạng giờ:phút
const time = (v) => (v ? new Date(v).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—');

// Các ngày trong khoảng thuộc những thứ đã chọn
function datesBetween(from, to, days) {
  if (!from || !to) return [];
  const out = [];
  for (let x = new Date(`${from}T00:00:00`); x <= new Date(`${to}T00:00:00`) && out.length < 32; x = addDays(x, 1)) if (days.includes(x.getDay())) out.push(ymd(x));
  return out;
}

// Form mở ca trống cho nhiều ngày (giờ, số người cần, ghi chú)
function SlotCreator({ busy, error, onSave, onCancel, weekStart }) {
  const today = ymd(new Date());
  const start = ymd(weekStart) < today ? today : ymd(weekStart);
  const end = ymd(addDays(weekStart, 6)) < start ? start : ymd(addDays(weekStart, 6));
  const [f, setF] = useState({ from: start, to: end, startTime: '06:00', endTime: '14:00', capacity: 2, note: '' });
  const [days, setDays] = useState([1, 2, 3, 4, 5, 6, 0]);
  const [err, setErr] = useState('');
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr(''); };
  const dates = datesBetween(f.from, f.to, days);
  const submit = (e) => {
    e.preventDefault();
    const capacity = Number(f.capacity);
    if (!dates.length) return setErr('Choose at least one day in the date range.');
    if (dates.length > 31) return setErr('You can open at most 31 days at a time.');
    if (f.startTime === f.endTime) return setErr('Start and end time must be different.');
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) return setErr('Staff needed must be from 1 to 20.');
    onSave({ dates, startTime: f.startTime, endTime: f.endTime, capacity, note: f.note.trim() || undefined });
  };
  return <section className="pm-card" aria-labelledby="ws-new">
    <h2 id="ws-new">Open shifts</h2>
    <p>Create shifts and set how many staff each one needs. Staff pick the shifts they want in <b>Staff › Work shifts</b>. A shift ending at or before its start time runs overnight.</p>
    <form onSubmit={submit}><fieldset disabled={busy}>
      <div className="pm-form-grid three">
        <label>From<input type="date" min={today} value={f.from} onChange={set('from')} /></label>
        <label>To<input type="date" min={f.from || today} value={f.to} onChange={set('to')} /></label>
        <label>Staff needed per shift<input type="number" min="1" max="20" step="1" value={f.capacity} onChange={set('capacity')} /></label>
      </div>
      <div className="ws-days" role="group" aria-label="Days">{WEEKDAYS.map(([label, n]) => <label key={n} className={days.includes(n) ? 'on' : ''}><input type="checkbox" checked={days.includes(n)} onChange={() => setDays(days.includes(n) ? days.filter((x) => x !== n) : [...days, n])} />{label}</label>)}</div>
      <div className="ws-presets"><span>8-hour</span>{PRESETS.map(([label, s, e]) => <button type="button" key={label} className={f.startTime === s && f.endTime === e ? 'on' : ''} onClick={() => setF({ ...f, startTime: s, endTime: e })}>{label} {s}–{e}</button>)}</div>
      <div className="ws-presets"><span>4-hour</span>{HALF_PRESETS.map(([label, s, e]) => <button type="button" key={label} className={f.startTime === s && f.endTime === e ? 'on' : ''} onClick={() => setF({ ...f, startTime: s, endTime: e })}>{label}</button>)}</div>
      <div className="pm-form-grid three">
        <label>Start time<input type="time" value={f.startTime} onChange={set('startTime')} /></label>
        <label>End time<input type="time" value={f.endTime} onChange={set('endTime')} /></label>
        <label>Role / note (optional)<input value={f.note} maxLength={300} onChange={set('note')} placeholder="Cashier, stock receiving…" /></label>
      </div>
      <p className="pm-note">{dates.length ? `${dates.length} shift${dates.length === 1 ? '' : 's'} × ${f.capacity || 0} staff: ${dates.map((x) => d(`${x}T00:00:00`)).join(', ')}` : 'No days selected in this range.'}</p>
      {(err || error) && <p className="pm-error" role="alert">{err || error}</p>}
      <div className="pm-actions"><button className="pm-primary" type="submit">{busy ? 'Opening...' : `Open ${dates.length || ''} shift${dates.length === 1 ? '' : 's'}`}</button><button type="button" onClick={onCancel}>Cancel</button></div>
    </fieldset></form>
  </section>;
}

// Form sửa ca trống
function SlotEditor({ slot, busy, error, onSave, onCancel }) {
  const [f, setF] = useState({ capacity: slot.capacity, note: slot.note || '', startTime: slot.startTime, endTime: slot.endTime });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const taken = slot.filled > 0;
  return <section className="pm-card" aria-labelledby="ws-edit">
    <h2 id="ws-edit">Edit shift · {d(slot.shiftDate)} {slot.startTime}–{slot.endTime}</h2>
    <p>{taken ? `${slot.filled} staff have taken this shift: the hours are locked and staff needed cannot be lower than ${slot.filled}.` : 'No one has taken this shift yet.'}</p>
    <form onSubmit={(e) => { e.preventDefault(); onSave({ capacity: Number(f.capacity), note: f.note.trim(), ...(taken ? {} : { startTime: f.startTime, endTime: f.endTime }) }); }}><fieldset disabled={busy}>
      <div className="pm-form-grid three">
        <label>Staff needed<input type="number" min={Math.max(1, slot.filled)} max="20" value={f.capacity} onChange={set('capacity')} /></label>
        <label>Start time<input type="time" value={f.startTime} disabled={taken} onChange={set('startTime')} /></label>
        <label>End time<input type="time" value={f.endTime} disabled={taken} onChange={set('endTime')} /></label>
        <label>Role / note<input value={f.note} maxLength={300} onChange={set('note')} /></label>
      </div>
      {error && <p className="pm-error" role="alert">{error}</p>}
      <div className="pm-actions"><button className="pm-primary" type="submit">{busy ? 'Saving...' : 'Save shift'}</button><button type="button" onClick={onCancel}>Cancel</button></div>
    </fieldset></form>
  </section>;
}

// Admin quản lý ca làm: lịch tuần, ai đã nhận, chấm công, lương
export default function AdminWorkShiftsPage() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [staffId, setStaffId] = useState(''), [status, setStatus] = useState('');
  const [panel, setPanel] = useState(null);
  const range = useMemo(() => ({ from: ymd(weekStart), to: ymd(addDays(weekStart, 6)) }), [weekStart]);
  const slotsQ = useFetch(listSlots, range);
  const shiftsQ = useFetch(listShifts, { ...range, staffId: staffId || undefined, status: status || undefined, limit: 200 });
  const staffList = useFetch(listStaff, { status: 'active', limit: 100 });
  const staff = staffList.data?.items || [];
  const reloadAll = () => { slotsQ.reload(); shiftsQ.reload(); };
  const act = useAction(reloadAll);
  const run = async (op, notice) => { if (await act.run(op, notice)) setPanel(null); };
  const open = (p) => { act.setError(''); act.setSuccess(''); setPanel(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const slots = slotsQ.data?.items || [];
  const byDay = useMemo(() => {
    const m = new Map();
    for (let i = 0; i < 7; i += 1) m.set(ymd(addDays(weekStart, i)), []);
    slots.forEach((s) => { const k = ymd(new Date(s.shiftDate)); if (m.has(k)) m.get(k).push(s); });
    return m;
  }, [slots, weekStart]);
  const seats = slots.reduce((t, s) => ({ filled: t.filled + s.filled, capacity: t.capacity + s.capacity, short: t.short + (!s.started && !s.full ? 1 : 0) }), { filled: 0, capacity: 0, short: 0 });
  const data = shiftsQ.data;
  const items = data?.items || [];
  const totals = (data?.summary || []).reduce((t, r) => ({ worked: t.worked + r.workedMinutes, missed: t.missed + r.missed, late: t.late + r.late, pay: t.pay + r.pay }), { worked: 0, missed: 0, late: 0, pay: 0 });
  const rates = data?.rates;
  const todayKey = ymd(new Date());

  return <div className="pm-page">
    <header className="pm-heading"><div><span className="pm-eyebrow">STAFF</span><h1>Work Shifts</h1><p>Open shifts and set how many staff each needs. Staff choose their own shifts; follow who took them, their attendance and wages here.</p>{rates && <p className="ws-rates">Pay: <b>{vnd(rates.day)}/h</b> day (06:00–22:00) · <b>{vnd(rates.night)}/h</b> night (22:00–06:00) · only time worked within the shift is paid.</p>}</div>
      {panel?.type !== 'new' && <button className="pm-primary" onClick={() => open({ type: 'new' })}>+ Open shifts</button>}</header>
    <Notice success={act.success} error={!panel ? act.error : ''} />

    {panel?.type === 'new' && <SlotCreator weekStart={weekStart} busy={act.busy} error={act.error} onCancel={() => setPanel(null)}
      onSave={(body) => run(() => createSlots(body), `${body.dates.length} shift${body.dates.length === 1 ? '' : 's'} opened. Staff can now pick them.`)} />}
    {panel?.type === 'edit' && <SlotEditor slot={panel.slot} busy={act.busy} error={act.error} onCancel={() => setPanel(null)}
      onSave={(body) => run(() => updateSlot(panel.slot._id, body), 'Shift updated.')} />}
    {panel?.type === 'deleteSlot' && <Confirm title="Delete this open shift?" danger confirmLabel="Delete shift" busy={act.busy} error={act.error} onCancel={() => setPanel(null)}
      onConfirm={() => run(() => deleteSlot(panel.slot._id), 'Shift deleted.')}>{d(panel.slot.shiftDate)} · {panel.slot.startTime}–{panel.slot.endTime} · no one has taken it yet.</Confirm>}
    {panel?.type === 'remove' && <Confirm title="Remove staff from this shift?" danger confirmLabel="Remove" busy={act.busy} error={act.error} onCancel={() => setPanel(null)}
      onConfirm={() => run(() => deleteShift(panel.shift.shiftId || panel.shift._id), 'Staff removed. The place is open again for others.')}>{panel.shift.fullName || panel.shift.staff?.fullName} · {panel.label}. The place becomes available for other staff.</Confirm>}
    {panel?.type === 'close' && <Confirm title="Close this shift?" confirmLabel="Close shift" busy={act.busy} error={act.error} onCancel={() => setPanel(null)}
      onConfirm={() => run(() => closeShift(panel.shift._id, {}), 'Shift closed.')}>{panel.shift.staff?.fullName} did not check out. The check-out time is recorded as the scheduled end ({panel.shift.endTime}), or now if earlier.</Confirm>}

    <div className="ws-toolbar">
      <div className="ws-week"><button onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">‹</button><b>{d(weekStart)} – {d(addDays(weekStart, 6))}</b><button onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">›</button><button onClick={() => setWeekStart(mondayOf(new Date()))}>This week</button></div>
    </div>

    {slotsQ.loading && !slotsQ.data ? <p role="status">Loading shifts...</p> : slotsQ.error ? <p className="pm-error" role="alert">{slotsQ.error}</p> : <>
      <div className="pm-stats"><Stat label="Open shifts this week" value={slots.length} /><Stat label="Places taken" value={`${seats.filled} / ${seats.capacity}`} /><Stat label="Shifts still short of staff" value={seats.short} tone={seats.short ? 'warn' : ''} /><Stat label="Hours worked" value={hours(totals.worked)} /><Stat label="Wages this week" value={vnd(totals.pay)} /><Stat label="Late / missed" value={`${totals.late} / ${totals.missed}`} tone={totals.missed ? 'bad' : totals.late ? 'warn' : ''} /></div>

      <section className="ws-week-grid" aria-label="Week schedule">
        {[...byDay].map(([day, list]) => <div key={day} className={`ws-day ${day === todayKey ? 'today' : ''}`}>
          <header><b>{new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' })}</b><span>{new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span></header>
          {!list.length ? <p className="ws-empty">No shifts</p> : list.map((s) => <article key={s._id} className={`ws-slot ${s.full ? 'full' : s.started ? 'past' : 'short'}`}>
            <div className="ws-slot-top"><b>{s.startTime}–{s.endTime}</b><span className="ws-seats">{s.filled}/{s.capacity}</span></div>
            {s.note && <small>{s.note}</small>}
            <div className="ws-bar"><i style={{ width: `${Math.min(100, (s.filled / s.capacity) * 100)}%` }} /></div>
            <ul>{s.staff.map((p) => <li key={p.shiftId}><span title={STATUS[p.status]?.[0]} className={`ws-dot ${p.status}`} /><span className="ws-name" title={p.fullName}>{p.fullName}</span>{p.status === 'scheduled' && !s.started && <button className="ws-x" aria-label={`Remove ${p.fullName}`} onClick={() => open({ type: 'remove', shift: p, label: `${d(s.shiftDate)} ${s.startTime}–${s.endTime}` })}>×</button>}</li>)}
              {!s.started && s.filled < s.capacity && <li className="ws-open">{s.capacity - s.filled} place{s.capacity - s.filled === 1 ? '' : 's'} open</li>}</ul>
            {!s.started && <div className="ws-slot-actions"><button onClick={() => open({ type: 'edit', slot: s })}>Edit</button>{s.filled === 0 && <button onClick={() => open({ type: 'deleteSlot', slot: s })}>Delete</button>}</div>}
          </article>)}
        </div>)}
      </section>
    </>}

    <section className="pm-card"><div className="ws-card-head"><h2>Attendance</h2>
      <div className="ws-filters"><label>Staff<select value={staffId} onChange={(e) => setStaffId(e.target.value)}><option value="">All staff</option>{staff.map((s) => <option key={s._id} value={s._id}>{s.fullName}</option>)}</select></label>
        <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></label></div></div>
      {shiftsQ.loading && !data ? <p role="status">Loading attendance...</p> : shiftsQ.error ? <p className="pm-error" role="alert">{shiftsQ.error}</p> : !items.length ? <p className="pm-note">No staff have taken a shift this week{staffId || status ? ' for these filters' : ''}.</p> :
        <div className="pm-table-wrap"><table className="ws-table"><thead><tr><th>Date</th><th>Staff</th><th>Shift</th><th>Status</th><th>Check-in</th><th>Check-out</th><th className="pm-num">Worked</th><th className="pm-num">Pay</th><th>Notes</th><th>Actions</th></tr></thead><tbody>
          {items.map((s) => <tr key={s._id}>
            <td>{d(s.shiftDate)}</td>
            <td><strong>{s.staff?.fullName || '—'}</strong>{s.staff?.employeeCode && <small>{s.staff.employeeCode}</small>}</td>
            <td>{s.startTime}–{s.endTime}<small>{hours(s.plannedMinutes)}</small></td>
            <td><Badge tone={STATUS[s.status]?.[1]}>{STATUS[s.status]?.[0]}</Badge></td>
            <td>{time(s.clockInAt)}{s.late && <small className="ws-flag">Late {s.lateMinutes} min</small>}</td>
            <td>{time(s.clockOutAt)}{s.earlyLeave && <small className="ws-flag">Left early</small>}{s.overdue && <small className="ws-flag bad">Not checked out</small>}</td>
            <td className="pm-num">{s.workedMinutes != null ? hours(s.workedMinutes) : '—'}</td>
            <td className="pm-num">{s.pay ? <>{vnd(s.pay.amount)}{s.pay.nightMinutes > 0 && <small>{hours(s.pay.nightMinutes)} night</small>}</> : s.status === 'missed' ? vnd(0) : <small>≈ {vnd(s.estimatedPay)}</small>}</td>
            <td className="ws-note"><small>{s.note || ''}</small></td>
            <td className="ws-actions">
              {s.status === 'scheduled' && <button onClick={() => open({ type: 'remove', shift: s, label: `${d(s.shiftDate)} ${s.startTime}–${s.endTime}` })}>Remove</button>}
              {s.status === 'in_progress' && <button onClick={() => open({ type: 'close', shift: s })} title="Use when the staff member forgot to check out">Close shift</button>}
            </td>
          </tr>)}
        </tbody></table></div>}
    </section>

    {!!data?.summary?.length && <section className="pm-card"><h2>Hours by staff</h2>
      <div className="pm-table-wrap"><table><thead><tr><th>Staff</th><th className="pm-num">Shifts</th><th className="pm-num">Scheduled</th><th className="pm-num">Worked</th><th className="pm-num">Completed</th><th className="pm-num">Late</th><th className="pm-num">Left early</th><th className="pm-num">Missed</th><th className="pm-num">Paid day</th><th className="pm-num">Paid night</th><th className="pm-num">Wages</th></tr></thead><tbody>
        {data.summary.map((r) => <tr key={r.staff?._id}><td><strong>{r.staff?.fullName}</strong></td><td className="pm-num">{r.shifts}</td><td className="pm-num">{hours(r.plannedMinutes)}</td><td className="pm-num">{hours(r.workedMinutes)}</td><td className="pm-num">{r.completed}</td><td className="pm-num">{r.late}</td><td className="pm-num">{r.earlyLeave}</td><td className="pm-num">{r.missed}</td><td className="pm-num">{hours(r.paidDayMinutes)}</td><td className="pm-num">{hours(r.paidNightMinutes)}</td><td className="pm-num"><strong>{vnd(r.pay)}</strong></td></tr>)}
      </tbody></table></div>
      <p className="pm-note">Updated {dt(data.now)}. Wages count only time worked inside each shift (early check-in and staying late are not paid; late check-in and leaving early are deducted). Shifts not checked in by their end time are marked as missed automatically.</p>
    </section>}
  </div>;
}
