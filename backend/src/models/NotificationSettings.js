const mongoose = require('mongoose');
module.exports = mongoose.model('NotificationSettings', new mongoose.Schema({
  _id: { type: String, default: 'global' },
  orders: { type: Boolean, default: true },
  payments: { type: Boolean, default: true },
  staffOrders: { type: Boolean, default: true },
  vouchers: { type: Boolean, default: true },
  promotions: { type: Boolean, default: true },
}, { timestamps: true }));
