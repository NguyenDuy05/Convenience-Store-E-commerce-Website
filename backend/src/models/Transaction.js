const mongoose = require('mongoose');
const { Schema } = mongoose;

const transactionSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User' },
  processedBy: { type: Schema.Types.ObjectId, ref: 'User' },

  method: { type: String, enum: ['cash', 'card', 'vnpay', 'wallet'], required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'pending', index: true },

  txnRef: { type: String, unique: true, sparse: true },
  paymentUrl: String,
  onlineAttempt: { type: Boolean, default: false },
  gateway: {
    provider: String,
    transactionNo: String,
    responseCode: String,
    bankCode: String,
    payDate: Date,
    raw: { type: Schema.Types.Mixed, select: false },
  },
  cash: { received: Number, change: Number },

  paidAt: Date,
  refund: { amount: Number, method: String, reason: String, refundedAt: Date },
  failureReason: String,
  errorHandling: {
    handledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    handledAt: Date,
    resolution: String,
  },
}, { timestamps: true });

transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ orderId: 1, onlineAttempt: 1 }, { unique: true, partialFilterExpression: { status: 'pending', onlineAttempt: true } });

transactionSchema.index({ 'gateway.provider': 1, 'gateway.transactionNo': 1 }, {
  unique: true, partialFilterExpression: { 'gateway.provider': 'pos', 'gateway.transactionNo': { $type: 'string' }, status: 'success' },
});
module.exports = mongoose.model('Transaction', transactionSchema);
