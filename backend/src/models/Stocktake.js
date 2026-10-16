// UC-19.4 / UC-34.3 Stocktake (kiểm kê)
const mongoose = require('mongoose');
const { Schema } = mongoose;

const stocktakeItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  systemQty: { type: Number, required: true },              // tồn theo hệ thống lúc kiểm
  countedQty: { type: Number, required: true, min: 0 },     // số đếm thực tế
  difference: { type: Number, required: true },             // countedQty - systemQty
  note: String,
}, { _id: false });

const stocktakeSchema = new Schema({
  code: { type: String, required: true, unique: true },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
  items: [stocktakeItemSchema],
  note: String,
  completedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Stocktake', stocktakeSchema);
