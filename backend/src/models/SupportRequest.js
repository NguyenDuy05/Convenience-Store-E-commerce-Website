// UC-12/13 (customer gửi / xem), UC-19.3 Handle Customer Complaint (staff xử lý). Phản hồi embed trong request.
const mongoose = require('mongoose');
const { Schema } = mongoose;

const responseSchema = new Schema({
  responderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  requestKey: String,                      // khoá chống ghi trùng phản hồi khi staff gửi lại do lỗi mạng (UC-19.3)
  createdAt: { type: Date, default: Date.now },
});

const supportRequestSchema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['support', 'complaint'], default: 'support' },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open', index: true },
  responses: [responseSchema],
  handledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('SupportRequest', supportRequestSchema);
