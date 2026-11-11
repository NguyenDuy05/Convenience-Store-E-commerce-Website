export const BRAND_NAME = 'QUICK';
export const LOGO_IMAGE = '';
export const HERO_IMAGE = '';
export const CATEGORY_IMAGES = {};
export const PRODUCT_IMAGES = {};

// Ảnh đầu tiên của sản phẩm
export const productImage = (p) => PRODUCT_IMAGES[p.sku] || p.images?.[0] || '';

// Định dạng tiền VND
export const money = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n) || 0);

const DEFAULT_META = { icon: 'shopping_basket', tint: '#e4e7ff' };
const CATEGORY_META = {
    snack: { icon: 'cookie', tint: '#fbe187' },
    'mi-lau-ly': { icon: 'ramen_dining', tint: '#ffdad6' },
    'banh-ngot': { icon: 'bakery_dining', tint: '#ffd9e2' },
    'nuoc-uong': { icon: 'local_drink', tint: '#d8e2ff' },
    sua: { icon: 'water_drop', tint: '#e0f2ff' },
    'com-nam-com-hop': { icon: 'rice_bowl', tint: '#b4f486' },
    'xuc-xich-do-an-nhanh': { icon: 'lunch_dining', tint: '#ffdcc2' },
};
// Icon và màu của danh mục
export const catMeta = (slug) => CATEGORY_META[slug] || DEFAULT_META;

export const MEAL_LABEL = { main: 'Main meal', light: 'Light meal', snack: 'Snack', beverage: 'Beverage' };

// Bỏ dấu + chữ thường để tìm kiếm không dấu
export const norm = (s = '') =>
    String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

// Lấy id từ giá trị (đối tượng hoặc chuỗi)
const idOf = (x) => String(x?._id || x);

// Khuyến mãi có áp dụng cho sản phẩm không
export function promoApplies(promo, product) {
    if (promo.scope === 'all') return true;
    if (promo.scope === 'category') {
        const cid = idOf(product.categoryId);
        return (promo.categories || promo.categoryIds || []).some((c) => idOf(c) === cid);
    }
    return (promo.products || promo.productIds || []).some((p) => idOf(p) === String(product._id));
}

// Số tiền giảm của khuyến mãi cho một sản phẩm
export function discountOf(promo, price) {
    let d = promo.type === 'percent' ? (price * promo.value) / 100 : promo.value;
    if (promo.maxDiscount) d = Math.min(d, promo.maxDiscount);
    return Math.min(Math.round(d), price);
}

// Khuyến mãi giảm nhiều nhất cho sản phẩm (chỉ để hiển thị)
export function bestPromo(product, promos) {
    if (!product || !Number.isFinite(Number(product.price))) {
        return null;
    }

    if (!Array.isArray(promos)) {
        promos = Array.isArray(promos?.items) ? promos.items : [];
    }

    let best = null;
    const price = Number(product.price);

    for (const promo of promos) {
        if (!promo || !promoApplies(promo, product)) continue;

        const amount = discountOf(promo, price);

        if (amount > 0 && (!best || amount > best.amount)) {
            best = {
                promo,
                amount,
                finalPrice: price - amount,
                percent: price > 0
                    ? Math.round((amount / price) * 100)
                    : 0
            };
        }
    }

    return best;
}

// Mô tả mức giảm của khuyến mãi (-10%, -5.000 đ)
export const promoValueText = (p) => (p.type === 'percent' ? `-${p.value}%` : `-${p.value} đ`);

// Mô tả phạm vi áp dụng của khuyến mãi
export function scopeText(p) {
    if (p.scope === 'all') return 'Entire store';
    const names = (p.scope === 'category' ? (p.categories || p.categoryIds || []) : (p.products || p.productIds || [])).map((x) => x?.name).filter(Boolean);
    return names.length ? names.join(', ') : p.scope === 'category' ? 'Selected categories' : 'Selected products';
}

// Số ngày còn lại của khuyến mãi
export const daysLeft = (end) => Math.max(0, Math.ceil((new Date(end) - Date.now()) / 86400000));

// Trạng thái kho để hiển thị (còn hàng / sắp hết / hết)
export function stockState(p) {
    const q = p.stockQuantity ?? 0;
    if (q <= 0) return { cls: 'out', text: 'Out of stock' };
    if (q <= (p.lowStockThreshold ?? 10)) return { cls: 'low', text: `Low stock · ${q} ${p.unit} left` };
    return { cls: 'ok', text: `In stock · ${q} ${p.unit}` };
}

// Cửa hàng hôm nay có đang mở không và giờ mở cửa
export function openInfo(store, date = new Date()) {
    if (!store) return null;
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    const d = store.openingHours?.find((h) => h.day === day);
    if (!d || d.isClosed || store.status === 'closed') return { open: false, text: 'Closed today' };
    const [oh, om] = d.openTime.split(':').map(Number);
    const [ch, cm] = d.closeTime.split(':').map(Number);
    const m = Number(parts.hour) * 60 + Number(parts.minute);
    return { open: m >= oh * 60 + om && m < ch * 60 + cm, text: `${d.openTime} – ${d.closeTime}` };
}
