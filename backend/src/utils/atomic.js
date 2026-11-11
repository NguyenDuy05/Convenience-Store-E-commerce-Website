const mongoose = require('mongoose');

let supported;

// Kiểm tra MongoDB có hỗ trợ transaction không (lưu lại kết quả)
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

// Chạy nhiều thao tác như một khối: dùng transaction nếu có, không thì tự hoàn tác khi lỗi
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
      try { await fn(); } catch (e) { console.error("Rollback failed:", e); }
    }
    throw err;
  }
}

module.exports = { runAtomic, supportsTransactions };
