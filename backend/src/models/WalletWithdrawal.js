const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 1 },
  bankName: { type: String, required: true, trim: true },
  accountNumber: { type: String, required: true, trim: true },
  accountName: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'paid', 'rejected'], default: 'pending', index: true },
  reference: String,
  note: String,
  processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  processedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('WalletWithdrawal', schema);
