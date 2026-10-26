export const vnd = (n) => `₫${Number(n || 0).toLocaleString('en-US')}`;
export const errMsg = (err, fallback) => err?.response?.data?.errors?.join(', ') || err?.response?.data?.message || fallback;

export const MEAL_TYPES = [
    { value: 'main', label: 'Main meal (instant noodles, rice, hot food)' },
    { value: 'light', label: 'Light meal (sandwich, bánh mì)' },
    { value: 'snack', label: 'Snack' },
    { value: 'beverage', label: 'Beverage / milk' },
];
export const mealLabel = (v) => MEAL_TYPES.find((m) => m.value === v)?.label.split(' (')[0] || v;

// Trạng thái hiển thị = status bán + mức tồn kho
export function stockState(p) {
    if (p.status === 'inactive') return { key: 'inactive', label: 'Inactive' };
    if (p.stockQuantity <= 0) return { key: 'out', label: 'Out of stock' };
    if (p.stockQuantity <= (p.lowStockThreshold ?? 0)) return { key: 'low', label: 'Low stock' };
    return { key: 'active', label: 'Active' };
}

export const categoryName = (p) => p.categoryId?.name || '—';
export const shortDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');