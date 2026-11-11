class DiscountCodeError extends Error {}

// Thời điểm hiện tại có nằm trong khoảng ngày bắt đầu / kết thúc không
const inRange = (now, start, end) => now >= new Date(start) && now <= new Date(end);

// Khuyến mãi có áp dụng cho dòng hàng này không (theo phạm vi)
const promoApplies = (promo, line) => {
  if (promo.scope === 'category') return (promo.categoryIds || []).some((c) => String(c) === String(line.categoryId));
  if (promo.scope === 'product') return (promo.productIds || []).some((p) => String(p) === String(line.productId));
  return true;
};

// Số tiền giảm của mã giảm giá trước khi giới hạn
const rawDiscount = (type, value, base, maxDiscount) => {
  let d = type === 'percent' ? Math.floor((base * value) / 100) : Math.floor(value);
  if (maxDiscount && maxDiscount > 0) d = Math.min(d, maxDiscount);
  return Math.max(Math.min(d, base), 0);
};

// Kiểm tra mã giảm giá dùng được không (thời gian, lượt, đơn tối thiểu)
function validateDiscountCode(code, { amount, userUsedCount = 0, now = new Date() }) {
  if (!code || code.status !== 'active') throw new DiscountCodeError("This discount code does not exist or is unavailable");
  if (!inRange(now, code.startDate, code.endDate)) throw new DiscountCodeError("This discount code has expired or has not started yet");
  if (typeof code.usageLimit === 'number' && code.usedCount >= code.usageLimit) throw new DiscountCodeError("This discount code has reached its usage limit");
  if (userUsedCount >= (code.perUserLimit || 1)) throw new DiscountCodeError("You have reached the usage limit for this discount code");
  if (amount < (code.minOrderAmount || 0)) {
    throw new DiscountCodeError(`Minimum order: ${new Intl.NumberFormat('vi-VN').format(code.minOrderAmount)}đ to use this code`);
  }
}

// Tính giá đơn: tạm tính, khuyến mãi, mã giảm giá, tổng tiền
function computePricing({ lines, promotions = [], discountCode = null, userUsedCount = 0, now = new Date() }) {
  const rows = lines.map((l) => ({ ...l, gross: l.unitPrice * l.quantity, discountAmount: 0 }));
  const subtotal = rows.reduce((s, r) => s + r.gross, 0);

  const appliedPromotions = [];
  promotions.filter((p) => p.status === 'active' && inRange(now, p.startDate, p.endDate)).forEach((p) => {
    const eligible = rows.filter((r) => promoApplies(p, r) && r.gross - r.discountAmount > 0);
    const base = eligible.reduce((s, r) => s + (r.gross - r.discountAmount), 0);
    const total = rawDiscount(p.type, p.value, base, p.maxDiscount);
    if (total <= 0) return;
    let given = 0;
    eligible.forEach((r, i) => {
      const share = i === eligible.length - 1 ? total - given : Math.floor((total * (r.gross - r.discountAmount)) / base);
      r.discountAmount += share;
      given += share;
    });
    appliedPromotions.push({ promotionId: p._id, name: p.name, amount: total });
  });

  const promotionDiscount = rows.reduce((s, r) => s + r.discountAmount, 0);
  const afterPromo = subtotal - promotionDiscount;

  let code = null;
  if (discountCode) {
    validateDiscountCode(discountCode, { amount: afterPromo, userUsedCount, now });
    const amount = rawDiscount(discountCode.type, discountCode.value, afterPromo, discountCode.maxDiscount);
    code = { codeId: discountCode._id, code: discountCode.code, amount };
  }

  const totalAmount = afterPromo - (code ? code.amount : 0);
  return {
    lines: rows.map(({ gross, ...r }) => ({ ...r, lineTotal: gross - r.discountAmount })),
    subtotal,
    appliedPromotions,
    promotionDiscount,
    discountCode: code,
    totalAmount,
  };
}

module.exports = { computePricing, validateDiscountCode, DiscountCodeError };
