const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  sku: String,
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  discountAmount: { type: Number, default: 0, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const statusHistorySchema = new Schema({
  status: String,
  changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  changedAt: { type: Date, default: Date.now },
  note: String,
}, { _id: false });

const issueSchema = new Schema({
  description: { type: String, required: true },
  reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  handledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolution: String,
  resolvedAt: Date,
}, { timestamps: true });

const orderSchema = new Schema({
  orderCode: { type: String, required: true, unique: true },
  source: { type: String, enum: ['online', 'store'], required: true },
  customerId: {
    type: Schema.Types.ObjectId, ref: 'User', index: true,
    required: function () { return this.source === 'online'; },
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },

  items: { type: [orderItemSchema], validate: v => v.length > 0 },

  subtotal: { type: Number, required: true, min: 0 },
  appliedPromotions: [{
    promotionId: { type: Schema.Types.ObjectId, ref: 'Promotion' },
    name: String,
    amount: Number,
    _id: false,
  }],
  promotionDiscount: { type: Number, default: 0, min: 0 },
  discountCode: {
    codeId: { type: Schema.Types.ObjectId, ref: 'DiscountCode' },
    code: String,
    amount: { type: Number, default: 0 },
  },
  pointsUsed: { type: Number, default: 0, min: 0 },
  discountReservationVersion: Number,
  discountReleasedAt: Date,
  pointsDiscount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  walletPolicy: { type: Boolean, default: false },
  walletAmount: { type: Number, default: 0, min: 0 },
  payableAmount: { type: Number, min: 0 },
  checkoutReady: { type: Boolean, default: true },
  pointsEarned: { type: Number, default: 0, min: 0 },

  status: {
    type: String,
    enum: ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup', 'completed', 'failed', 'cancelled'],
    default: 'pending_payment',
    index: true,
  },
  statusHistory: [statusHistorySchema],

  paymentMethod: { type: String, enum: ['cash', 'card', 'vnpay', 'wallet'] },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'failed', 'refunded'], default: 'unpaid' },
  paidAt: Date,
  paidTransactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  cancelledAt: Date,
  cancelReason: String,
  refund: {
    amount: Number,
    method: String,
    reason: String,
    refundedAt: Date,
    refundedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },

  customerNote: String,
  idempotencyKey: String,
  checkoutHash: String,
  readyAt: Date,
  preparationStartsAt: Date,
  pickedUpAt: Date,
  issues: [issueSchema],
}, { timestamps: true });

orderSchema.index({ customerId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ 'items.productId': 1 });
orderSchema.index({ 'refund.refundedAt': -1 }, { sparse: true });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
