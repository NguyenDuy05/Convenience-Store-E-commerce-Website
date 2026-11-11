// UC-24 Manage Work Shift (Staff): xem ca làm của mình + vào ca / ra ca.
// Report (BR-35) ghi chính sách ca làm còn TBD, nên CHỈ làm các thao tác mô hình dữ liệu hiện hỗ trợ:
//   xem lịch/chi tiết ca, vào ca, ra ca. Không làm đăng ký ca, đổi ca, nghỉ giải lao, tăng ca, duyệt ca (BR-41/42).
// Giờ ca (startTime/endTime "HH:mm") được hiểu theo múi giờ của máy chủ.
const mongoose = require('mongoose');
const { WorkShift, ActivityLog, ShiftSlot } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { RATES, payFor } = require('../config/payroll');
const ApiError = require('../utils/ApiError');

const CLOCK_IN_EARLY_MIN = 30;   // cho phép vào ca sớm tối đa 30 phút (giả định, report chưa quy định)
const LATE_GRACE_MIN = 15;       // vào trễ quá 15 phút được đánh dấu "trễ" (chỉ để hiển thị)
const MIN = 60 * 1000;
const STATUSES = ['scheduled', 'in_progress', 'completed', 'missed'];

function shiftTimes(s) {
  const at = (hhmm) => { const d = new Date(s.shiftDate); const [h, m] = String(hhmm).split(':').map(Number); d.setHours(h || 0, m || 0, 0, 0); return d; };
  const startAt = at(s.startTime);
  let endAt = at(s.endTime);
  if (endAt <= startAt) endAt = new Date(endAt.getTime() + 24 * 60 * MIN);   // ca qua đêm
  return { startAt, endAt };
}

// Thêm giờ thực tế + các hành động hợp lệ (server quyết định, giao diện không tự suy ra)
function enrich(shift, now, hasOtherInProgress = false) {
  const s = shift.toObject ? shift.toObject() : shift;
  const { startAt, endAt } = shiftTimes(s);
  const actions = { canClockIn: false, canClockOut: false, reason: null };
  if (s.status === 'scheduled') {
    if (now < new Date(startAt.getTime() - CLOCK_IN_EARLY_MIN * MIN)) actions.reason = `Check-in is not open yet (up to ${CLOCK_IN_EARLY_MIN} minutes early)`;
    else if (now >= endAt) actions.reason = "This shift has ended";
    else if (hasOtherInProgress) actions.reason = "You are checked in to another shift. Please check out first";
    else actions.canClockIn = true;
  } else if (s.status === 'in_progress') {
    actions.canClockOut = true;
  } else if (s.status === 'missed') actions.reason = "This shift was missed";
  const lateMinutes = s.clockInAt ? Math.max(0, Math.floor((new Date(s.clockInAt) - startAt) / MIN)) : 0;
  return {
    _id: s._id, shiftDate: s.shiftDate, startTime: s.startTime, endTime: s.endTime, status: s.status, note: s.note,
    slotId: s.slotId || null, canRelease: !!s.slotId && s.status === 'scheduled' && startAt - now >= 12 * 60 * MIN,
    startAt, endAt, plannedMinutes: Math.round((endAt - startAt) / MIN),
    clockInAt: s.clockInAt, clockOutAt: s.clockOutAt,
    workedMinutes: s.clockInAt && s.clockOutAt ? Math.round((new Date(s.clockOutAt) - new Date(s.clockInAt)) / MIN) : null,
    late: lateMinutes > LATE_GRACE_MIN, lateMinutes,
    // Lương: chỉ phần làm thật nằm trong giờ ca. estimatedPay = nếu làm đủ ca theo lịch.
    pay: s.clockInAt && s.clockOutAt ? payFor(new Date(Math.max(new Date(s.clockInAt), startAt)), new Date(Math.min(new Date(s.clockOutAt), endAt))) : null,
    estimatedPay: payFor(startAt, endAt).amount,
    earlyLeave: !!s.clockOutAt && new Date(s.clockOutAt) < endAt,
    overdue: s.status === 'in_progress' && now > endAt,   // quá giờ kết thúc mà chưa ra ca
    actions,
  };
}

