// Ca trống do admin mở: nhân viên tự đăng ký (mỗi lượt đăng ký tạo 1 WorkShift để chấm công vào/ra).
const mongoose = require('mongoose');
const { Schema } = mongoose;

const shiftSlotSchema = new Schema({
  shiftDate: { type: Date, required: true, index: true },     // 00:00 ngày bắt đầu ca (giờ máy chủ)
  startTime: { type: String, required: true },                // "06:00"
  endTime: { type: String, required: true },                  // "14:00" (<= startTime: ca qua đêm)
  capacity: { type: Number, required: true, min: 1, max: 20 },// số nhân viên cần cho ca
  filled: { type: Number, default: 0, min: 0 },               // số người đã nhận (tăng/giảm có điều kiện, chống vượt chỗ)
  note: String,                                               // vd. "Thu ngân", "Nhận hàng"
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ShiftSlot', shiftSlotSchema);
