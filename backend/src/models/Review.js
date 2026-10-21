// UC-11 (customer), UC-40 (admin). Shared by product and store reviews.
const mongoose = require('mongoose');
const { Schema } = mongoose;

const reviewSchema = new Schema({
  targetType: { type: String, enum: ['product', 'store'], required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },       // Set when targetType is product
  storeId: { type: Schema.Types.ObjectId, ref: 'Store' },           // Set when targetType is store
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },           // Purchased order (verified purchase)
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true },

  // visible | hidden (hidden by admin, UC-40.3) | deleted (deleted by customer, UC-11.3)
  status: { type: String, enum: ['visible', 'hidden', 'deleted'], default: 'visible', index: true },
  moderation: {                                                     // UC-40.3 Hide, UC-40.4 Handle Violating Review
    hiddenBy: { type: Schema.Types.ObjectId, ref: 'User' },
    hiddenAt: Date,
    reason: String,
    isViolating: { type: Boolean, default: false },
    action: String,
  },
}, { timestamps: true });

reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ storeId: 1, status: 1, createdAt: -1 });
// Allow one review per customer, product, and order.
reviewSchema.index(
  { customerId: 1, orderId: 1, productId: 1 },
  { unique: true, partialFilterExpression: { targetType: 'product', status: { $in: ['visible', 'hidden'] } } }
);

module.exports = mongoose.model('Review', reviewSchema);
