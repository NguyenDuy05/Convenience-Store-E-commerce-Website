const { Promotion } = require('../models');

// Dòng hàng có thuộc phạm vi của khuyến mãi không
const isEligibleLine = (promo, line) => {
  if (promo.scope === 'all') return true;
  if (promo.scope === 'category') return promo.categoryIds.some((id) => String(id) === String(line.categoryId));
  if (promo.scope === 'product') return promo.productIds.some((id) => String(id) === String(line.productId));
  return false;
};

// Khuyến mãi có đang chạy không (đang bật và trong khoảng ngày)
exports.isRunning = (promo, now = new Date()) =>
  promo.status === 'active' && promo.startDate <= now && promo.endDate >= now;

// Lấy các khuyến mãi đang chạy
exports.findRunning = (filter = {}) => {
  const now = new Date();
  return Promotion.find({ ...filter, status: 'active', startDate: { $lte: now }, endDate: { $gte: now } });
};

// Tính khuyến mãi cho các dòng hàng: có áp dụng không và giảm bao nhiêu
exports.evaluate = (promo, lines) => {
  const out = lines.map((l) => ({
    ...l,
    lineSubtotal: l.unitPrice * l.quantity,
    eligible: isEligibleLine(promo, l),
    discountAmount: 0,
  }));
  const eligible = out.filter((l) => l.eligible);
  const eligibleSubtotal = eligible.reduce((s, l) => s + l.lineSubtotal, 0);
  if (!eligible.length || eligibleSubtotal <= 0) {
    return { applicable: false, reason: 'This promotion does not apply to any items in the order', eligibleSubtotal: 0, discount: 0, lines: out };
  }

  let discount = promo.type === 'percent'
    ? Math.floor((eligibleSubtotal * promo.value) / 100)
    : Math.floor(promo.value);
  if (promo.type === 'percent' && promo.maxDiscount != null) discount = Math.min(discount, promo.maxDiscount);
  discount = Math.max(0, Math.min(discount, eligibleSubtotal));

  let remaining = discount;
  eligible.forEach((l, i) => {
    const share = i === eligible.length - 1 ? remaining : Math.floor((discount * l.lineSubtotal) / eligibleSubtotal);
    l.discountAmount = share;
    remaining -= share;
  });
  out.forEach((l) => { l.lineTotal = l.lineSubtotal - l.discountAmount; });
  return { applicable: discount > 0, reason: discount > 0 ? undefined : 'This promotion provides no discount for this order', eligibleSubtotal, discount, lines: out };
};
