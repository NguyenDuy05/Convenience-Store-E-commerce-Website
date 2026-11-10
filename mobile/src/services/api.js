import { create } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const host = Constants.expoConfig?.hostUri?.split(':')[0];
const developmentUrl = `http://${host || (Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1')}:5000/api`;
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? developmentUrl : '')).replace(
  /\/$/,
  '',
);
export const configurationError = !API_URL
  ? 'Configure EXPO_PUBLIC_API_URL before building QUICK.'
  : !__DEV__ && !API_URL.startsWith('https://')
    ? 'QUICK requires an HTTPS API in production.'
    : null;
export const api = create({ baseURL: API_URL, timeout: 20000 });
let token = null;
let unauthorized = () => {};
export function setSessionToken(value) {
  token = value;
}
export function onUnauthorized(callback) {
  unauthorized = callback;
  return () => {
    unauthorized = () => {};
  };
}
api.interceptors.request.use((config) => {
  if (configurationError) throw new Error(configurationError);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const sentToken = error.config?.headers?.Authorization;
    if (
      error.response?.status === 401 &&
      token &&
      sentToken === `Bearer ${token}` &&
      !error.config?.url?.startsWith('/auth/')
    )
      unauthorized();
    return Promise.reject(error);
  },
);
export const get = (path, params, signal) => api.get(path, { params, signal }).then((r) => r.data);
export const post = (path, body, config) => api.post(path, body, config).then((r) => r.data);
export const put = (path, body) => api.put(path, body).then((r) => r.data);
export const patch = (path, body) => api.patch(path, body).then((r) => r.data);
export const remove = (path) => api.delete(path).then((r) => r.data);
export const errorText = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong. Please try again.';
