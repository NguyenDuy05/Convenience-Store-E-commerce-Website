const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  notificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  readAt: { type: Date, required: true },
});
schema.index({ userId: 1, notificationId: 1 }, { unique: true });
module.exports = mongoose.model('NotificationReceipt', schema);
