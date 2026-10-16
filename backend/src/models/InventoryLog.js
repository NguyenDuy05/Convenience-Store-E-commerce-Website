// UC-34.6 View Inventory History, UC-19.3 Adjust, UC-19.7 Manage Damaged Products
// Chỉ ghi thêm, không sửa/xóa.
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
  quantityChange: { type: Number, required: true },         // + nhập / - xuất
  quantityAfter: { type: Number, required: true },          // tổng tồn của sản phẩm sau thay đổi
  reason: String,
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },   // type = sale | release
  stocktakeId: { type: Schema.Types.ObjectId, ref: 'Stocktake' },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } });

inventoryLogSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
