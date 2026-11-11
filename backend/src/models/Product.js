const mongoose = require('mongoose');
const { Schema } = mongoose;

const priceHistorySchema = new Schema({
  oldPrice: Number,
  newPrice: Number,
  changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  changedAt: { type: Date, default: Date.now },
}, { _id: false });

const productSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  sku: { type: String, required: true, unique: true, trim: true },
  barcode: { type: String, sparse: true, unique: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  description: String,
  images: [String],
  unit: { type: String, default: 'cái' },

  price: { type: Number, required: true, min: 0 },
  priceHistory: [priceHistorySchema],

  mealType: { type: String, enum: ['main', 'light', 'snack', 'beverage'], required: true, index: true },

  status: { type: String, enum: ['active', 'inactive', 'deleted'], default: 'active', index: true },

  stockQuantity: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 10, min: 0 },

  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
}, { timestamps: true });

productSchema.index({ name: 'text' });

// Khi đọc sản phẩm: sửa đường dẫn ảnh cũ / hỏng sang file ảnh thật (không ghi lại DB)
const fixImages = (res) => { const { resolveImages } = require('../services/productImages.service'); (Array.isArray(res) ? res : [res]).forEach(resolveImages); };
productSchema.post(['find', 'findOne', 'findOneAndUpdate'], fixImages);

module.exports = mongoose.model('Product', productSchema);