// Ca 'scheduled' đã qua giờ kết thúc mà chưa vào ca -> 'missed' (cập nhật có điều kiện, an toàn khi gọi lặp)
async function markMissed(staffId, now) {
  const stale = await WorkShift.find({ staffId, status: 'scheduled', shiftDate: { $lte: now } });
  for (const s of stale) {
    if (shiftTimes(s).endAt <= now) await WorkShift.updateOne({ _id: s._id, status: 'scheduled' }, { $set: { status: 'missed' } });
  }
}

const parseDate = (v, name, endOfDay) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, `Date "${name}" is invalid`);
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(v)) d.setHours(23, 59, 59, 999);
  return d;
};

// UC-24 (24.1, 24.2): ca hiện tại, ca sắp tới và lịch sử ca của chính nhân viên đang đăng nhập
exports.listMyShifts = asyncHandler(async (req, res) => {
  const staffId = req.user.id;
  const now = new Date();
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  const { status } = req.query;
  if (status && !STATUSES.includes(status)) throw new ApiError(400, "Invalid shift status");
  const from = parseDate(req.query.from, "from date", false);
  const to = parseDate(req.query.to, "to date", true);
  if (from && to && from > to) throw new ApiError(400, "Invalid date range: the start date must be before the end date");

  await markMissed(staffId, now);

  const filter = { staffId };
  if (status) filter.status = status;
  if (from || to) filter.shiftDate = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

  const [items, total, inProgress, scheduled] = await Promise.all([
    WorkShift.find(filter).sort({ shiftDate: -1, startTime: -1 }).skip((page - 1) * limit).limit(limit),
    WorkShift.countDocuments(filter),
    WorkShift.findOne({ staffId, status: 'in_progress' }),
    WorkShift.find({ staffId, status: 'scheduled', shiftDate: { $gte: new Date(now.getTime() - 2 * 24 * 60 * MIN) } }).sort({ shiftDate: 1, startTime: 1 }).limit(30),
  ]);
  const hasInProgress = !!inProgress;
  const upcomingAll = scheduled.filter((s) => shiftTimes(s).endAt > now).map((s) => enrich(s, now, hasInProgress));
  // Ca hiện tại: ca đang làm; nếu không có thì ca đã/đang đến giờ vào ca (nằm trong khung cho phép)
  const current = inProgress ? enrich(inProgress, now, false) : (upcomingAll.find((s) => s.actions.canClockIn) || null);
  const upcoming = upcomingAll.filter((s) => !current || String(s._id) !== String(current._id)).slice(0, 7);

  // Thu nhập tháng này (ca đã chấm công vào/ra) — chỉ của chính nhân viên
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthShifts = await WorkShift.find({ staffId, shiftDate: { $gte: new Date(monthStart.getTime() - 24 * 60 * MIN) }, clockOutAt: { $exists: true } }).lean();
  const earnings = monthShifts.map((s) => enrich(s, now)).filter((v) => v.pay && v.endAt >= monthStart)
    .reduce((t, v) => ({ amount: t.amount + v.pay.amount, dayMinutes: t.dayMinutes + v.pay.dayMinutes, nightMinutes: t.nightMinutes + v.pay.nightMinutes, shifts: t.shifts + 1 }), { amount: 0, dayMinutes: 0, nightMinutes: 0, shifts: 0 });
  res.json({ now, current, upcoming, items: items.map((s) => enrich(s, now, hasInProgress)), total, page, limit, rates: RATES, earnings: { ...earnings, month: monthStart } });
});

