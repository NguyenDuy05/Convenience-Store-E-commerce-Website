// UC-25 Manage Work Shift: ca làm (lịch) + chấm công vào/ra
const mongoose = require('mongoose');
const { Schema } = mongoose;

const workShiftSchema = new Schema({
  staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  slotId: { type: Schema.Types.ObjectId, ref: 'ShiftSlot', index: true },   // ca nhân viên tự nhận từ ca trống của admin
  shiftDate: { type: Date, required: true },
  startTime: { type: String, required: true },                // "07:00" (giờ theo lịch)
  endTime: { type: String, required: true },                  // "15:00"
  clockInAt: Date,                                            // giờ thực tế vào ca
  clockOutAt: Date,
  status: { type: String, enum: ['scheduled', 'in_progress', 'completed', 'missed'], default: 'scheduled' },
  note: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

workShiftSchema.index({ staffId: 1, shiftDate: -1 });
// Một nhân viên chỉ nhận một lần cho mỗi ca trống (chặn bấm đúp / gửi song song)
workShiftSchema.index({ slotId: 1, staffId: 1 }, { unique: true, partialFilterExpression: { slotId: { $type: 'objectId' } } });

module.exports = mongoose.model('WorkShift', workShiftSchema);
