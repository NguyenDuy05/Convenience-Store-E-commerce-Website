export const money = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
export const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(new Date(value))
    : '—';
export const labels = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Order confirmed',
  preparing: 'Preparing your bag',
  ready_for_pickup: 'Ready for pickup',
  completed: 'Picked up',
  cancelled: 'Cancelled',
  failed: 'Failed',
  unpaid: 'Unpaid',
  paid: 'Paid',
  refunded: 'Refunded to wallet',
  in_progress: 'In progress',
  vnpay: 'VNPay',
};
export const label = (value) => labels[value] || String(value || '').replaceAll('_', ' ');
export const quantityLimit = (stock) => Math.max(0, Math.min(99, Number(stock) || 0));
export function imageUrl(value, apiUrl) {
  if (!value || typeof value !== 'string') return null;
  const origin = new URL(apiUrl).origin;
  let path = value.trim();
  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      // Website-local library URLs must resolve to the reachable API on a phone.
      if (
        !['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname) ||
        !/^\/(images\/products|api\/products\/images\/file)\//.test(url.pathname)
      )
        return url.href;
      path = url.pathname;
    } catch {
      return null;
    }
  }
  if (/^(data|file|content):/i.test(path)) return path;
  if (path.startsWith('/images/products/')) {
    let name = path.split('/').pop();
    try {
      name = decodeURIComponent(name);
    } catch {
      /* Keep literal malformed percent. */
    }
    return origin + '/api/products/images/file/' + encodeURIComponent(name);
  }
  return origin + '/' + path.replace(/^\//, '');
}
export function estimatePrice(product, promotions = []) {
  let price = Number(product.price) || 0;
  const same = (a, b) => String(a?._id || a) === String(b?._id || b);
  for (const promo of promotions) {
    if (!(
      promo.scope === 'all' ||
      (promo.scope === 'product' &&
        (promo.products || promo.productIds || []).some((p) => same(p, product._id))) ||
      (promo.scope === 'category' &&
        (promo.categories || promo.categoryIds || []).some((c) => same(c, product.categoryId)))
    ))
      continue;
    let discount = Math.floor(promo.type === 'percent' ? (price * promo.value) / 100 : promo.value);
    if (promo.maxDiscount > 0) discount = Math.min(discount, promo.maxDiscount);
    price -= Math.max(0, Math.min(price, discount));
  }
  return price;
}
export function safePaymentUrl(value, apiUrl, development = false) {
  const url = new URL(value);
  if (
    url.protocol === 'https:' &&
    ['sandbox.vnpayment.vn', 'pay.vnpay.vn'].includes(url.hostname) &&
    !url.username &&
    !url.password
  )
    return url.href;
  if (
    development &&
    url.origin === new URL(apiUrl).origin &&
    url.pathname === '/api/payments/mock/pay'
  )
    return url.href;
  throw new Error('The payment address is not a supported VNPay gateway. Please contact support.');
}
export const ambiguousCheckout = (error) =>
  !error.response ||
  error.response.status >= 500 ||
  error.response.data?.details?.code === 'CHECKOUT_PROCESSING' ||
  error.response.data?.code === 'CHECKOUT_PROCESSING';
export const internalDestination = (value) =>
  typeof value === 'string' && value.length < 4096 && /^\/(?!\/)[a-zA-Z0-9_/?=&%().-]*$/.test(value)
    ? value
    : '/account';