async function loadOwnShift(req) {
  const { shiftId } = req.body || {};
  if (!mongoose.isValidObjectId(shiftId)) throw new ApiError(400, "Select a valid shift");
  const shift = await WorkShift.findById(shiftId);
  if (!shift) throw new ApiError(404, "Shift not found");
  if (String(shift.staffId) !== String(req.user.id)) throw new ApiError(403, "You do not have permission to manage this shift");   // 24.0.E1
  return shift;
}
const logAction = (req, action, shift) =>
  ActivityLog.create({ actorId: req.user.id, actorRole: 'staff', action, targetType: 'WorkShift', targetId: shift._id, ip: req.ip, detail: { startTime: shift.startTime, endTime: shift.endTime } })
    .catch(() => {});   // lỗi ghi nhật ký không được làm hỏng thao tác chính

// UC-24 (24.3-24.6): vào ca. Chặn trùng/xung đột (24.0.E2): gửi lại khi ca đã vào rồi chỉ trả về trạng thái hiện tại.
exports.clockIn = asyncHandler(async (req, res) => {
  const now = new Date();
  const shift = await loadOwnShift(req);
  const other = await WorkShift.findOne({ staffId: req.user.id, status: 'in_progress', _id: { $ne: shift._id } });
  const view = enrich(shift, now, !!other);
  if (shift.status !== 'scheduled' || !view.actions.canClockIn) {
    const message = shift.status === 'in_progress' ? "You have already checked in to this shift" : (view.actions.reason || `Cannot check in to a shift with status "${shift.status}"`);
    return res.status(409).json({ message, shift: view });
  }
  const updated = await WorkShift.findOneAndUpdate(
    { _id: shift._id, staffId: req.user.id, status: 'scheduled' },
    { $set: { status: 'in_progress', clockInAt: now } }, { new: true });
  if (!updated) {   // có yêu cầu khác vừa vào ca trước (bấm đúp / mạng chậm)
    const cur = await WorkShift.findById(shift._id);
    return res.status(409).json({ message: "You have already checked in to this shift", shift: enrich(cur, now, false) });
  }
  await logAction(req, 'SHIFT_CLOCK_IN', updated);
  const v = enrich(updated, now, false);
  res.json({ message: v.late ? `Checked in (late by ${v.lateMinutes} minutes)` : "Checked in", shift: v });
});

// UC-24: ra ca. Chỉ ra ca khi đang trong ca; ra sớm vẫn được ghi nhận và đánh dấu ra sớm.
exports.clockOut = asyncHandler(async (req, res) => {
  const now = new Date();
  const shift = await loadOwnShift(req);
  if (shift.status !== 'in_progress') {
    const message = shift.status === 'completed' ? "You have already checked out of this shift" : "You must check in before checking out";
    return res.status(409).json({ message, shift: enrich(shift, now, false) });
  }
  const updated = await WorkShift.findOneAndUpdate(
    { _id: shift._id, staffId: req.user.id, status: 'in_progress' },
    { $set: { status: 'completed', clockOutAt: now } }, { new: true });
  if (!updated) {
    const cur = await WorkShift.findById(shift._id);
    return res.status(409).json({ message: "You have already checked out of this shift", shift: enrich(cur, now, false) });
  }
  await logAction(req, 'SHIFT_CLOCK_OUT', updated);
  const v = enrich(updated, now, false);
  res.json({ message: v.earlyLeave ? "Checked out early" : "Checked out", shift: v });
});

