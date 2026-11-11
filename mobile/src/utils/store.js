export const DAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// Trạng thái mở cửa hiện tại: { open, text, closesAt? }
export function storeStatus(store, now = new Date()) {
  if (!store) return null;
  if (store.status === 'closed') return { open: false, text: 'Cửa hàng tạm đóng cửa' };
  const h = (store.openingHours || []).find((x) => x.day === now.getDay());
  if (!h || h.isClosed) return { open: false, text: 'Hôm nay cửa hàng nghỉ' };
  const cur = hhmm(now);
  if (cur < h.openTime) return { open: false, text: `Mở cửa lúc ${h.openTime} hôm nay` };
  if (cur > h.closeTime) return { open: false, text: `Đã đóng cửa lúc ${h.closeTime}` };
  return { open: true, text: `Mở cửa đến ${h.closeTime}` };
}

export const mapsUrl = (store) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store.name} ${store.address || ''}`.trim())}`;
