// Lương theo giờ của nhân viên ca. Đổi mức lương bằng biến môi trường (backend/.env) nếu cần.
//   Ca ngày  (06:00–22:00): PAY_DAY_RATE   (mặc định 25.000 ₫/giờ)
//   Ca đêm   (22:00–06:00): PAY_NIGHT_RATE (mặc định 32.000 ₫/giờ)
// Chỉ trả cho thời gian làm THẬT nằm trong giờ ca: vào sớm / ở lại quá giờ không tính; vào trễ / về sớm bị trừ.
const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d);

const RATES = {
  day: num(process.env.PAY_DAY_RATE, 25000),
  night: num(process.env.PAY_NIGHT_RATE, 32000),
  nightStartHour: 22,
  nightEndHour: 6,
};
const MIN = 60 * 1000;

// Số phút ban đêm (22:00–06:00, giờ máy chủ) nằm trong [from, to)
function nightMinutes(from, to) {
  if (!(to > from)) return 0;
  let total = 0;
  const d = new Date(from); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 1);
  for (; d < to; d.setDate(d.getDate() + 1)) {
    const ns = new Date(d); ns.setHours(RATES.nightStartHour, 0, 0, 0);
    const ne = new Date(d); ne.setDate(ne.getDate() + 1); ne.setHours(RATES.nightEndHour, 0, 0, 0);
    const a = Math.max(ns.getTime(), from.getTime()), b = Math.min(ne.getTime(), to.getTime());
    if (b > a) total += (b - a) / MIN;
  }
  return Math.round(total);
}

// Lương cho khoảng [from, to): { dayMinutes, nightMinutes, amount }
function payFor(from, to) {
  if (!from || !to || !(to > from)) return { dayMinutes: 0, nightMinutes: 0, amount: 0 };
  const all = Math.round((to - from) / MIN);
  const night = Math.min(all, nightMinutes(from, to));
  const day = all - night;
  return { dayMinutes: day, nightMinutes: night, amount: Math.round((day * RATES.day + night * RATES.night) / 60) };
}

module.exports = { RATES, payFor, nightMinutes };
