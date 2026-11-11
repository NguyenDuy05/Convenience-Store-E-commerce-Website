const mongoose = require('mongoose');
const { Schema } = mongoose;

const workShiftSchema = new Schema({
  staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  slotId: { type: Schema.Types.ObjectId, ref: 'ShiftSlot', index: true },
  shiftDate: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  clockInAt: Date,
  clockOutAt: Date,
  status: { type: String, enum: ['scheduled', 'in_progress', 'completed', 'missed'], default: 'scheduled' },
  note: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

workShiftSchema.index({ staffId: 1, shiftDate: -1 });
workShiftSchema.index({ slotId: 1, staffId: 1 }, { unique: true, partialFilterExpression: { slotId: { $type: 'objectId' } } });

module.exports = mongoose.model('WorkShift', workShiftSchema);