// ======================= ADMIN: Manage Work Shifts =======================
// Admin xếp ca cho nhân viên, xem lịch + chấm công của mọi người, sửa / hủy ca chưa bắt đầu,
// và xem tổng hợp giờ làm theo khoảng ngày. Staff vẫn tự vào ca / ra ca ở UC-24.
const { User } = require('../models');
const { logActivity } = require('../services/activity.service');

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_DATES = 31;
// "YYYY-MM-DD" -> 00:00 theo giờ máy chủ (cùng quy ước với shiftTimes / seed)
const dayOf = (s, name = 'Shift date') => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) throw new ApiError(400, `${name} is invalid (use YYYY-MM-DD)`);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getMonth() !== Number(m[2]) - 1) throw new ApiError(400, `${name} is invalid`);
  return d;
};
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Ca trùng giờ của cùng nhân viên (tính cả ca qua đêm); bỏ qua ca đang sửa
async function findOverlap(staffId, startAt, endAt, excludeId) {
  // shiftDate là 00:00 của ngày bắt đầu ca -> lùi 2 ngày để không sót ca đêm của hôm trước
  const from = new Date(startAt.getTime() - 48 * 60 * MIN), to = new Date(endAt.getTime() + 24 * 60 * MIN);
  const near = await WorkShift.find({ staffId, shiftDate: { $gte: from, $lte: to }, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }).lean();
  return near.find((s) => { const t = shiftTimes(s); return t.startAt < endAt && startAt < t.endAt; }) || null;
}

function readShiftBody(body, { partial } = {}) {
  const out = {};
  if (!partial || body.startTime !== undefined) { if (!HHMM.test(String(body.startTime || ''))) throw new ApiError(400, 'Start time is invalid (HH:mm)'); out.startTime = body.startTime; }
  if (!partial || body.endTime !== undefined) { if (!HHMM.test(String(body.endTime || ''))) throw new ApiError(400, 'End time is invalid (HH:mm)'); out.endTime = body.endTime; }
  if (out.startTime && out.endTime && out.startTime === out.endTime) throw new ApiError(400, 'Start and end time must be different');
  if (body.note !== undefined) {
    if (typeof body.note !== 'string' || body.note.length > 300) throw new ApiError(400, 'Note must be at most 300 characters');
    out.note = body.note.trim();
  }
  return out;
}

const withStaff = (view, staff) => ({ ...view, staff: staff ? { _id: staff._id, fullName: staff.fullName, employeeCode: staff.staffInfo?.employeeCode || '' } : null });

// GET /api/work-shifts?from=&to=&staffId=&status=&page=&limit=
exports.listShifts = asyncHandler(async (req, res) => {
  const now = new Date();
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const { status, staffId } = req.query;
  if (status && !STATUSES.includes(status)) throw new ApiError(400, 'Invalid shift status');
  if (staffId && !mongoose.isValidObjectId(staffId)) throw new ApiError(400, 'Invalid staff member');
  const from = req.query.from ? dayOf(req.query.from, 'From date') : null;
  const to = req.query.to ? new Date(dayOf(req.query.to, 'To date').getTime() + 24 * 60 * MIN - 1) : null;
  if (from && to && from > to) throw new ApiError(400, 'Invalid date range: the start date must be before the end date');

  // Ca đã qua giờ mà chưa vào -> missed (cho mọi nhân viên có ca trong phạm vi)
  const staleOwners = await WorkShift.distinct('staffId', { status: 'scheduled', shiftDate: { $lte: now } });
  for (const id of staleOwners) await markMissed(id, now);

  const filter = {};
  if (staffId) filter.staffId = staffId;
  if (status) filter.status = status;
  if (from || to) filter.shiftDate = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

  const [docs, total, all] = await Promise.all([
    WorkShift.find(filter).sort({ shiftDate: 1, startTime: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    WorkShift.countDocuments(filter),
    WorkShift.find(filter).lean(),   // để tổng hợp theo nhân viên (trong phạm vi lọc)
  ]);
  const ids = [...new Set(all.map((s) => String(s.staffId)))];
  const staff = await User.find({ _id: { $in: ids } }).select('fullName staffInfo').lean();
  const byId = new Map(staff.map((u) => [String(u._id), u]));

  const summary = new Map();
  for (const s of all) {
    const v = enrich(s, now);
    const k = String(s.staffId);
    const row = summary.get(k) || { staff: withStaff({}, byId.get(k)).staff, shifts: 0, plannedMinutes: 0, workedMinutes: 0, completed: 0, missed: 0, late: 0, earlyLeave: 0, inProgress: 0, paidDayMinutes: 0, paidNightMinutes: 0, pay: 0 };
    if (v.pay) { row.paidDayMinutes += v.pay.dayMinutes; row.paidNightMinutes += v.pay.nightMinutes; row.pay += v.pay.amount; }
    row.shifts += 1; row.plannedMinutes += v.plannedMinutes; row.workedMinutes += v.workedMinutes || 0;
    if (s.status === 'completed') row.completed += 1;
    if (s.status === 'missed') row.missed += 1;
    if (s.status === 'in_progress') row.inProgress += 1;
    if (v.late) row.late += 1;
    if (v.earlyLeave) row.earlyLeave += 1;
    summary.set(k, row);
  }
  res.json({
    now, total, page, limit, rates: RATES,
    items: docs.map((s) => withStaff(enrich(s, now), byId.get(String(s.staffId)))),
    summary: [...summary.values()].sort((a, b) => (a.staff?.fullName || '').localeCompare(b.staff?.fullName || '')),
  });
});

// ---------- Ca trống (admin mở, nhân viên tự nhận) ----------
const RELEASE_HOURS = 12;   // nhân viên tự hủy đăng ký được nếu còn >= 12 giờ trước giờ bắt đầu ca
const MAX_CAPACITY = 20;

function readCapacity(v) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > MAX_CAPACITY) throw new ApiError(400, `Staff needed must be a whole number from 1 to ${MAX_CAPACITY}`);
  return n;
}

