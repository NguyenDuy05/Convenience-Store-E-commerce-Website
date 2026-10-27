// Seed ca làm mẫu để test UC-24 (Staff > Ca làm việc). Chạy: node src/scripts/seed-shifts.js  (hoặc thêm vào package.json: "seed:shifts")
// YÊU CẦU đã chạy `npm run seed` (cần tài khoản staff). AN TOÀN: không reset DB; chỉ xóa/tạo lại các ca có note bắt đầu bằng "[seed]".
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { User, WorkShift } = require('../models');

const pad = (n) => String(n).padStart(2, '0');
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const midnight = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

async function seed() {
  await connectDB();
  const staff = await User.findOne({ role: 'staff' });
  const admin = await User.findOne({ role: 'admin' });
  if (!staff) throw new Error('Chưa có tài khoản staff. Hãy chạy `npm run seed` trước.');
  await WorkShift.deleteMany({ staffId: staff._id, note: /^\[seed\]/ });

  const now = new Date();
  const mk = (start, end, extra = {}) => ({
    staffId: staff._id, shiftDate: midnight(start), startTime: hhmm(start), endTime: hhmm(end), createdBy: admin?._id, note: '[seed] Ca mẫu', ...extra,
  });
  const day = (offsetDays, h, m = 0, hours = 8) => {
    const s = new Date(midnight(now).getTime() + offsetDays * DAY); s.setHours(h, m, 0, 0);
    return [s, new Date(s.getTime() + hours * 60 * MIN)];
  };

  const rows = [];
  // Ca đang đến giờ vào ca (bắt đầu 10 phút trước, kéo dài 8 giờ) -> thử "Vào ca" / "Ra ca"
  const curStart = new Date(now.getTime() - 10 * MIN);
  rows.push(mk(curStart, new Date(curStart.getTime() + 8 * 60 * MIN)));
  // Ca sắp tới
  for (const [off, h] of [[1, 7], [2, 14], [4, 7], [6, 15]]) rows.push(mk(...day(off, h)));
  // Lịch sử: đã hoàn tất (có giờ vào/ra thực tế, một ca vào trễ, một ca ra sớm), một ca bị lỡ
  let [s, e] = day(-1, 7);
  rows.push(mk(s, e, { status: 'completed', clockInAt: new Date(s.getTime() + 2 * MIN), clockOutAt: new Date(e.getTime() + 5 * MIN) }));
  [s, e] = day(-2, 14);
  rows.push(mk(s, e, { status: 'completed', clockInAt: new Date(s.getTime() + 25 * MIN), clockOutAt: new Date(e.getTime() - 40 * MIN) }));
  [s, e] = day(-3, 7);
  rows.push(mk(s, e, { status: 'missed' }));
  for (const off of [-5, -6, -8, -9, -10, -12]) {
    [s, e] = day(off, 7);
    rows.push(mk(s, e, { status: 'completed', clockInAt: new Date(s.getTime() - 3 * MIN), clockOutAt: new Date(e.getTime() + 2 * MIN) }));
  }
  await WorkShift.insertMany(rows);
  console.log(`Seed ca làm xong: ${rows.length} ca cho ${staff.email} (1 ca đang đến giờ vào ca, 4 ca sắp tới, ${rows.length - 5} ca lịch sử).`);
}

seed()
  .catch((err) => { console.error(err.message || err); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
