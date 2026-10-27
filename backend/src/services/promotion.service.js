// Tính khuyến mãi từ dữ liệu có thẩm quyền (giá lấy từ Product, không tin số tiền client gửi).
// Quy ước (Project Report ghi stacking/làm tròn là TBD, nên chọn cách an toàn nhất):
//  - Mỗi đơn áp dụng tối đa 1 khuyến mãi (không cộng dồn).
//  - 'percent': giảm value% trên tổng tiền các dòng đủ điều kiện, tối đa maxDiscount (nếu có), làm tròn xuống đồng.
//  - 'fixed'  : giảm value đồng một lần cho cả đơn, không vượt quá tổng tiền các dòng đủ điều kiện.
//  - Số tiền giảm được chia cho các dòng đủ điều kiện theo tỷ lệ thành tiền (dòng cuối nhận phần dư).
const { Promotion } = require('../models');

const isEligibleLine = (promo, line) => {
  if (promo.scope === 'all') return true;
  if (promo.scope === 'category') return promo.categoryIds.some((id) => String(id) === String(line.categoryId));
  if (promo.scope === 'product') return promo.productIds.some((id) => String(id) === String(line.productId));
  return false;
};

// Trạng thái hiệu lực: active nhưng ngoài khoảng ngày thì coi là không khả dụng
exports.isRunning = (promo, now = new Date()) =>
  promo.status === 'active' && promo.startDate <= now && promo.endDate >= now;

exports.findRunning = (filter = {}) => {
  const now = new Date();
  return Promotion.find({ ...filter, status: 'active', startDate: { $lte: now }, endDate: { $gte: now } });
};

// lines: [{ productId, categoryId, name, unitPrice, quantity }]
// Trả { applicable, reason?, eligibleSubtotal, discount, lines:[{...,lineSubtotal,discountAmount,lineTotal,eligible}] }
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
    return { applicable: false, reason: 'Khuyến mãi không áp dụng cho sản phẩm nào trong đơn hàng', eligibleSubtotal: 0, discount: 0, lines: out };
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
  return { applicable: discount > 0, reason: discount > 0 ? undefined : 'Khuyến mãi không tạo ra mức giảm nào cho đơn này', eligibleSubtotal, discount, lines: out };
};
