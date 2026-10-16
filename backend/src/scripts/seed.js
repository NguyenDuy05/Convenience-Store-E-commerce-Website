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
    { role: 'staff', fullName: 'Staff Demo', email: 'staff@store.local', passwordHash: hash,
      staffInfo: { employeeCode: 'ST001', position: 'Cashier', hiredAt: new Date() } },
    { role: 'customer', fullName: 'Customer Demo', email: 'customer@store.local', passwordHash: hash,
      membership: { tierId: bronze._id, points: 0, lifetimePoints: 0 } },
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

seed()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
