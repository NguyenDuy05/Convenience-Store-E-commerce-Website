// BR-20: tạo đơn phải "tất cả hoặc không gì cả".
// - Có replica set / Atlas: chạy trong MongoDB transaction (lỗi giữa chừng thì tự rollback toàn bộ).
// - MongoDB đơn lẻ (standalone, hay gặp khi chạy local): transaction không dùng được -> chạy tuần tự,
//   mỗi bước đăng ký hàm hoàn tác bằng ctx.onRollback(fn); nếu lỗi thì chạy ngược các hàm đó.
const mongoose = require('mongoose');

let supported; // cache kết quả kiểm tra

async function supportsTransactions() {
  if (supported !== undefined) return supported;
  try {
    const info = await mongoose.connection.db.admin().command({ hello: 1 });
    supported = !!(info.setName || info.msg === 'isdbgrid');
  } catch {
    supported = false;
  }
  return supported;
}

// work(ctx) với ctx = { session | null, onRollback(fn) }. Các thao tác DB phải truyền { session } nếu có.
async function runAtomic(work) {
  if (await supportsTransactions()) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => { result = await work({ session, onRollback: () => {} }); });
      return result;
    } finally {
      await session.endSession();
    }
  }
  const undo = [];
  try {
    return await work({ session: null, onRollback: (fn) => undo.push(fn) });
  } catch (err) {
    for (const fn of undo.reverse()) {
      try { await fn(); } catch (e) { console.error('Hoàn tác thất bại:', e); }
    }
    throw err;
  }
}

module.exports = { runAtomic, supportsTransactions };
