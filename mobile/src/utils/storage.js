import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Dữ liệu chỉ lưu trên máy (không cần backend): sản phẩm yêu thích, đã xem gần đây, lịch sử tìm kiếm.
// Mỗi danh sách lưu theo từng tài khoản (hoặc "guest") để đổi tài khoản không lẫn dữ liệu.
const listeners = new Map();
const cache = new Map();

const fullKey = (name, userId) => `qs:${name}:${userId || 'guest'}`;

async function read(key) {
  if (cache.has(key)) return cache.get(key);
  let v = [];
  try { v = JSON.parse((await AsyncStorage.getItem(key)) || '[]'); } catch { v = []; }
  if (!Array.isArray(v)) v = [];
  cache.set(key, v);
  return v;
}
async function write(key, v) {
  cache.set(key, v);
  (listeners.get(key) || []).forEach((fn) => fn(v));
  try { await AsyncStorage.setItem(key, JSON.stringify(v)); } catch { /* bỏ qua: không lưu được thì chỉ mất khi tắt app */ }
}

// Danh sách có giới hạn, phần tử mới nhất ở đầu. idOf: lấy khóa so trùng.
export function useStoredList(name, userId, { limit = 30, idOf = (x) => x } = {}) {
  const key = fullKey(name, userId);
  const [items, setItems] = useState(cache.get(key) || []);
  useEffect(() => {
    let alive = true;
    read(key).then((v) => { if (alive) setItems(v); });
    const fn = (v) => setItems(v);
    listeners.set(key, [...(listeners.get(key) || []), fn]);
    return () => { alive = false; listeners.set(key, (listeners.get(key) || []).filter((x) => x !== fn)); };
  }, [key]);

  const push = useCallback(async (item) => {
    const cur = await read(key);
    await write(key, [item, ...cur.filter((x) => idOf(x) !== idOf(item))].slice(0, limit));
  }, [key, limit]); // eslint-disable-line react-hooks/exhaustive-deps
  const remove = useCallback(async (id) => { await write(key, (await read(key)).filter((x) => idOf(x) !== id)); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const clear = useCallback(() => write(key, []), [key]);
  const has = useCallback((id) => items.some((x) => idOf(x) === id), [items]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = useCallback(async (item) => { if ((await read(key)).some((x) => idOf(x) === idOf(item))) await remove(idOf(item)); else await push(item); }, [key, push, remove]); // eslint-disable-line react-hooks/exhaustive-deps
  return { items, push, remove, clear, has, toggle };
}

// Chỉ giữ các trường cần để hiển thị thẻ sản phẩm
export const productSnapshot = (p) => ({
  _id: p._id, name: p.name, price: p.price, unit: p.unit, images: p.images || [], stockQuantity: p.stockQuantity,
  categoryId: p.categoryId?._id ? { _id: p.categoryId._id, name: p.categoryId.name } : p.categoryId,
});
const byId = (p) => p._id;
export const useFavorites = (userId) => useStoredList('favorites', userId, { limit: 100, idOf: byId });
export const useRecentlyViewed = (userId) => useStoredList('recent', userId, { limit: 12, idOf: byId });
export const useSearchHistory = (userId) => useStoredList('search', userId, { limit: 8 });
