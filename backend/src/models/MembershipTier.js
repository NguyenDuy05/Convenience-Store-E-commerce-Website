// UC-39.4 Manage Membership Tiers
const mongoose = require('mongoose');
const { Schema } = mongoose;

const membershipTierSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },   // Bronze, Silver, Gold...
  minPoints: { type: Number, required: true, min: 0 },                // lifetimePoints tối thiểu để đạt hạng
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  description: String,
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('MembershipTier', membershipTierSchema);
