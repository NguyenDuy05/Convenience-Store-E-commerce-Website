const mongoose = require('mongoose');
const { Schema } = mongoose;

const membershipTierSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  minPoints: { type: Number, required: true, min: 0 },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  description: String,
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('MembershipTier', membershipTierSchema);
