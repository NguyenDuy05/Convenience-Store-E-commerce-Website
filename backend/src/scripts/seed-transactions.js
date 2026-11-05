// Seed dữ liệu giao dịch mẫu để test UC-23 (Staff) và UC-35 (Admin) Manage Transactions.
// Chạy:  npm run seed:transactions
// - YÊU CẦU đã chạy `npm run seed` trước (cần tài khoản demo và sản phẩm).
// - AN TOÀN: chỉ thêm dữ liệu, KHÔNG reset database, KHÔNG trừ kho. Có thể chạy lại nhiều lần:
//   mỗi lần chạy chỉ xóa rồi tạo lại các bản ghi do chính script này tạo (đơn có mã "CM-SEED-xxxx", giao dịch có mã tham chiếu "SEED-...").
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { User, Product, Order, Transaction } = require('../models');

const DAY = 24 * 60 * 60 * 1000;
const ago = (days, hours = 0) => new Date(Date.now() - days * DAY - hours * 60 * 60 * 1000);

async function seed() {
  await connectDB();

  const [admin, staff, customer] = await Promise.all([
    User.findOne({ role: 'admin' }), User.findOne({ role: 'staff' }), User.findOne({ role: 'customer' }),
  ]);
  const products = await Product.find({ status: 'active' }).limit(6);
  if (!admin || !staff || !customer || products.length < 3) {
    throw new Error('Thiếu dữ liệu nền. Hãy chạy `npm run seed` trước rồi chạy lại script này.');
  }

  // Dọn dữ liệu seed cũ (chỉ các bản ghi do script này tạo)
  const oldOrders = await Order.find({ orderCode: /^CM-SEED-/ }).select('_id');
  await Transaction.deleteMany({ $or: [{ orderId: { $in: oldOrders.map((o) => o._id) } }, { txnRef: /^SEED-/ }] });
  await Order.deleteMany({ orderCode: /^CM-SEED-/ });

  let seq = 0;
  // Tạo đơn + các giao dịch của đơn. qty: số lượng cho mỗi sản phẩm đầu danh sách.
  async function makeOrder({ source = 'online', walkIn = false, picks = [0], qty = 2, status, paymentStatus, method, createdAt, txns }) {
    seq += 1;
    const items = picks.map((i) => {
      const p = products[i % products.length];
      return { productId: p._id, name: p.name, sku: p.sku, unitPrice: p.price, quantity: qty, lineTotal: p.price * qty };
    });
    const total = items.reduce((s, i) => s + i.lineTotal, 0);
    const order = await Order.create({
      orderCode: `CM-SEED-${String(seq).padStart(4, '0')}`, source,
      customerId: walkIn ? undefined : customer._id, createdBy: source === 'store' ? staff._id : undefined,
      items, subtotal: total, totalAmount: total, status, paymentStatus, paymentMethod: method,
      paidAt: paymentStatus === 'paid' ? createdAt : undefined,
      statusHistory: [{ status, changedAt: createdAt, note: 'Dữ liệu seed' }],
      createdAt, updatedAt: createdAt,
    });
    for (const [n, t] of txns.entries()) {
      const at = new Date(createdAt.getTime() + (n + 1) * 60 * 1000);
      await Transaction.create({
        orderId: order._id, customerId: walkIn ? undefined : customer._id,
        amount: total, createdAt: at, updatedAt: at,
        txnRef: `SEED-${String(seq).padStart(4, '0')}-${n + 1}`,
        paidAt: t.status === 'success' ? at : undefined,
        ...t,
      });
    }
    return { order, total };
  }

  const gw = (provider, extra = {}) => ({ provider, ...extra });

  // 1. MoMo thành công hôm nay (đơn online đã xác nhận)
  await makeOrder({ picks: [0, 1], status: 'confirmed', paymentStatus: 'paid', method: 'momo', createdAt: ago(0, 1),
    txns: [{ method: 'momo', status: 'success', gateway: gw('momo', { transactionNo: '3412345678', responseCode: '0', bankCode: 'MOMO' }) }] });
  // 2. VNPay thành công hôm qua (đơn đã hoàn tất)
  await makeOrder({ picks: [2], qty: 3, status: 'completed', paymentStatus: 'paid', method: 'vnpay', createdAt: ago(1),
    txns: [{ method: 'vnpay', status: 'success', gateway: gw('vnpay', { transactionNo: '14234567', responseCode: '00', bankCode: 'NCB' }) }] });
  // 3. Một đơn có 2 giao dịch: VNPay thất bại (khách hủy) rồi thử lại bằng MoMo thành công
  await makeOrder({ picks: [1, 2], status: 'confirmed', paymentStatus: 'paid', method: 'momo', createdAt: ago(2),
    txns: [
      { method: 'vnpay', status: 'failed', failureReason: 'Khách hàng hủy giao dịch tại cổng thanh toán', gateway: gw('vnpay', { responseCode: '24' }) },
      { method: 'momo', status: 'success', gateway: gw('momo', { transactionNo: '3412999001', responseCode: '0', bankCode: 'MOMO' }) },
    ] });
  // 4. VNPay hết thời gian chờ, đã được admin xử lý (UC-41.4)
  await makeOrder({ picks: [0], qty: 4, status: 'failed', paymentStatus: 'failed', method: 'vnpay', createdAt: ago(3),
    txns: [{ method: 'vnpay', status: 'failed', failureReason: 'Giao dịch quá thời gian chờ phản hồi từ cổng thanh toán', gateway: gw('vnpay', { responseCode: '99' }),
      errorHandling: { handledBy: admin._id, handledAt: ago(2, 20), resolution: 'Đã đối soát với cổng thanh toán: chưa phát sinh trừ tiền, đóng giao dịch' } }] });
  // 5. MoMo đang chờ (đơn chờ thanh toán)
  await makeOrder({ picks: [2, 0], status: 'pending_payment', paymentStatus: 'unpaid', method: 'momo', createdAt: ago(0, 0.1),
    txns: [{ method: 'momo', status: 'pending', gateway: gw('momo') }] });
  // 6. Tại quầy: tiền mặt, khách vãng lai, có tiền khách đưa / tiền thối
  const cash1 = await makeOrder({ source: 'store', walkIn: true, picks: [1], qty: 3, status: 'completed', paymentStatus: 'paid', method: 'cash', createdAt: ago(0, 3),
    txns: [{ method: 'cash', status: 'success', processedBy: staff._id }] });
  await Transaction.updateOne({ txnRef: 'SEED-0006-1' }, { $set: { cash: { received: Math.ceil(cash1.total / 50000) * 50000, change: Math.ceil(cash1.total / 50000) * 50000 - cash1.total } } });
  // 7. Tại quầy: quẹt thẻ, khách có tài khoản
  await makeOrder({ source: 'store', picks: [0, 2], status: 'completed', paymentStatus: 'paid', method: 'card', createdAt: ago(1, 5),
    txns: [{ method: 'card', status: 'success', processedBy: staff._id, gateway: gw('pos', { transactionNo: '8800123456', responseCode: '00' }) }] });
  // 8. Tại quầy: tiền mặt 5 ngày trước
  const cash2 = await makeOrder({ source: 'store', walkIn: true, picks: [0], qty: 1, status: 'completed', paymentStatus: 'paid', method: 'cash', createdAt: ago(5),
    txns: [{ method: 'cash', status: 'success', processedBy: staff._id }] });
  await Transaction.updateOne({ txnRef: 'SEED-0008-1' }, { $set: { cash: { received: Math.ceil(cash2.total / 10000) * 10000, change: Math.ceil(cash2.total / 10000) * 10000 - cash2.total } } });
  // 9. VNPay thành công 20 ngày trước, giá trị lớn
  await makeOrder({ picks: [0, 1, 2], qty: 40, status: 'completed', paymentStatus: 'paid', method: 'vnpay', createdAt: ago(20),
    txns: [{ method: 'vnpay', status: 'success', gateway: gw('vnpay', { transactionNo: '14000111', responseCode: '00', bankCode: 'VCB' }) }] });
  // 10. MoMo thất bại 40 ngày trước (không đủ số dư)
  await makeOrder({ picks: [2], status: 'failed', paymentStatus: 'failed', method: 'momo', createdAt: ago(40),
    txns: [{ method: 'momo', status: 'failed', failureReason: 'Tài khoản không đủ số dư', gateway: gw('momo', { responseCode: '1001' }) }] });
  // 11-14. Thêm giao dịch thành công rải các ngày (để test phân trang: tổng > 10 giao dịch)
  for (const [i, d] of [[0, 6], [1, 8], [2, 10], [0, 12]].entries()) {
    const [pick, days] = d;
    await makeOrder({ picks: [pick], qty: 1 + i, status: 'completed', paymentStatus: 'paid', method: i % 2 ? 'vnpay' : 'momo', createdAt: ago(days),
      txns: [{ method: i % 2 ? 'vnpay' : 'momo', status: 'success', gateway: gw(i % 2 ? 'vnpay' : 'momo', { transactionNo: `99${days}00${i}`, responseCode: i % 2 ? '00' : '0' }) }] });
  }

  const [orders, txns] = await Promise.all([Order.countDocuments({ orderCode: /^CM-SEED-/ }), Transaction.countDocuments({ txnRef: /^SEED-/ })]);
  console.log(`Seed giao dịch xong: ${orders} đơn hàng, ${txns} giao dịch (mã đơn CM-SEED-0001..., mã tham chiếu SEED-...).`);
  console.log('Đăng nhập staff@store.local hoặc admin@store.local (mật khẩu theo SEED_PASSWORD) rồi mở trang Giao dịch.');
}

seed()
  .catch((err) => { console.error(err.message || err); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
