const mongoose = require('mongoose');
const { Schema } = mongoose;

const stockBatchSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  batchCode: String,
  receivedQuantity: { type: Number, required: true, min: 1 },
  quantity: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, min: 0 },
  expiryDate: { type: Date, index: true },
  receivedAt: { type: Date, default: Date.now },
  receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

stockBatchSchema.index({ productId: 1, expiryDate: 1 });

module.exports = mongoose.model('StockBatch', stockBatchSchema);
