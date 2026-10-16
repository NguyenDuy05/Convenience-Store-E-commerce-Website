// UC-11 (customer), UC-40 (admin). Dùng chung cho review sản phẩm và review cửa hàng.
const mongoose = require('mongoose');
const { Schema } = mongoose;

const reviewSchema = new Schema({
  targetType: { type: String, enum: ['product', 'store'], required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },       // khi targetType = product
  storeId: { type: Schema.Types.ObjectId, ref: 'Store' },           // khi targetType = store
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },           // đơn đã mua (review có xác thực mua hàng)
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true },

  // visible | hidden (admin ẩn, UC-40.3) | deleted (khách xóa, UC-11.3)
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
// mỗi khách chỉ review 1 lần cho 1 sản phẩm trong 1 đơn
reviewSchema.index(
  { customerId: 1, orderId: 1, productId: 1 },
  { unique: true, partialFilterExpression: { targetType: 'product', status: { $ne: 'deleted' } } }
);

module.exports = mongoose.model('Review', reviewSchema);
