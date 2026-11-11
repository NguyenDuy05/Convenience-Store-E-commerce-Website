const mongoose = require('mongoose');
const { Schema } = mongoose;

const promotionSchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: String,
  type: { type: String, enum: ['percent', 'fixed'], required: true },
  value: { type: Number, required: true, min: 0 },
  maxDiscount: { type: Number, min: 0 },
  scope: { type: String, enum: ['all', 'category', 'product'], default: 'all' },
  categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['inactive', 'active', 'suspended', 'deleted'], default: 'inactive', index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

promotionSchema.index({ status: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Promotion', promotionSchema);