// Gom các lượt đăng ký (WorkShift) theo ca trống
async function signupsFor(slotIds) {
  const rows = await WorkShift.find({ slotId: { $in: slotIds } }).lean();
  const users = await User.find({ _id: { $in: [...new Set(rows.map((r) => String(r.staffId)))] } }).select('fullName staffInfo').lean();
  const uMap = new Map(users.map((u) => [String(u._id), u]));
  const by = new Map();
  rows.forEach((r) => {
    const k = String(r.slotId);
    if (!by.has(k)) by.set(k, []);
    const u = uMap.get(String(r.staffId));
    by.get(k).push({ shiftId: r._id, staffId: r.staffId, fullName: u?.fullName || 'Unknown', employeeCode: u?.staffInfo?.employeeCode || '', status: r.status });
  });
  return by;
}

function slotView(slot, signups, now, viewerId) {
  const { startAt, endAt } = shiftTimes(slot);
  const mine = viewerId ? signups.find((x) => String(x.staffId) === String(viewerId)) : null;
  return {
    _id: slot._id, shiftDate: slot.shiftDate, startTime: slot.startTime, endTime: slot.endTime, note: slot.note || '',
    startAt, endAt, plannedMinutes: Math.round((endAt - startAt) / MIN),
    capacity: slot.capacity, filled: slot.filled, full: slot.filled >= slot.capacity,
    estimatedPay: payFor(startAt, endAt),
    started: startAt <= now,
    ...(viewerId ? {
      mine: mine ? { shiftId: mine.shiftId, status: mine.status, canRelease: mine.status === 'scheduled' && startAt - now >= RELEASE_HOURS * 60 * MIN } : null,
    } : { staff: signups }),
  };
}

// GET /api/work-shifts/slots?from=&to=   (admin) — ca trống trong khoảng ngày + ai đã nhận
exports.listSlots = asyncHandler(async (req, res) => {
  const now = new Date();
  const from = req.query.from ? dayOf(req.query.from, 'From date') : (() => { const x = new Date(); x.setHours(0, 0, 0, 0); return x; })();
  const to = req.query.to ? new Date(dayOf(req.query.to, 'To date').getTime() + 24 * 60 * MIN - 1) : new Date(from.getTime() + 7 * 24 * 60 * MIN - 1);
  const slots = await ShiftSlot.find({ shiftDate: { $gte: from, $lte: to } }).sort({ shiftDate: 1, startTime: 1 }).lean();
  const by = await signupsFor(slots.map((s) => s._id));
  res.json({ now, items: slots.map((s) => slotView(s, by.get(String(s._id)) || [], now)) });
});

