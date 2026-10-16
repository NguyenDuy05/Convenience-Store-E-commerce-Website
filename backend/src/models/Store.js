// UC-31 Manage Stores. Hiện chỉ có 1 document, giữ collection để sau này mở rộng nhiều cửa hàng không phải sửa schema.
const mongoose = require('mongoose');
const { Schema } = mongoose;

const openingHourSchema = new Schema({
  day: { type: Number, min: 0, max: 6, required: true },   // 0 = Chủ nhật
  openTime: String,                                         // "07:00"
  closeTime: String,                                        // "22:00"
  isClosed: { type: Boolean, default: false },
}, { _id: false });

const storeSchema = new Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  phone: String,
  openingHours: [openingHourSchema],                        // UC-31.6 Update Store Hours
  status: { type: String, enum: ['open', 'closed'], default: 'open' },   // UC-31.4 Close / UC-31.5 Open
  closedReason: String,
}, { timestamps: true });

module.exports = mongoose.model('Store', storeSchema);
