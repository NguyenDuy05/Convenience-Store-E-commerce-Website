const mongoose = require('mongoose');
const { WalletWithdrawal } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const wallet = require('../services/wallet.service');
const { logActivity } = require('../services/activity.service');

const MIN_AMOUNT = 10000;
// Kiểm tra chuỗi bắt buộc có độ dài hợp lệ
const textOf = (v, label, min, max) => {
  const t = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';
  if (t.length < min || t.length > max) throw new ApiError(400, `${label} must be ${min}–${max} characters`);
  return t;
};
// Dữ liệu yêu cầu rút tiền trả về (che bớt số tài khoản)
const view = (w, full = false) => ({
  _id: w._id, amount: w.amount, bankName: w.bankName, accountName: w.accountName,
  accountNumber: full ? w.accountNumber : `****${String(w.accountNumber).slice(-4)}`,
  status: w.status, reference: w.reference || null, note: w.note || null, createdAt: w.createdAt, processedAt: w.processedAt || null,
  ...(w.userId?.fullName ? { customer: { _id: w.userId._id, fullName: w.userId.fullName, email: w.userId.email } } : {}),
});

// Khách gửi yêu cầu rút tiền từ ví về tài khoản ngân hàng (giữ tiền ngay trong ví)
exports.requestWithdrawal = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const amount = Number(b.amount);
  if (!Number.isSafeInteger(amount) || amount < MIN_AMOUNT) throw new ApiError(400, `Minimum withdrawal is ${MIN_AMOUNT.toLocaleString('vi-VN')}đ`);
  const bankName = textOf(b.bankName, 'Bank name', 2, 100);
  const accountName = textOf(b.accountName, 'Account holder', 2, 100).toUpperCase();
  const accountNumber = String(b.accountNumber || '').replace(/\s/g, '');
  if (!/^\d{6,20}$/.test(accountNumber)) throw new ApiError(400, 'Account number must be 6–20 digits');
  if (amount > await wallet.balance(req.user.id)) throw new ApiError(409, 'The amount is higher than your wallet balance', { code: 'INSUFFICIENT_BALANCE' });
  const w = await WalletWithdrawal.create({ userId: req.user.id, amount, bankName, accountName, accountNumber });
  try {
    await wallet.move(req.user.id, { key: `withdraw:${w._id}`, amount: -amount, description: `Withdrawal to ${bankName} ****${accountNumber.slice(-4)} (pending)` });
  } catch (e) {
    await WalletWithdrawal.deleteOne({ _id: w._id });
    throw new ApiError(409, 'The amount is higher than your wallet balance', { code: 'INSUFFICIENT_BALANCE' });
  }
  res.status(201).json(view(w));
});

// Khách xem các yêu cầu rút tiền của mình
exports.listMyWithdrawals = asyncHandler(async (req, res) => {
  const rows = await WalletWithdrawal.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ items: rows.map((w) => view(w)) });
});

// Admin xem yêu cầu rút tiền (lọc theo trạng thái)
exports.listWithdrawals = asyncHandler(async (req, res) => {
  const status = ['pending', 'paid', 'rejected'].includes(req.query.status) ? req.query.status : undefined;
  const rows = await WalletWithdrawal.find(status ? { status } : {}).populate('userId', 'fullName email').sort({ status: 1, createdAt: -1 }).limit(200).lean();
  res.json({ items: rows.map((w) => view(w, true)), pendingCount: await WalletWithdrawal.countDocuments({ status: 'pending' }) });
});

// Admin xử lý yêu cầu rút tiền: đã chuyển khoản (ghi mã giao dịch) hoặc từ chối (trả tiền lại vào ví)
exports.processWithdrawal = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, 'Request not found');
  const { action } = req.body || {};
  if (!['paid', 'rejected'].includes(action)) throw new ApiError(400, 'Action must be paid or rejected');
  const extra = action === 'paid' ? { reference: textOf(req.body.reference, 'Transfer reference', 3, 100) } : { note: textOf(req.body.note, 'Reason', 3, 300) };
  const w = await WalletWithdrawal.findOneAndUpdate({ _id: req.params.id, status: 'pending' }, { $set: { status: action, ...extra, processedBy: req.user.id, processedAt: new Date() } }, { new: true });
  if (!w) throw new ApiError(409, 'This request has already been processed');
  if (action === 'rejected') await wallet.move(w.userId, { key: `withdraw-return:${w._id}`, amount: w.amount, description: `Withdrawal rejected: ${extra.note}` });
  await logActivity(req, { action: action === 'paid' ? 'WITHDRAWAL_PAID' : 'WITHDRAWAL_REJECTED', targetType: 'WalletWithdrawal', targetId: w._id, detail: { amount: w.amount, ...extra } });
  res.json(view(w.toObject(), true));
});
