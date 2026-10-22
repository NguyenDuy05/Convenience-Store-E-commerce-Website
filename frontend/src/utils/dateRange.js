// Tiện ích ngày cho bộ lọc lịch sử. Ngày trên URL dạng YYYY-MM-DD theo giờ máy người dùng.
const pad = (n) => String(n).padStart(2, '0');

export const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const daysAgoYMD = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return toYMD(d); };

export const monthsAgoYMD = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n); return toYMD(d); };

const isYMD = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !Number.isNaN(new Date(`${v}T00:00:00`).getTime());
export const validYMD = (v) => (isYMD(v) ? v : '');

// 00:00:00.000 và 23:59:59.999 của ngày đó theo giờ địa phương, đổi sang ISO để gửi server
export const dayStartISO = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString(); };
export const dayEndISO = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString(); };