// POST /api/work-shifts/slots  body: { dates: ['YYYY-MM-DD'...], startTime, endTime, capacity, note? }  (admin)
exports.createSlots = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const fields = readShiftBody(body);
  const capacity = readCapacity(body.capacity);
  const dates = [...new Set((Array.isArray(body.dates) ? body.dates : []).map(String))];
  if (!dates.length) throw new ApiError(400, 'Choose at least one date');
  if (dates.length > MAX_DATES) throw new ApiError(400, `You can open at most ${MAX_DATES} days at a time`);
  const now = new Date();
  const rows = dates.map((s) => {
    const row = { shiftDate: dayOf(s), ...fields, capacity, createdBy: req.user.id };
    if (shiftTimes(row).startAt <= now) throw new ApiError(400, `This shift on ${s} has already started`);
    return row;
  });
  // Không mở trùng một ca y hệt (cùng ngày + giờ): tăng số người cần ở ca có sẵn thay vì tạo thêm
  const dup = await ShiftSlot.find({ $or: rows.map((r) => ({ shiftDate: r.shiftDate, startTime: r.startTime, endTime: r.endTime })) }).lean();
  if (dup.length) throw new ApiError(409, `A ${fields.startTime}–${fields.endTime} shift is already open on ${dup.map((x) => dayKey(x.shiftDate)).join(', ')}. Edit it to change the number of staff needed.`, { code: 'SLOT_EXISTS' });
  const created = await ShiftSlot.insertMany(rows);
  await logActivity(req, { action: 'SHIFT_SLOT_CREATE', targetType: 'ShiftSlot', targetId: created[0]._id, detail: { dates, startTime: fields.startTime, endTime: fields.endTime, capacity } });
  res.status(201).json({ items: created.map((s) => slotView(s.toObject(), [], now)) });
});

// PUT /api/work-shifts/slots/:id  body: { capacity?, note?, startTime?, endTime? }  (admin)
// Đổi giờ chỉ khi chưa ai nhận; số người cần không được nhỏ hơn số đã nhận.
exports.updateSlot = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, 'Shift not found');
  const slot = await ShiftSlot.findById(req.params.id);
  if (!slot) throw new ApiError(404, 'Shift not found');
  const now = new Date();
  if (shiftTimes(slot).startAt <= now) throw new ApiError(409, 'This shift has already started');
  const body = req.body || {};
  const fields = readShiftBody(body, { partial: true });
  const set = {};
  if (body.capacity !== undefined) set.capacity = readCapacity(body.capacity);
  if (fields.note !== undefined) set.note = fields.note;
  if (fields.startTime || fields.endTime) {
    if (slot.filled > 0) throw new ApiError(409, 'Staff have already taken this shift, so its hours cannot change. Remove them first or open a new shift.', { code: 'SLOT_TAKEN' });
    set.startTime = fields.startTime || slot.startTime; set.endTime = fields.endTime || slot.endTime;
    if (set.startTime === set.endTime) throw new ApiError(400, 'Start and end time must be different');
    if (shiftTimes({ shiftDate: slot.shiftDate, ...set }).startAt <= now) throw new ApiError(400, 'The new start time is already in the past');
  }
  const cond = { _id: slot._id, ...(set.capacity !== undefined ? { filled: { $lte: set.capacity } } : {}), ...(set.startTime ? { filled: 0 } : {}) };
  const updated = await ShiftSlot.findOneAndUpdate(cond, { $set: set }, { new: true }).lean();
  if (!updated) throw new ApiError(409, `${slot.filled} staff have already taken this shift. Staff needed cannot be lower than that.`, { code: 'SLOT_TAKEN' });
  await logActivity(req, { action: 'SHIFT_SLOT_UPDATE', targetType: 'ShiftSlot', targetId: slot._id, detail: set });
  const by = await signupsFor([slot._id]);
  res.json({ slot: slotView(updated, by.get(String(slot._id)) || [], now) });
});

