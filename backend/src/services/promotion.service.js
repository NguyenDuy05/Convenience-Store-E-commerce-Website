// Calculate discounts from authoritative Product prices rather than client-provided amounts.
// Discount rules (stacking and rounding are unspecified in the project report):
//  - Apply at most one promotion per order; promotions do not stack.
//  - 'percent': apply value% to eligible lines, capped by maxDiscount when set, rounded down to whole VND.
//  - 'fixed'  : apply value VND once per order, capped at the eligible subtotal.
//  - Allocate the discount proportionally across eligible lines; the last line receives the remainder.
const { Promotion } = require('../models');

const isEligibleLine = (promo, line) => {
  if (promo.scope === 'all') return true;
  if (promo.scope === 'category') return promo.categoryIds.some((id) => String(id) === String(line.categoryId));
  if (promo.scope === 'product') return promo.productIds.some((id) => String(id) === String(line.productId));
  return false;
};

// Active promotions outside their date range are unavailable
exports.isRunning = (promo, now = new Date()) =>
  promo.status === 'active' && promo.startDate <= now && promo.endDate >= now;

exports.findRunning = (filter = {}) => {
  const now = new Date();
  return Promotion.find({ ...filter, status: 'active', startDate: { $lte: now }, endDate: { $gte: now } });
};

// lines: [{ productId, categoryId, name, unitPrice, quantity }]
// Returns { applicable, reason?, eligibleSubtotal, discount, lines:[{...,lineSubtotal,discountAmount,lineTotal,eligible}] }
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
