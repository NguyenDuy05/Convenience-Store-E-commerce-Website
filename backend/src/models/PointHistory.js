const mongoose = require('mongoose');
const { Schema } = mongoose;

const pointHistorySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['earn', 'redeem', 'adjust'], required: true },
  points: { type: Number, required: true },
  balanceAfter: { type: Number, required: true, min: 0 },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  reason: String,
  adjustedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } });

pointHistorySchema.index({ userId: 1, createdAt: -1 });
pointHistorySchema.index({ type: 1, createdAt: -1 });

pointHistorySchema.index({ userId: 1, orderId: 1 }, { unique: true, partialFilterExpression: { type: 'earn', orderId: { $type: 'objectId' } } });
module.exports = mongoose.model('PointHistory', pointHistorySchema);
