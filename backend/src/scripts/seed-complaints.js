// Tạo khách hàng và khiếu nại/yêu cầu hỗ trợ mẫu để thử UC-19 (Staff Manage Customers), vì chức năng khách gửi yêu cầu (UC-12) chưa làm.
// Chạy: npm run seed:complaints          (chạy lại nhiều lần an toàn, không tạo trùng)
//       npm run seed:complaints -- --reset   (xóa yêu cầu của các khách mẫu rồi tạo lại)
// Nên chạy sau "npm run seed:orders" để khiếu nại đầu tiên được gắn với một đơn thật.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { User, Order, SupportRequest, MembershipTier } = require('../models');

const ago = (days, hour = 10) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(hour, 15, 0, 0); return d; };

const EXTRA = [
  { email: 'customer2@store.local', fullName: 'Trần Thị Bình', phone: '0912345678' },
  { email: 'customer3@store.local', fullName: 'Lê Hoàng', phone: '0987654321' },
  { email: 'customer4@store.local', fullName: 'Phạm Minh Châu', phone: '0933222111', status: 'locked' },
];

async function run() {
  await connectDB();
  const staff = await User.findOne({ email: 'staff@store.local' });
  const demo = await User.findOne({ email: 'customer@store.local' });
  if (!staff || !demo) throw new Error('Thiếu staff@store.local hoặc customer@store.local (import backend/data/users.json trước)');
  const bronze = await MembershipTier.findOne({ name: 'Bronze' });
  const hash = await bcrypt.hash(process.env.SEED_PASSWORD || 'Password@123', 10);

  const customers = [demo];
  for (const c of EXTRA) {
    let u = await User.findOne({ email: c.email });
    if (!u) u = await User.create({ role: 'customer', passwordHash: hash, status: 'active', membership: { tierId: bronze?._id, points: 0, lifetimePoints: 0 }, ...c });
    customers.push(u);
  }

  if (process.argv.includes('--reset')) {
    const r = await SupportRequest.deleteMany({ customerId: { $in: customers.map((c) => c._id) } });
    console.log(`Đã xóa ${r.deletedCount} yêu cầu cũ của khách mẫu`);
  }

  const order = await Order.findOne({ customerId: demo._id, status: 'completed' }).sort({ createdAt: -1 });
  const [c1, c2, c3] = customers.slice(1);
  const rows = [
    { customerId: demo._id, type: 'complaint', subject: 'Thiếu 1 gói mì khi nhận hàng', message: 'Tôi nhận đơn tại quầy nhưng thiếu 1 gói mì so với hóa đơn. Mong cửa hàng kiểm tra giúp.', orderId: order?._id, status: 'open', createdAt: ago(0, 9) },
    { customerId: demo._id, type: 'complaint', subject: 'Bị trừ tiền hai lần khi thanh toán MoMo', message: 'Tài khoản MoMo của tôi bị trừ 2 lần cho cùng một đơn hàng. Vui lòng kiểm tra và hoàn tiền.', status: 'open', createdAt: ago(1, 14) },
    { customerId: c1._id, type: 'complaint', subject: 'Sản phẩm đã quá hạn sử dụng', message: 'Hộp bánh quy tôi mua hôm qua đã hết hạn từ tuần trước. Tôi muốn đổi sản phẩm khác.', status: 'in_progress', handledBy: staff._id, createdAt: ago(2, 11),
      responses: [{ responderId: staff._id, message: 'Cửa hàng xin lỗi chị. Bên em đã ghi nhận và đang kiểm tra lô hàng, sẽ phản hồi sớm.', createdAt: ago(2, 13) }] },
    { customerId: c2._id, type: 'support', subject: 'Hỏi giờ mở cửa dịp lễ', message: 'Cửa hàng có mở cửa vào ngày lễ sắp tới không ạ?', status: 'resolved', handledBy: staff._id, resolvedAt: ago(4, 9), createdAt: ago(5, 16),
      responses: [{ responderId: staff._id, message: 'Cửa hàng mở cửa bình thường từ 6h đến 23h cả ngày lễ ạ.', createdAt: ago(4, 9) }] },
    { customerId: c2._id, type: 'complaint', subject: 'Nhân viên thái độ chưa tốt', message: 'Hôm qua nhân viên quầy trả lời cộc lốc khi tôi hỏi về chương trình khuyến mãi.', status: 'open', createdAt: ago(0, 18) },
  ];
  let created = 0;
  for (const r of rows) {
    if (await SupportRequest.exists({ customerId: r.customerId, subject: r.subject })) continue;
    await SupportRequest.create(r);
    created += 1;
  }
  console.log(`Khách mẫu: ${customers.length} (đăng nhập bằng mật khẩu Password@123). Đã tạo ${created} yêu cầu mới.`);
}

run()
  .catch((err) => { console.error(err.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
