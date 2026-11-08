// Che bớt dữ liệu liên hệ khi hiển thị cho nhân viên: chỉ giữ đủ để nhận ra khách, không lộ toàn bộ.
exports.maskEmail = (email) => {
  if (!email || !email.includes('@')) return null;
  const [name, domain] = email.split('@');
  return `${name.slice(0, 1)}${'*'.repeat(Math.max(Math.min(name.length - 1, 5), 2))}@${domain}`;
};

// 0901234567 -> 090****567 (giữ 3 số đầu và 3 số cuối)
exports.maskPhone = (phone) => {
  if (!phone) return null;
  const d = String(phone).trim();
  if (d.length <= 6) return '*'.repeat(d.length);
  return `${d.slice(0, 3)}${'*'.repeat(d.length - 6)}${d.slice(-3)}`;
};
