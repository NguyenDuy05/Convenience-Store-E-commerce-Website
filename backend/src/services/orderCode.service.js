const { Counter } = require('../models');

// Sinh mã đơn CM-YYYYMMDD-0001 (đếm lại mỗi ngày)
exports.generateOrderCode = async () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const counter = await Counter.findOneAndUpdate(
    { _id: `order-${ymd}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `CM-${ymd}-${String(counter.seq).padStart(4, '0')}`;
};
