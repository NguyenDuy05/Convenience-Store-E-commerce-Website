const mongoose = require('mongoose');
const { Schema } = mongoose;

const shiftSlotSchema = new Schema({
  shiftDate: { type: Date, required: true, index: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  capacity: { type: Number, required: true, min: 1, max: 20 },
  filled: { type: Number, default: 0, min: 0 },
  note: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ShiftSlot', shiftSlotSchema);
