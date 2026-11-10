const mongoose = require('mongoose');
const entry = new mongoose.Schema({
  key: { type: String, required: true },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  orderCode: String,
  description: String,
  createdAt: { type: Date, required: true },
}, { _id: false });

// Balance and its journal move in the same document, including on standalone MongoDB.
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance: { type: Number, default: 0, min: 0 },
  entries: { type: [entry], default: [], select: false },
}, { timestamps: true });
module.exports = mongoose.model('Wallet', schema);
