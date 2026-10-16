// UC-12.2, UC-39.3, UC-39.5, UC-39.6, UC-39.7. Chỉ ghi thêm.
// Redemption History = các dòng type 'redeem'.
const mongoose = require('mongoose');
const { Schema } = mongoose;

const pointHistorySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['earn', 'redeem', 'adjust'], required: true },
  points: { type: Number, required: true },                   // + cộng / - trừ
  balanceAfter: { type: Number, required: true, min: 0 },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },     // earn | redeem
  reason: String,                                             // bắt buộc khi adjust
  adjustedBy: { type: Schema.Types.ObjectId, ref: 'User' },   // admin (UC-39.5)
}, { timestamps: { createdAt: true, updatedAt: false } });

pointHistorySchema.index({ userId: 1, createdAt: -1 });
pointHistorySchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('PointHistory', pointHistorySchema);
