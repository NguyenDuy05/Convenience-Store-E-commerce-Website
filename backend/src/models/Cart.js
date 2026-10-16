// UC-08 Manage Cart. Mỗi customer 1 giỏ. Không lưu giá: luôn lấy giá hiện tại của Product, giá chốt khi tạo Order.
const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  addedAt: { type: Date, default: Date.now },
}, { _id: false });

const cartSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [cartItemSchema],
  budget: { type: Number, min: 0 },                         // ngân sách khách nhập cho tính năng giỏ hàng gợi ý
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);
