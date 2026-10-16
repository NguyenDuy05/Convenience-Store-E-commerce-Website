// UC-38 Manage Discount Codes. Số lần mỗi khách đã dùng: đếm từ Order.discountCode.codeId + customerId.
const mongoose = require('mongoose');
const { Schema } = mongoose;

const discountCodeSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: String,
  type: { type: String, enum: ['percent', 'fixed'], required: true },
  value: { type: Number, required: true, min: 0 },
  maxDiscount: { type: Number, min: 0 },
  minOrderAmount: { type: Number, default: 0, min: 0 },
  usageLimit: { type: Number, min: 0 },                       // tổng lượt dùng tối đa (bỏ trống = không giới hạn)
  usedCount: { type: Number, default: 0, min: 0 },
  perUserLimit: { type: Number, default: 1, min: 1 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['inactive', 'active', 'suspended', 'deleted'], default: 'inactive', index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('DiscountCode', discountCodeSchema);
