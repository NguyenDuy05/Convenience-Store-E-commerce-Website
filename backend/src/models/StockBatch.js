// UC-19.2 Receive Stock, UC-19.6 View Expired Products
// Mỗi lần nhập hàng = 1 lô, vì mỗi lô có hạn sử dụng khác nhau.
// Khi bán: trừ theo lô hết hạn sớm nhất trước (FEFO).
const mongoose = require('mongoose');
const { Schema } = mongoose;

const stockBatchSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  batchCode: String,
  receivedQuantity: { type: Number, required: true, min: 1 },
  quantity: { type: Number, required: true, min: 0 },       // số lượng còn lại của lô
  costPrice: { type: Number, min: 0 },
  expiryDate: { type: Date, index: true },
  receivedAt: { type: Date, default: Date.now },
  receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

stockBatchSchema.index({ productId: 1, expiryDate: 1 });

module.exports = mongoose.model('StockBatch', stockBatchSchema);
