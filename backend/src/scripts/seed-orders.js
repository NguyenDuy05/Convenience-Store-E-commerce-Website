// Tạo đơn hàng mẫu cho tài khoản customer@store.local để thử UC-09.1 / UC-09.2.
// Chạy: node src/scripts/seed-orders.js          (bỏ qua nếu khách đã có đơn)
//       node src/scripts/seed-orders.js --reset  (xóa đơn của khách demo rồi tạo lại)
// Cần DB đã có users + products (import backend/data hoặc npm run seed).
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { User, Product, Order } = require('../models');

const ago = (days, hour, minute) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const plusMin = (d, m) => new Date(d.getTime() + m * 60 * 1000);
const ymd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

// [số ngày trước, giờ, phút, trạng thái, phương thức, [[số thứ tự sản phẩm (0-based), số lượng], ...]]
const DEMO = [
  [0, 9, 5, 'pending_payment', 'vnpay', [[4, 2], [10, 1]]],
  [0, 8, 30, 'preparing', 'momo', [[5, 1], [11, 2]]],
  [1, 18, 15, 'ready_for_pickup', 'vnpay', [[0, 2], [11, 1], [13, 1]]],
  [3, 12, 0, 'completed', 'cash', [[8, 1], [12, 1]]],
  [6, 9, 12, 'completed', 'vnpay', [[2, 1], [0, 1], [1, 1], [13, 2], [7, 1], [3, 1]]],
  [9, 20, 40, 'failed', 'vnpay', [[9, 1]]],
];

async function run() {
  await connectDB();
  const customer = await User.findOne({ email: 'customer@store.local' });
  if (!customer) throw new Error('Chưa có tài khoản customer@store.local, hãy import/seed users trước');
  const products = await Product.find({ status: 'active' }).sort({ sku: 1 });
  if (products.length < 14) throw new Error('Cần tối thiểu 14 sản phẩm (import backend/data/products.json)');

  if (process.argv.includes('--reset')) {
    const r = await Order.deleteMany({ customerId: customer._id });
    console.log(`Đã xóa ${r.deletedCount} đơn cũ của khách demo`);
  } else if (await Order.exists({ customerId: customer._id })) {
    console.log('Khách demo đã có đơn. Chạy lại với --reset nếu muốn tạo mới.');
    return;
  }

  const seqByDay = {};
  for (const [days, h, m, status, method, lines] of DEMO) {
    const placed = ago(days, h, m);
    const key = ymd(placed);
    seqByDay[key] = (seqByDay[key] || 0) + 1;

    const items = lines.map(([idx, quantity]) => {
      const p = products[idx];
      return { productId: p._id, name: p.name, sku: p.sku, unitPrice: p.price, quantity, discountAmount: 0, lineTotal: p.price * quantity };
    });
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const paid = ['confirmed', 'preparing', 'ready_for_pickup', 'completed'].includes(status) && method !== 'cash';
    const history = [{ status: 'pending_payment', changedAt: placed }];
    if (status !== 'pending_payment') {
      if (status === 'failed') history.push({ status: 'failed', changedAt: plusMin(placed, 15) });
      else {
        const flow = ['confirmed', 'preparing', 'ready_for_pickup', 'completed'];
        flow.slice(0, flow.indexOf(status) + 1).forEach((s, i) => history.push({ status: s, changedAt: plusMin(placed, 3 + i * 8) }));
      }
    }
    const readyAt = ['ready_for_pickup', 'completed'].includes(status) ? plusMin(placed, 20) : undefined;

    await Order.create({
      orderCode: `CM-${key}-${String(seqByDay[key]).padStart(4, '0')}`,
      source: 'online',
      customerId: customer._id,
      items,
      subtotal,
      totalAmount: subtotal,
      pointsEarned: status === 'completed' ? Math.floor(subtotal / 10000) : 0,
      status,
      statusHistory: history,
      paymentMethod: method,
      paymentStatus: status === 'failed' ? 'failed' : paid || (method === 'cash' && status === 'completed') ? 'paid' : 'unpaid',
      paidAt: paid ? plusMin(placed, 3) : undefined,
      readyAt,
      pickedUpAt: status === 'completed' ? plusMin(placed, 35) : undefined,
      customerNote: days === 1 ? 'Cho mình xin túi giấy nhé' : undefined,
    });
  }
  console.log(`Đã tạo ${DEMO.length} đơn mẫu cho ${customer.email}`);
}

run()
  .catch((err) => { console.error(err.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