// DELETE /api/work-shifts/slots/:id  (admin) — chỉ xóa ca chưa ai nhận
exports.deleteSlot = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, 'Shift not found');
  const slot = await ShiftSlot.findOneAndDelete({ _id: req.params.id, filled: 0 });
  if (!slot) {
    const exists = await ShiftSlot.exists({ _id: req.params.id });
    throw new ApiError(exists ? 409 : 404, exists ? 'Staff have taken this shift. Remove them first.' : 'Shift not found', { code: 'SLOT_TAKEN' });
  }
  await logActivity(req, { action: 'SHIFT_SLOT_DELETE', targetType: 'ShiftSlot', targetId: slot._id, detail: { date: dayKey(slot.shiftDate), startTime: slot.startTime, endTime: slot.endTime } });
  res.json({ message: 'Shift removed' });
});

// GET /api/work-shifts/open?days=14  (staff) — ca trống sắp tới để nhận
exports.listOpenSlots = asyncHandler(async (req, res) => {
  const now = new Date();
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 31);
  const from = new Date(now); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - 1);   // gồm ca đêm của hôm qua chưa bắt đầu
  const to = new Date(now.getTime() + days * 24 * 60 * MIN);
  const slots = (await ShiftSlot.find({ shiftDate: { $gte: from, $lte: to } }).sort({ shiftDate: 1, startTime: 1 }).lean())
    .filter((s) => shiftTimes(s).startAt > now);
  const by = await signupsFor(slots.map((s) => s._id));
  // Ca của chính nhân viên trong khoảng này -> đánh dấu ca trống bị trùng giờ
  const own = await WorkShift.find({ staffId: req.user.id, shiftDate: { $gte: new Date(from.getTime() - 24 * 60 * MIN), $lte: to } }).lean();
  const ownTimes = own.map((s) => ({ slotId: s.slotId ? String(s.slotId) : null, ...shiftTimes(s) }));
  res.json({
    now, releaseHours: RELEASE_HOURS, rates: RATES,
    items: slots.map((s) => {
      const v = slotView(s, by.get(String(s._id)) || [], now, req.user.id);
      const clash = !v.mine && ownTimes.some((t) => t.slotId !== String(s._id) && t.startAt < v.endAt && v.startAt < t.endAt);
      return { ...v, conflict: clash };
    }),
  });
});

// POST /api/work-shifts/slots/:id/claim  (staff) — nhận ca. Chống vượt số chỗ bằng tăng "filled" có điều kiện.
exports.claimSlot = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, 'Shift not found');
  const now = new Date();
  const slot = await ShiftSlot.findById(req.params.id).lean();
  if (!slot) throw new ApiError(404, 'Shift not found');
  const { startAt, endAt } = shiftTimes(slot);
  if (startAt <= now) throw new ApiError(409, 'This shift has already started', { code: 'SLOT_STARTED' });
  if (await WorkShift.exists({ slotId: slot._id, staffId: req.user.id })) throw new ApiError(409, 'You have already taken this shift', { code: 'ALREADY_TAKEN' });
  if (await findOverlap(req.user.id, startAt, endAt)) throw new ApiError(409, 'This shift overlaps another shift of yours', { code: 'SHIFT_OVERLAP' });
  const seat = await ShiftSlot.findOneAndUpdate({ _id: slot._id, $expr: { $lt: ['$filled', '$capacity'] } }, { $inc: { filled: 1 } }, { new: true });
  if (!seat) throw new ApiError(409, 'This shift is already full', { code: 'SLOT_FULL' });
  let shift;
  try {
    shift = await WorkShift.create({ staffId: req.user.id, slotId: slot._id, shiftDate: slot.shiftDate, startTime: slot.startTime, endTime: slot.endTime, note: slot.note, createdBy: req.user.id });
  } catch (e) {
    await ShiftSlot.updateOne({ _id: slot._id, filled: { $gt: 0 } }, { $inc: { filled: -1 } });   // trả lại chỗ
    if (e.code === 11000) throw new ApiError(409, 'You have already taken this shift', { code: 'ALREADY_TAKEN' });
    throw e;
  }
  await logAction(req, 'SHIFT_CLAIM', shift);
  res.status(201).json({ message: 'Shift taken', shift: enrich(shift, now) });
});

