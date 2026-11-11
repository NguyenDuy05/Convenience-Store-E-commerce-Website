const { User } = require('../models');

// Đổi index email của users thành unique chỉ cho tài khoản có email (thành viên tại quầy có thể không có email)
async function relaxUserEmailIndex() {
  let indexes = [];
  try { indexes = await User.collection.indexes(); } catch { return; }
  const legacy = indexes.find((i) => i.name === 'email_1' && !i.partialFilterExpression);
  if (legacy) {
    await User.collection.dropIndex('email_1');
    console.log('[migration] users.email_1 -> unique chỉ cho tài khoản có email');
  }
  await User.createIndexes();
}

// Chạy các bước cập nhật database khi server khởi động (chạy lại nhiều lần vẫn an toàn)
exports.run = async () => {
  try { await relaxUserEmailIndex(); } catch (e) { console.error('[migration] users email index:', e.message); }
};
