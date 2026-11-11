// UC-09.2, UC-23, UC-24, UC-36, UC-41
// Mỗi lần thanh toán = 1 Transaction. Một Order có thể có nhiều Transaction (lần 1 lỗi, thử lại lần 2).
// "Manage Transactions" và "Manage Payments" cùng đọc collection này, không tách đôi để khỏi trùng dữ liệu.
const mongoose = require('mongoose');
const { Schema } = mongoose;

const transactionSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User' },
  processedBy: { type: Schema.Types.ObjectId, ref: 'User' },   // staff xử lý (tiền mặt / thẻ tại quầy)

  method: { type: String, enum: ['cash', 'card', 'vnpay', 'wallet'], required: true },
  amount: { type: Number, required: true, min: 0 },
  // refunded: đã thanh toán nhưng đơn bị hủy/hết hạn -> tiền đã hoàn vào ví khách (không còn tính là tiền thu được)
  status: { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'pending', index: true },

  txnRef: { type: String, unique: true, sparse: true },        // mã tham chiếu gửi sang cổng thanh toán
  paymentUrl: String,                                          // link thanh toán đã tạo (dùng lại nếu khách quay lại trước khi hết hạn)
  onlineAttempt: { type: Boolean, default: false },
  gateway: {                                                   // dữ liệu cổng trả về (callback/IPN)
    provider: String,
    transactionNo: String,
    responseCode: String,
    bankCode: String,
    payDate: Date,
    raw: { type: Schema.Types.Mixed, select: false },
  },
  cash: { received: Number, change: Number },                  // UC-23.1

  paidAt: Date,
  refund: { amount: Number, method: String, reason: String, refundedAt: Date },
  failureReason: String,
  errorHandling: {                                             // UC-41.4 Handle Payment Error
    handledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    handledAt: Date,
    resolution: String,
  },
}, { timestamps: true });

transactionSchema.index({ status: 1, createdAt: -1 });         // UC-41.2 Failed, UC-41.3 Pending
transactionSchema.index({ orderId: 1, onlineAttempt: 1 }, { unique: true, partialFilterExpression: { status: 'pending', onlineAttempt: true } });

transactionSchema.index({ 'gateway.provider': 1, 'gateway.transactionNo': 1 }, {
  unique: true, partialFilterExpression: { 'gateway.provider': 'pos', 'gateway.transactionNo': { $type: 'string' }, status: 'success' },
});
module.exports = mongoose.model('Transaction', transactionSchema);