// POST /api/work-shifts/:id/release  (staff) — hủy nhận ca, còn >= RELEASE_HOURS giờ trước giờ bắt đầu
exports.releaseShift = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, 'Shift not found');
  const shift = await WorkShift.findOne({ _id: req.params.id, staffId: req.user.id });
  if (!shift) throw new ApiError(404, 'Shift not found');
  if (!shift.slotId) throw new ApiError(409, 'This shift was assigned by the store. Contact your manager to change it.');
  if (shift.status !== 'scheduled') throw new ApiError(409, 'Only upcoming shifts can be cancelled');
  if (shiftTimes(shift).startAt - Date.now() < RELEASE_HOURS * 60 * MIN) throw new ApiError(409, `Shifts can only be cancelled at least ${RELEASE_HOURS} hours before they start. Contact your manager.`, { code: 'TOO_LATE' });
  const removed = await WorkShift.findOneAndDelete({ _id: shift._id, status: 'scheduled' });
  if (!removed) throw new ApiError(409, 'This shift has just started. Refresh and try again.');
  await ShiftSlot.updateOne({ _id: shift.slotId, filled: { $gt: 0 } }, { $inc: { filled: -1 } });
  await logAction(req, 'SHIFT_RELEASE', shift);
  res.json({ message: 'Shift cancelled' });
});

// DELETE /api/work-shifts/:id — admin gỡ nhân viên khỏi ca chưa bắt đầu (ca đã chấm công giữ lại làm lịch sử)
exports.deleteShift = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, 'Shift not found');
  const shift = await WorkShift.findOneAndDelete({ _id: req.params.id, status: 'scheduled' });
  if (!shift) {
    const exists = await WorkShift.exists({ _id: req.params.id });
    throw new ApiError(exists ? 409 : 404, exists ? 'Shifts that have started or ended are kept as attendance history' : 'Shift not found');
  }
  if (shift.slotId) await ShiftSlot.updateOne({ _id: shift.slotId, filled: { $gt: 0 } }, { $inc: { filled: -1 } });   // trả chỗ cho ca trống
  await logActivity(req, { action: 'SHIFT_DELETE', targetType: 'WorkShift', targetId: shift._id, detail: { date: dayKey(shift.shiftDate), startTime: shift.startTime, endTime: shift.endTime, staffId: shift.staffId } });
  res.json({ message: 'Staff removed from the shift' });
});

// PATCH /api/work-shifts/:id/close — nhân viên quên ra ca: admin chốt giờ ra (mặc định = giờ kết thúc ca)
exports.closeShift = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, 'Shift not found');
  const shift = await WorkShift.findById(req.params.id);
  if (!shift) throw new ApiError(404, 'Shift not found');
  if (shift.status !== 'in_progress') throw new ApiError(409, 'Only a shift in progress can be closed');
  const { endAt } = shiftTimes(shift);
  const out = new Date(Math.min(Date.now(), endAt.getTime()));
  const note = typeof req.body?.note === 'string' && req.body.note.trim() ? req.body.note.trim().slice(0, 300) : 'Closed by admin (staff did not check out)';
  const updated = await WorkShift.findOneAndUpdate({ _id: shift._id, status: 'in_progress' }, { $set: { status: 'completed', clockOutAt: out, note } }, { new: true });
  if (!updated) throw new ApiError(409, 'This shift was just updated. Refresh and try again.');
  await logActivity(req, { action: 'SHIFT_CLOSE', targetType: 'WorkShift', targetId: shift._id, detail: { clockOutAt: out } });
  const staff = await User.findById(shift.staffId).select('fullName staffInfo').lean();
  res.json({ shift: withStaff(enrich(updated, new Date()), staff) });
});
