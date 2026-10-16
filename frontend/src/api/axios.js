import axios from 'axios';

// Mọi file *.api.js dùng chung instance này. Tự gắn token đăng nhập vào mỗi request.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
