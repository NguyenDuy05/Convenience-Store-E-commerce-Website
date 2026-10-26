// UC-24 Manage Work Shift (Staff): xem ca làm của mình + vào ca / ra ca.
// Report (BR-35) ghi chính sách ca làm còn TBD, nên CHỈ làm các thao tác mô hình dữ liệu hiện hỗ trợ:
//   xem lịch/chi tiết ca, vào ca, ra ca. Không làm đăng ký ca, đổi ca, nghỉ giải lao, tăng ca, duyệt ca (BR-41/42).
// Giờ ca (startTime/endTime "HH:mm") được hiểu theo múi giờ của máy chủ.
const mongoose = require('mongoose');
const { WorkShift, ActivityLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
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
    if (now < new Date(startAt.getTime() - CLOCK_IN_EARLY_MIN * MIN)) actions.reason = `Chưa đến giờ vào ca (được vào sớm tối đa ${CLOCK_IN_EARLY_MIN} phút)`;
    else if (now >= endAt) actions.reason = 'Ca làm đã kết thúc';
    else if (hasOtherInProgress) actions.reason = 'Bạn đang trong một ca làm khác, hãy ra ca trước';
    else actions.canClockIn = true;
  } else if (s.status === 'in_progress') {
    actions.canClockOut = true;
  } else if (s.status === 'missed') actions.reason = 'Ca này đã bị lỡ (không vào ca)';
  const lateMinutes = s.clockInAt ? Math.max(0, Math.floor((new Date(s.clockInAt) - startAt) / MIN)) : 0;
  return {
    _id: s._id, shiftDate: s.shiftDate, startTime: s.startTime, endTime: s.endTime, status: s.status, note: s.note,
    startAt, endAt, plannedMinutes: Math.round((endAt - startAt) / MIN),
    clockInAt: s.clockInAt, clockOutAt: s.clockOutAt,
    workedMinutes: s.clockInAt && s.clockOutAt ? Math.round((new Date(s.clockOutAt) - new Date(s.clockInAt)) / MIN) : null,
    late: lateMinutes > LATE_GRACE_MIN, lateMinutes,
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
  if (Number.isNaN(d.getTime())) throw new ApiError(400, `Ngày "${name}" không hợp lệ`);
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
  if (status && !STATUSES.includes(status)) throw new ApiError(400, 'Trạng thái ca làm không hợp lệ');
  const from = parseDate(req.query.from, 'từ ngày', false);
  const to = parseDate(req.query.to, 'đến ngày', true);
  if (from && to && from > to) throw new ApiError(400, 'Khoảng ngày không hợp lệ: "từ ngày" phải trước "đến ngày"');

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

  res.json({ now, current, upcoming, items: items.map((s) => enrich(s, now, hasInProgress)), total, page, limit });
});

async function loadOwnShift(req) {
  const { shiftId } = req.body || {};
  if (!mongoose.isValidObjectId(shiftId)) throw new ApiError(400, 'Vui lòng chọn ca làm hợp lệ');
  const shift = await WorkShift.findById(shiftId);
  if (!shift) throw new ApiError(404, 'Không tìm thấy ca làm');
  if (String(shift.staffId) !== String(req.user.id)) throw new ApiError(403, 'Bạn không có quyền thao tác trên ca làm này');   // 24.0.E1
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
    const message = shift.status === 'in_progress' ? 'Ca làm này đã được vào ca trước đó' : (view.actions.reason || `Không thể vào ca khi ca đang ở trạng thái "${shift.status}"`);
    return res.status(409).json({ message, shift: view });
  }
  const updated = await WorkShift.findOneAndUpdate(
    { _id: shift._id, staffId: req.user.id, status: 'scheduled' },
    { $set: { status: 'in_progress', clockInAt: now } }, { new: true });
  if (!updated) {   // có yêu cầu khác vừa vào ca trước (bấm đúp / mạng chậm)
    const cur = await WorkShift.findById(shift._id);
    return res.status(409).json({ message: 'Ca làm này đã được vào ca trước đó', shift: enrich(cur, now, false) });
  }
  await logAction(req, 'SHIFT_CLOCK_IN', updated);
  const v = enrich(updated, now, false);
  res.json({ message: v.late ? `Đã vào ca (trễ ${v.lateMinutes} phút)` : 'Đã vào ca', shift: v });
});

// UC-24: ra ca. Chỉ ra ca khi đang trong ca; ra sớm vẫn được ghi nhận và đánh dấu ra sớm.
exports.clockOut = asyncHandler(async (req, res) => {
  const now = new Date();
  const shift = await loadOwnShift(req);
  if (shift.status !== 'in_progress') {
    const message = shift.status === 'completed' ? 'Ca làm này đã được ra ca trước đó' : 'Bạn chưa vào ca nên không thể ra ca';
    return res.status(409).json({ message, shift: enrich(shift, now, false) });
  }
  const updated = await WorkShift.findOneAndUpdate(
    { _id: shift._id, staffId: req.user.id, status: 'in_progress' },
    { $set: { status: 'completed', clockOutAt: now } }, { new: true });
  if (!updated) {
    const cur = await WorkShift.findById(shift._id);
    return res.status(409).json({ message: 'Ca làm này đã được ra ca trước đó', shift: enrich(cur, now, false) });
  }
  await logAction(req, 'SHIFT_CLOCK_OUT', updated);
  const v = enrich(updated, now, false);
  res.json({ message: v.earlyLeave ? 'Đã ra ca (trước giờ kết thúc)' : 'Đã ra ca', shift: v });
});
