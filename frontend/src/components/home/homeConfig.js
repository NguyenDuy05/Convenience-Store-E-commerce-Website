// ============================================================
//  THƯƠNG HIỆU + ẢNH: để trống, thêm sau. Đặt ảnh vào frontend/public/images/...
//  rồi điền đường dẫn (bắt đầu bằng "/") vào các biến dưới đây.
// ============================================================
export const BRAND_NAME = 'Convenience Store';   // tên hiển thị ở header/footer
export const LOGO_IMAGE = '';                    // vd '/images/logo.png' (trống = dùng icon)
export const HERO_IMAGE = '';                    // vd '/images/hero.jpg'
export const CATEGORY_IMAGES = {};               // vd { snack: '/images/cat/snack.jpg' } (khóa = slug danh mục)
export const PRODUCT_IMAGES = {};                // vd { SP001: '/images/products/sp001.jpg' } (khóa = mã SKU)
// Nếu sản phẩm trong DB có product.images[0] thì cũng tự dùng ảnh đó.

export const productImage = (p) => PRODUCT_IMAGES[p.sku] || p.images?.[0] || '';

// ---------- Tiền tệ: 1 nghìn đồng => "1000 đ" ----------
export const money = (n) => `${Math.round(Number(n) || 0)} đ`;

// Icon + màu nền ô ảnh trống theo danh mục (khóa = slug)
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
export const catMeta = (slug) => CATEGORY_META[slug] || DEFAULT_META;

export const MEAL_LABEL = { main: 'Main meal', light: 'Light meal', snack: 'Snack', beverage: 'Beverage' };

// Bỏ dấu + chữ thường để gõ "banh" vẫn ra "Bánh"
export const norm = (s = '') =>
    String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

const idOf = (x) => String(x?._id || x);

// ---------- Khuyến mãi ----------
export function promoApplies(promo, product) {
    if (promo.scope === 'all') return true;
    if (promo.scope === 'category') {
        const cid = idOf(product.categoryId);
        return (promo.categoryIds || []).some((c) => idOf(c) === cid);
    }
    return (promo.productIds || []).some((p) => idOf(p) === String(product._id));
}

export function discountOf(promo, price) {
    let d = promo.type === 'percent' ? (price * promo.value) / 100 : promo.value;
    if (promo.maxDiscount) d = Math.min(d, promo.maxDiscount);
    return Math.min(Math.round(d), price);
}

// Chọn khuyến mãi giảm nhiều nhất cho sản phẩm (hiển thị tham khảo, không cộng dồn)
export function bestPromo(product, promos) {
    let best = null;
    for (const promo of promos) {
        if (!promoApplies(promo, product)) continue;
        const amount = discountOf(promo, product.price);
        if (amount > 0 && (!best || amount > best.amount)) {
            best = { promo, amount, finalPrice: product.price - amount, percent: Math.round((amount / product.price) * 100) };
        }
    }
    return best;
}

export const promoValueText = (p) => (p.type === 'percent' ? `-${p.value}%` : `-${p.value} đ`);

export function scopeText(p) {
    if (p.scope === 'all') return 'Entire store';
    const names = (p.scope === 'category' ? p.categoryIds : p.productIds || []).map((x) => x?.name).filter(Boolean);
    return names.length ? names.join(', ') : p.scope === 'category' ? 'Selected categories' : 'Selected products';
}

export const daysLeft = (end) => Math.max(0, Math.ceil((new Date(end) - Date.now()) / 86400000));

// ---------- Kho ----------
export function stockState(p) {
    const q = p.stockQuantity ?? 0;
    if (q <= 0) return { cls: 'out', text: 'Out of stock' };
    if (q <= (p.lowStockThreshold ?? 10)) return { cls: 'low', text: `Low stock · ${q} ${p.unit} left` };
    return { cls: 'ok', text: `In stock · ${q} ${p.unit}` };
}

// ---------- Giờ mở cửa hôm nay ----------
export function openInfo(store) {
    if (!store) return null;
    const d = store.openingHours?.find((h) => h.day === new Date().getDay());
    if (!d || d.isClosed || store.status === 'closed') return { open: false, text: 'Closed today' };
    const [oh, om] = d.openTime.split(':').map(Number);
    const [ch, cm] = d.closeTime.split(':').map(Number);
    const now = new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    return { open: m >= oh * 60 + om && m < ch * 60 + cm, text: `${d.openTime} – ${d.closeTime}` };
}