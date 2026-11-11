import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

const KEY = 'token';
let memToken = null;
let onUnauthorized = null;

export const tokenStore = {
  async get() { if (memToken) return memToken; try { memToken = await SecureStore.getItemAsync(KEY); } catch { /* bỏ qua */ } return memToken; },
  async set(t) { memToken = t; try { await SecureStore.setItemAsync(KEY, t); } catch { /* bỏ qua */ } },
  async clear() { memToken = null; try { await SecureStore.deleteItemAsync(KEY); } catch { /* bỏ qua */ } },
};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

const api = axios.create({ baseURL: API_URL, timeout: 20000 });
api.interceptors.request.use(async (config) => {
  const t = await tokenStore.get();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
api.interceptors.response.use((r) => r, (err) => {
  // Token hết hạn / tài khoản bị khóa: đăng xuất (trừ chính các request đăng nhập)
  if (err.response?.status === 401 && memToken && !String(err.config?.url).includes('/auth/login') && onUnauthorized) onUnauthorized();
  return Promise.reject(err);
});
export default api;
