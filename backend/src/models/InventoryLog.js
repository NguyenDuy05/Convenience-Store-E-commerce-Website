const mongoose = require('mongoose');
const { Schema } = mongoose;

const inventoryLogSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'StockBatch' },
  type: {
    type: String,
    enum: ['receive', 'sale', 'release', 'adjust', 'stocktake', 'damaged', 'expired'],
    required: true,
  },
  quantityChange: { type: Number, required: true },
  quantityAfter: { type: Number, required: true },
  reason: String,
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  releaseClaimedAt: Date,
  releaseOf: { type: Schema.Types.ObjectId, ref: 'InventoryLog' },
  stocktakeId: { type: Schema.Types.ObjectId, ref: 'Stocktake' },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } });

inventoryLogSchema.index({ productId: 1, createdAt: -1 });
inventoryLogSchema.index({ releaseOf: 1 }, { unique: true, partialFilterExpression: { releaseOf: { $type: 'objectId' } } });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
