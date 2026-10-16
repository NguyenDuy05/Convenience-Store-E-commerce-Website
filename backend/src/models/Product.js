// UC-02, UC-18, UC-32
const mongoose = require('mongoose');
const { Schema } = mongoose;

// UC-32.6 Update Product Price: lưu lịch sử đổi giá (embed, ít phần tử)
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
  unit: { type: String, default: 'cái' },                   // cái, gói, chai, hộp...

  price: { type: Number, required: true, min: 0 },
  priceHistory: [priceHistorySchema],

  // Dùng cho giỏ hàng gợi ý theo ngân sách:
  // main = món no (mì ly, xúc xích, cơm nắm, cơm hộp, lẩu ly), light = ăn nhẹ (bánh mì, sandwich),
  // snack = ăn vặt, beverage = nước uống / sữa
  mealType: { type: String, enum: ['main', 'light', 'snack', 'beverage'], required: true, index: true },

  // UC-32.8 / 32.9 Activate / Deactivate, UC-32.7 Delete (xóa mềm để đơn cũ không mất tham chiếu)
  status: { type: String, enum: ['active', 'inactive', 'deleted'], default: 'active', index: true },

  // Cache = tổng StockBatch.quantity của sản phẩm (cập nhật mỗi khi tồn kho đổi) -> list/search không phải join
  stockQuantity: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 10, min: 0 },  // UC-19.5 / UC-34.4 Low Stock

  // Cache từ Review (cập nhật khi thêm/sửa/xóa/ẩn review)
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
}, { timestamps: true });

productSchema.index({ name: 'text' });                      // UC-02.3 / 18.2 / 32.2 Search Products

module.exports = mongoose.model('Product', productSchema);
