exports.memberCode = (id) => `QUICK-${String(id).toUpperCase()}`;
exports.memberIdFromCode = (code) => {
  if (typeof code !== 'string' || !/^QUICK-[a-f0-9]{24}$/i.test(code.trim())) return null;
  return code.trim().slice(6).toLowerCase();
};
