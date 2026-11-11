// Mã thành viên từ id khách: QUICK-<id>
exports.memberCode = (id) => `QUICK-${String(id).toUpperCase()}`;
// Lấy id khách từ mã thành viên QUICK-…
exports.memberIdFromCode = (code) => {
  if (typeof code !== 'string' || !/^QUICK-[a-f0-9]{24}$/i.test(code.trim())) return null;
  return code.trim().slice(6).toLowerCase();
};
