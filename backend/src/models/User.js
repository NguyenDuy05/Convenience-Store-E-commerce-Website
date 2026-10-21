// UC-01, 03-07, 14-17, 20, 26-30  (Customer / Staff / Admin dùng chung 1 collection, phân biệt bằng role)
const mongoose = require('mongoose');
const { Schema } = mongoose;

// UC-07 Manage Customer Address (embed: địa chỉ chỉ thuộc về 1 user)
const addressSchema = new Schema({
  label: { type: String, trim: true },            // Nhà, Công ty...
  receiverName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  addressLine: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new Schema({
  role: { type: String, enum: ['customer', 'staff', 'admin'], required: true, index: true },
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  passwordHash: { type: String, required: true, select: false },   // bcrypt
  avatarUrl: String,
  googleId: String,                                                  // đăng nhập bằng Google (Google user id)

  // active | locked (staff bị admin khóa / customer bị khóa do nhập sai) | deleted (xóa mềm)
  status: { type: String, enum: ['active', 'locked', 'deleted'], default: 'active', index: true },
  failedLoginCount: { type: Number, default: 0 },
  lockedUntil: Date,                                                // UC-29.5 Unlock Customer Account
  lastLoginAt: Date,

  // UC-05, UC-16 Forgot Password (chỉ lưu hash của token)
  passwordReset: {
    tokenHash: { type: String, select: false },
    expiresAt: Date,
  },

  // --- chỉ dùng cho customer ---
  addresses: [addressSchema],
  membership: {                                                     // UC-12, UC-39
    tierId: { type: Schema.Types.ObjectId, ref: 'MembershipTier' },
    points: { type: Number, default: 0, min: 0 },                   // điểm hiện có (dùng để đổi)
    lifetimePoints: { type: Number, default: 0, min: 0 },           // tổng điểm tích lũy (dùng xét hạng)
  },

  // --- chỉ dùng cho staff ---
  staffInfo: {
    employeeCode: String,
    position: String,
    hiredAt: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);