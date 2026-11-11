import { formatCurrency } from './format';

// Hai id có giống nhau không
const sameId = (a, b) => String(a?._id || a) === String(b?._id || b);

// Giá sau khuyến mãi ước tính cho một sản phẩm (cùng cách tính với backend)
export function estimatePromo(product, promotions) {
    let price = product.price;
    const applied = [];
    promotions.forEach((p) => {
        const applies = p.scope === 'all'
            || (p.scope === 'category' && (p.categoryIds || p.categories || []).some((c) => sameId(c, product.categoryId)))
            || (p.scope === 'product' && (p.productIds || p.products || []).some((x) => sameId(x, product._id)));
        if (!applies) return;
        let d = p.type === 'percent' ? Math.floor((price * p.value) / 100) : Math.floor(p.value);
        if (p.maxDiscount > 0) d = Math.min(d, p.maxDiscount);
        d = Math.max(Math.min(d, price), 0);
        if (d > 0) { price -= d; applied.push({ name: p.name, label: p.type === 'percent' ? `-${p.value}%` : `-${formatCurrency(p.value)}` }); }
    });
    return { price, applied };
}
