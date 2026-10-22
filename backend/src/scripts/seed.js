// Chạy: node src/scripts/seed.js          (chỉ chạy khi DB còn trống)
//       node src/scripts/seed.js --reset  (xóa toàn bộ DB rồi tạo lại)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const M = require('../models');

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const daysFromNow = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

const CATEGORIES = ['Snack', 'Mì & Lẩu ly', 'Bánh ngọt', 'Nước uống', 'Sữa', 'Cơm nắm & Cơm hộp', 'Xúc xích & Đồ ăn nhanh'];

// [tên, category, giá, mealType, đơn vị, hạn sử dụng (ngày)]
const PRODUCTS = [
  ['Snack khoai tây vị tự nhiên', 'Snack', 12000, 'snack', 'gói', 180],
  ['Bánh quy bơ', 'Snack', 18000, 'snack', 'gói', 180],
  ['Bánh Chocopie hộp 6 cái', 'Bánh ngọt', 36000, 'snack', 'hộp', 120],
  ['Bánh bông lan cuộn', 'Bánh ngọt', 15000, 'snack', 'cái', 60],
  ['Mì ly bò hầm', 'Mì & Lẩu ly', 15000, 'main', 'ly', 240],
  ['Lẩu ly mì chả cá Hàn Quốc', 'Mì & Lẩu ly', 32000, 'main', 'ly', 240],
  ['Xúc xích tiệt trùng', 'Xúc xích & Đồ ăn nhanh', 8000, 'main', 'cây', 90],
  ['Bánh mì kẹp thịt nguội', 'Xúc xích & Đồ ăn nhanh', 20000, 'light', 'cái', 2],
  ['Cơm nắm cá hồi', 'Cơm nắm & Cơm hộp', 22000, 'main', 'cái', 2],
  ['Cơm hộp gà teriyaki', 'Cơm nắm & Cơm hộp', 35000, 'main', 'hộp', 2],
  ['Nước suối 500ml', 'Nước uống', 6000, 'beverage', 'chai', 365],
  ['Nước ngọt có ga lon 330ml', 'Nước uống', 10000, 'beverage', 'lon', 270],
  ['Trà đào đóng chai', 'Nước uống', 12000, 'beverage', 'chai', 180],
  ['Sữa tươi tiệt trùng 180ml', 'Sữa', 9000, 'beverage', 'hộp', 90],
  ['Sữa chua uống', 'Sữa', 8000, 'beverage', 'chai', 30],
];

async function seed() {
  await connectDB();

  if (process.argv.includes('--reset')) {
    await mongoose.connection.dropDatabase();
    console.log('Đã xóa database cũ');
  } else if ((await M.Store.countDocuments()) > 0) {
    console.log('Database đã có dữ liệu. Chạy lại với --reset nếu muốn xóa và tạo mới.');
    return;
  }

  // Tạo collection rỗng + index cho tất cả model
  for (const model of Object.values(M)) {
    await model.createCollection();
    await model.syncIndexes();
  }

  await M.Store.create({
    name: 'Convenience Store',
    address: '(cập nhật địa chỉ cửa hàng)',
    phone: '0900000000',
    openingHours: Array.from({ length: 7 }, (_, day) => ({ day, openTime: '06:00', closeTime: '23:00' })),
  });

  const [bronze] = await M.MembershipTier.create([
    { name: 'Bronze', minPoints: 0, discountPercent: 0, sortOrder: 1 },
    { name: 'Silver', minPoints: 500, discountPercent: 3, sortOrder: 2 },
    { name: 'Gold', minPoints: 2000, discountPercent: 5, sortOrder: 3 },
  ]);

  const hash = await bcrypt.hash(process.env.SEED_PASSWORD || 'Password@123', 10);
  const [admin] = await M.User.create([
    { role: 'admin', fullName: 'Admin', email: 'admin@store.local', passwordHash: hash },
    {
      role: 'staff', fullName: 'Staff Demo', email: 'staff@store.local', passwordHash: hash,
      staffInfo: { employeeCode: 'ST001', position: 'Cashier', hiredAt: new Date() }
    },
    {
      role: 'customer', fullName: 'Customer Demo', email: 'customer@store.local', passwordHash: hash,
      membership: { tierId: bronze._id, points: 0, lifetimePoints: 0 }
    },
  ]);

  const cats = await M.Category.create(
    CATEGORIES.map((name, i) => ({ name, slug: slugify(name), sortOrder: i + 1 }))
  );
  const catId = Object.fromEntries(cats.map((c) => [c.name, c._id]));

  const QTY = 50;
  for (const [name, cat, price, mealType, unit, shelfDays] of PRODUCTS) {
    const slug = slugify(name);
    const product = await M.Product.create({
      name, slug, sku: slug.toUpperCase().slice(0, 20), categoryId: catId[cat],
      price, mealType, unit, stockQuantity: QTY,
    });
    const batch = await M.StockBatch.create({
      productId: product._id, batchCode: 'SEED-001', receivedQuantity: QTY, quantity: QTY,
      expiryDate: daysFromNow(shelfDays), receivedBy: admin._id,
    });
    await M.InventoryLog.create({
      productId: product._id, batchId: batch._id, type: 'receive',
      quantityChange: QTY, quantityAfter: QTY, reason: 'Seed dữ liệu mẫu', performedBy: admin._id,
    });
  }

  console.log(`Seed xong: 1 store, 3 hạng thành viên, 3 tài khoản demo, ${cats.length} danh mục, ${PRODUCTS.length} sản phẩm`);
  console.log('Tài khoản demo: admin@store.local / staff@store.local / customer@store.local');
}


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



seed()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
