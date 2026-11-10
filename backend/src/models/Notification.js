const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 4000 },
  type: { type: String, enum: ['general', 'order', 'payment', 'event', 'voucher', 'promotion'], default: 'general' },
  audience: { type: String, enum: ['all', 'customer', 'staff', 'admin', 'users'], required: true },
  recipientIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  link: { type: String, default: '', maxlength: 500 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  publishedAt: Date,
  expiresAt: Date,
  sourceKey: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
schema.index({ status: 1, publishedAt: -1, audience: 1 });
schema.index({ recipientIds: 1, status: 1, publishedAt: -1 });
schema.index({ sourceKey: 1 }, { unique: true, partialFilterExpression: { sourceKey: { $type: 'string' } } });
module.exports = mongoose.model('Notification', schema);
