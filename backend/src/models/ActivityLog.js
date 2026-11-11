const mongoose = require('mongoose');
const { Schema } = mongoose;

const activityLogSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actorRole: { type: String, enum: ['customer', 'staff', 'admin'] },
  action: { type: String, required: true },
  targetType: String,
  targetId: Schema.Types.ObjectId,
  detail: Schema.Types.Mixed,
  ip: String,
}, { timestamps: { createdAt: true, updatedAt: false } });

activityLogSchema.index({ actorId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
