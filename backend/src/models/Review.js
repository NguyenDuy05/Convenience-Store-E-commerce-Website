const mongoose = require('mongoose');
const { Schema } = mongoose;

const reviewSchema = new Schema({
  targetType: { type: String, enum: ['product', 'store'], required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true },

  status: { type: String, enum: ['visible', 'hidden', 'deleted'], default: 'visible', index: true },
  moderation: {
    hiddenBy: { type: Schema.Types.ObjectId, ref: 'User' },
    hiddenAt: Date,
    reason: String,
    isViolating: { type: Boolean, default: false },
    action: String,
  },
}, { timestamps: true });

reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ storeId: 1, status: 1, createdAt: -1 });
reviewSchema.index(
  { customerId: 1, orderId: 1, productId: 1 },
  { unique: true, partialFilterExpression: { targetType: 'product', status: { $in: ['visible', 'hidden'] } } }
);

module.exports = mongoose.model('Review', reviewSchema);
