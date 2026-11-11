import Constants from 'expo-constants';

// Địa chỉ API backend. Ưu tiên biến EXPO_PUBLIC_API_URL (file mobile/.env).
// Nếu không đặt, tự lấy IP máy đang chạy Expo (điện thoại và máy tính phải cùng Wi-Fi), backend mặc định cổng 5000.
function detect() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  const host = (Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost || '').split(':')[0];
  return `http://${host || 'localhost'}:5000/api`;
}

export const API_URL = detect();

// Gốc của backend (bỏ "/api"): ảnh lưu dạng "/uploads/..." được ghép với địa chỉ này
export const ASSET_BASE = API_URL.replace(/\/api\/?$/, '');
export const imageUri = (u) => (!u ? null : /^(https?:|data:|file:)/i.test(u) ? u : `${ASSET_BASE}${u.startsWith('/') ? '' : '/'}${u}`);
