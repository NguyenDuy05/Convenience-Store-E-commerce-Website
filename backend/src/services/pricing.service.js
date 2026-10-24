// Tính giá đơn hàng ở SERVER (không tin giá từ client). Hàm thuần, không đụng DB.
// Thứ tự: giá hiện tại của sản phẩm -> khuyến mãi tự động (cộng dồn tuần tự trên phần còn lại của từng dòng)
// -> mã giảm giá (áp trên phần còn lại sau khuyến mãi). Tiền VND là số nguyên, làm tròn xuống để không giảm quá tay.

class DiscountCodeError extends Error {}

const inRange = (now, start, end) => now >= new Date(start) && now <= new Date(end);

const promoApplies = (promo, line) => {
  if (promo.scope === 'category') return (promo.categoryIds || []).some((c) => String(c) === String(line.categoryId));
  if (promo.scope === 'product') return (promo.productIds || []).some((p) => String(p) === String(line.productId));
  return true; // 'all'
};

const rawDiscount = (type, value, base, maxDiscount) => {
  let d = type === 'percent' ? Math.floor((base * value) / 100) : Math.floor(value);
  if (maxDiscount && maxDiscount > 0) d = Math.min(d, maxDiscount);
  return Math.max(Math.min(d, base), 0);
};

// Kiểm tra mã giảm giá. Ném DiscountCodeError với thông báo cho khách nếu không dùng được.
function validateDiscountCode(code, { amount, userUsedCount = 0, now = new Date() }) {
  if (!code || code.status !== 'active') throw new DiscountCodeError('Mã giảm giá không tồn tại hoặc không còn hiệu lực');
  if (!inRange(now, code.startDate, code.endDate)) throw new DiscountCodeError('Mã giảm giá đã hết hạn hoặc chưa đến thời gian áp dụng');
  if (typeof code.usageLimit === 'number' && code.usedCount >= code.usageLimit) throw new DiscountCodeError('Mã giảm giá đã hết lượt sử dụng');
  if (userUsedCount >= (code.perUserLimit || 1)) throw new DiscountCodeError('Bạn đã dùng hết số lần cho phép của mã này');
  if (amount < (code.minOrderAmount || 0)) {
    throw new DiscountCodeError(`Đơn tối thiểu ${new Intl.NumberFormat('vi-VN').format(code.minOrderAmount)}đ để dùng mã này`);
  }
}

// lines: [{ productId, categoryId, name, sku, unit, image, unitPrice, quantity }]
function computePricing({ lines, promotions = [], discountCode = null, userUsedCount = 0, now = new Date() }) {
  const rows = lines.map((l) => ({ ...l, gross: l.unitPrice * l.quantity, discountAmount: 0 }));
  const subtotal = rows.reduce((s, r) => s + r.gross, 0);

  const appliedPromotions = [];
  promotions.filter((p) => p.status === 'active' && inRange(now, p.startDate, p.endDate)).forEach((p) => {
    const eligible = rows.filter((r) => promoApplies(p, r) && r.gross - r.discountAmount > 0);
    const base = eligible.reduce((s, r) => s + (r.gross - r.discountAmount), 0);
    const total = rawDiscount(p.type, p.value, base, p.maxDiscount);
    if (total <= 0) return;
    // chia theo tỉ lệ giá trị còn lại của từng dòng; dòng cuối nhận phần dư để tổng khớp tuyệt đối
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
