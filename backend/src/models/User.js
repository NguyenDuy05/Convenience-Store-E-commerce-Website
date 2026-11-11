const mongoose = require('mongoose');
const { Schema } = mongoose;

const addressSchema = new Schema({
  label: { type: String, trim: true },
  receiverName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  addressLine: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new Schema({
  role: { type: String, enum: ['customer', 'staff', 'admin'], required: true, index: true },
  fullName: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  avatarUrl: String,
  dateOfBirth: Date,
  googleId: String,

  status: { type: String, enum: ['active', 'locked', 'deleted'], default: 'active', index: true },
  failedLoginCount: { type: Number, default: 0 },
  lockedUntil: Date,
  lastLoginAt: Date,
  signupChannel: { type: String, enum: ['online', 'google', 'counter'] },
  registeredBy: { type: Schema.Types.ObjectId, ref: 'User' },

  passwordReset: {
    tokenHash: { type: String, select: false },
    expiresAt: Date,
  },

  addresses: [addressSchema],
  membership: {
    earnedOrders: { type: [{ orderId: Schema.Types.ObjectId, points: Number, balanceAfter: Number, _id: false }], default: [], select: false },
    tierId: { type: Schema.Types.ObjectId, ref: 'MembershipTier' },
    points: { type: Number, default: 0, min: 0 },
    lifetimePoints: { type: Number, default: 0, min: 0 },
  },

  staffInfo: {
    employeeCode: String,
    position: String,
    hiredAt: Date,
  },
}, { timestamps: true });

userSchema.index({ email: 1 }, { name: 'email_1', unique: true, partialFilterExpression: { email: { $type: 'string' } } });

module.exports = mongoose.model('User', userSchema);
