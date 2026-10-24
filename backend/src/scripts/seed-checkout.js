// Tạo khuyến mãi + mã giảm giá mẫu để thử Checkout (UC-08.1), vì chức năng quản lý khuyến mãi chưa làm.
// Chạy: npm run seed:checkout   (chạy lại nhiều lần vẫn an toàn, không tạo trùng)
//   - Khuyến mãi tự động: giảm 10% cho các sản phẩm nhóm đồ uống (30 ngày)
//   - Mã giảm giá WELCOME10: giảm 10% tối đa 20.000đ, đơn từ 30.000đ, mỗi khách dùng 3 lần
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Product, Promotion, DiscountCode } = require('../models');

const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

async function run() {
  await connectDB();
  const drinks = await Product.find({ mealType: 'beverage', status: 'active' }).select('_id');
  if (!drinks.length) throw new Error('Chưa có sản phẩm nhóm đồ uống (import backend/data/products.json trước)');

  const promoName = 'Giảm 10% đồ uống';
  await Promotion.findOneAndUpdate(
    { name: promoName },
    { name: promoName, description: 'Khuyến mãi mẫu', type: 'percent', value: 10, scope: 'product', productIds: drinks.map((d) => d._id),
      startDate: day(-1), endDate: day(30), status: 'active' },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await DiscountCode.findOneAndUpdate(
    { code: 'WELCOME10' },
    { code: 'WELCOME10', description: 'Mã mẫu giảm 10%', type: 'percent', value: 10, maxDiscount: 20000, minOrderAmount: 30000,
      usageLimit: 100, perUserLimit: 3, startDate: day(-1), endDate: day(30), status: 'active' },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`Đã tạo khuyến mãi "${promoName}" (${drinks.length} sản phẩm) và mã WELCOME10`);
}

run()
  .catch((err) => { console.error(err.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
