import api from './client';

export const auth = {
  register: (d) => api.post('/auth/register', d),
  login: (d) => api.post('/auth/login', d),
  logout: () => api.post('/auth/logout', {}),
  me: () => api.get('/auth/me'),
  forgotPassword: (d) => api.post('/auth/forgot-password', d),
  resetPassword: (d) => api.post('/auth/reset-password', d),
};
export const products = {
  list: (params) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
};
export const categories = { list: () => api.get('/categories') };
export const stores = { list: () => api.get('/stores') };
export const promotions = { list: () => api.get('/promotions') };
export const cart = {
  get: () => api.get('/cart'),
  add: (d) => api.post('/cart/items', d),
  update: (id, d) => api.put(`/cart/items/${id}`, d),
  remove: (id) => api.delete(`/cart/items/${id}`),
};
export const orders = {
  preview: (d) => api.post('/orders/preview', d),
  create: (d, key) => api.post('/orders', d, key ? { headers: { 'Idempotency-Key': key } } : undefined),
  list: (params) => api.get('/orders/my', { params }),
  history: (params) => api.get('/orders/my/history', { params }),
  get: (id) => api.get(`/orders/my/${id}`),
  track: (id) => api.get(`/orders/my/${id}/tracking`),
};
export const payments = { online: (d) => api.post('/payments/online', d) };
export const profile = {
  get: () => api.get('/profile'),
  update: (d) => api.put('/profile', d),
  changePassword: (d) => api.put('/profile/password', d),
};
export const addresses = {
  list: () => api.get('/addresses'),
  add: (d) => api.post('/addresses', d),
  update: (id, d) => api.put(`/addresses/${id}`, d),
  remove: (id) => api.delete(`/addresses/${id}`),
};
export const membership = {
  me: () => api.get('/membership/me'),
  history: (params) => api.get('/membership/me/history', { params }),
};
export const reviews = {
  ofProduct: (id, params) => api.get(`/reviews/product/${id}`, { params }),
  ofStore: (params) => api.get('/reviews/store', { params }),
  mine: () => api.get('/reviews/mine'),
  eligible: () => api.get('/reviews/mine/eligible'),
  add: (d) => api.post('/reviews', d),
  update: (id, d) => api.put(`/reviews/${id}`, d),
  remove: (id) => api.delete(`/reviews/${id}`),
};
export const support = {
  submit: (d) => api.post('/support', d),
  mine: (params) => api.get('/support/my', { params }),
  get: (id) => api.get(`/support/${id}`),
};
export const discountCodes = {
  validate: (d) => api.post('/discount-codes/validate', d),
  available: () => api.get('/discount-codes/available'),
};

// ===== Khách: hủy đơn, ví, thông báo =====
export const myOrders = { cancel: (id, d) => api.post(`/orders/my/${id}/cancel`, d) };
export const wallet = {
  get: (params) => api.get('/wallet', { params }),
  withdraw: (d) => api.post('/wallet/withdrawals', d),
  myWithdrawals: () => api.get('/wallet/withdrawals'),
};
export const notifications = {
  list: (params) => api.get('/notifications', { params }),
  read: (id) => api.patch(`/notifications/${id}/read`),
  readAll: () => api.patch('/notifications/read-all'),
};

// ===== Nhân viên =====
export const staff = {
  dashboard: (params) => api.get('/dashboard/staff', { params }),
  orders: (params) => api.get('/orders/staff', { params }),
  order: (id) => api.get(`/orders/staff/${id}`),
  advance: (id, d) => api.patch(`/orders/staff/${id}/status`, d),
  cancel: (id, d) => api.post(`/orders/staff/${id}/cancel`, d),
  quote: (d) => api.post('/orders/store/quote', d),
  checkout: (d) => api.post('/orders/store/checkout', d),
  findMember: (q) => api.get('/customers/members/lookup', { params: { q } }),
  registerMember: (d) => api.post('/customers/members', d),
  inventory: (params) => api.get('/inventory', { params }),
  complaints: (params) => api.get('/support', { params }),
  complaint: (id) => api.get(`/support/${id}`),
  handleComplaint: (id, d, key) => api.patch(`/support/${id}/handle`, d, key ? { headers: { 'Idempotency-Key': key } } : undefined),
  transactions: (params) => api.get('/transactions', { params }),
};
export const shifts = {
  mine: (params) => api.get('/work-shifts/my', { params }),
  clockIn: (shiftId) => api.post('/work-shifts/clock-in', { shiftId }),
  clockOut: (shiftId) => api.post('/work-shifts/clock-out', { shiftId }),
  open: () => api.get('/work-shifts/open'),
  claim: (slotId) => api.post(`/work-shifts/slots/${slotId}/claim`),
  release: (shiftId) => api.post(`/work-shifts/${shiftId}/release`),
  // admin
  slots: (params) => api.get('/work-shifts/slots', { params }),
  createSlots: (d) => api.post('/work-shifts/slots', d),
  deleteSlot: (id) => api.delete(`/work-shifts/slots/${id}`),
  attendance: (params) => api.get('/work-shifts', { params }),
  removeStaff: (id) => api.delete(`/work-shifts/${id}`),
};

// ===== Quản trị viên =====
export const admin = {
  dashboard: (params) => api.get('/dashboard/admin', { params }),
  orders: (params) => api.get('/orders', { params }),
  order: (id) => api.get(`/orders/${id}`),
  advance: (id, d) => api.patch(`/orders/${id}/status`, d),
  cancel: (id, d) => api.post(`/orders/${id}/cancel`, d),
  refunds: (params) => api.get('/orders/refunds', { params }),
  withdrawals: (params) => api.get('/wallet/admin/withdrawals', { params }),
  processWithdrawal: (id, d) => api.patch(`/wallet/admin/withdrawals/${id}`, d),
  staffList: (params) => api.get('/staff', { params }),
  staffDetail: (id, params) => api.get(`/staff/${id}`, { params }),
  staffOrders: (id, params) => api.get(`/staff/${id}/orders`, { params }),
  lockStaff: (id) => api.patch(`/staff/${id}/lock`, {}),
  unlockStaff: (id) => api.patch(`/staff/${id}/unlock`, {}),
  products: (params) => api.get('/products', { params }),
  updatePrice: (id, d) => api.patch(`/products/${id}/price`, d),
  activateProduct: (id) => api.patch(`/products/${id}/activate`, {}),
  deactivateProduct: (id) => api.patch(`/products/${id}/deactivate`, {}),
  customers: (params) => api.get('/customers', { params }),
  customer: (id) => api.get(`/customers/${id}`),
  updateCustomer: (id, d) => api.put(`/customers/${id}`, d),
  unlockCustomer: (id) => api.patch(`/customers/${id}/unlock`, {}),
};
