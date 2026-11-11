// Chỉnh index cũ khi khởi động (chạy nhiều lần vẫn an toàn).
const { User } = require('../models');

// Trước đây email là bắt buộc + unique toàn bộ. Nay thành viên tại quầy có thể không có email,
// nên index unique phải chỉ áp cho tài khoản có email (partial index).
async function relaxUserEmailIndex() {
  let indexes = [];
  try { indexes = await User.collection.indexes(); } catch { return; }   // collection chưa tồn tại
  const legacy = indexes.find((i) => i.name === 'email_1' && !i.partialFilterExpression);
  if (legacy) {
    await User.collection.dropIndex('email_1');
    console.log('[migration] users.email_1 -> unique chỉ cho tài khoản có email');
  }
  await User.createIndexes();
}

exports.run = async () => {
  try { await relaxUserEmailIndex(); } catch (e) { console.error('[migration] users email index:', e.message); }
};
