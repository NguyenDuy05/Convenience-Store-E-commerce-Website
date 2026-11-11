// Che email: a*****@gmail.com
exports.maskEmail = (email) => {
  if (!email || !email.includes('@')) return null;
  const [name, domain] = email.split('@');
  return `${name.slice(0, 1)}${'*'.repeat(Math.max(Math.min(name.length - 1, 5), 2))}@${domain}`;
};

// Che số điện thoại: 090****567
exports.maskPhone = (phone) => {
  if (!phone) return null;
  const d = String(phone).trim();
  if (d.length <= 6) return '*'.repeat(d.length);
  return `${d.slice(0, 3)}${'*'.repeat(d.length - 6)}${d.slice(-3)}`;
};
