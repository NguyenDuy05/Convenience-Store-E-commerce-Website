const mongoose = require('mongoose');
const { Schema } = mongoose;

const openingHourSchema = new Schema({
  day: { type: Number, min: 0, max: 6, required: true },
  openTime: String,
  closeTime: String,
  isClosed: { type: Boolean, default: false },
}, { _id: false });

const storeSchema = new Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  phone: String,
  website: String,
  openingHours: [openingHourSchema],
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  closedReason: String,
}, { timestamps: true });

module.exports = mongoose.model('Store', storeSchema);
