/* Real shared-database QA, with uniquely named, disposable records only.
   No database is created or dropped. SMTP and staff broadcasts are disabled in
   this separate test process. Run while Expo web preview listens on 8082. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const backend = createRequire(path.join(root, 'backend/package.json'));
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'convenience-store-ui-qa/node_modules/playwright'));
backend('dotenv').config({ path: path.join(root, 'backend/.env'), quiet: true });
process.env.SMTP_HOST = '';
process.env.JWT_SECRET = randomUUID();
process.env.VNPAY_HASH_SECRET = randomUUID();
process.env.PAYMENT_MOCK = 'false';
process.env.FRONTEND_URL = 'http://localhost:5173';
const mongoose = backend('mongoose');
const models = backend('./src/models');
const capturedMail = [];
backend('./src/services/mail.service').sendMail = async message => { capturedMail.push(message); return { dev: true }; };
const vnpay = backend('./src/services/vnpay.service');
backend('./src/services/inAppNotification.service').getSettings = async () => ({ orders: true, payments: true, staffOrders: false, vouchers: false, promotions: false });
const prefix = 'mobileqa-' + randomUUID().slice(0, 8);
const evidence = path.join(__dirname, 'evidence');
const results = [], errors = [], users = [], products = [];
let browser, server, page, customer, staff, token, staffToken, product, order, apiBase;
const check = async (name, action) => { try { await action(); results.push({ name, passed: true }); console.log('PASS', name); } catch (e) { results.push({ name, passed: false, error: e.message }); throw e; } };
const call = async (route, body, method = body === undefined ? 'GET' : 'POST', auth = token, headers = {}) => {
  const response = await fetch(apiBase + '/api' + route, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json(); return { status: response.status, data };
};
const waitFor = async (fn, message) => { for (let i = 0; i < 50; i++) { if (await fn()) return; await new Promise(r => setTimeout(r, 100)); } throw new Error(message); };
const signCallback = async (txnRef, amount, valid = true, code = '00') => {
  const params = { vnp_TxnRef: txnRef, vnp_Amount: String(amount * 100), vnp_ResponseCode: code, vnp_TransactionStatus: code, vnp_TransactionNo: prefix };
  params.vnp_SecureHash = valid ? vnpay._sign(params, process.env.VNPAY_HASH_SECRET) : 'bad';
  return fetch(apiBase + '/api/payments/vnpay/mobile-return?' + new URLSearchParams(params), { redirect: 'manual' });
};
const clickTab = title => page.getByRole('tab', { name: new RegExp(title) }).click();

(async () => {
  await fs.mkdir(evidence, { recursive: true });
  await mongoose.connect(process.env.MONGODB_URI);
  const category = await models.Category.findOne({ status: 'active' });
  assert(category, 'An existing active category is required.');
  const password = 'Mobile-QA-Only-2468';
  const passwordHash = await backend('bcryptjs').hash(password, 10);
  for (const role of ['customer', 'staff', 'customer']) {
    const u = await models.User.create({ fullName: `Mobile QA ${users.length}`, email: `${prefix}-${users.length}@example.invalid`, role, passwordHash }); users.push(u);
  }
  [customer, staff] = users;
  product = await models.Product.create({ name: prefix, slug: prefix, sku: prefix, categoryId: category._id, price: 20000, stockQuantity: 20, mealType: 'snack', unit: 'gói', images: ['/images/products/banh-bouchee-lotte-choco-pho-mai-162g-1.png'] }); products.push(product._id);
  await models.StockBatch.create({ productId: product._id, receivedQuantity: 20, quantity: 20, expiryDate: new Date(Date.now() + 365 * 86400000) });
  const app = backend('./src/app');
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); }); apiBase = 'http://127.0.0.1:' + server.address().port;
  process.env.VNPAY_RETURN_URL = apiBase + '/api/payments/vnpay/return'; delete process.env.VNPAY_MOBILE_RETURN_URL;
  await check('Local Expo browser CORS works without widening the production website origin', async () => {
    const request = origin => fetch(apiBase + '/api/health', { headers: { Origin: origin } });
    assert.equal((await request('http://localhost:8082')).headers.get('access-control-allow-origin'), 'http://localhost:8082');
    const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
    try {
      assert.equal((await request('http://localhost:8082')).headers.get('access-control-allow-origin'), null);
      assert.equal((await request('http://localhost:5173')).headers.get('access-control-allow-origin'), 'http://localhost:5173');
    } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
  });
  await check('Real API login and customer role enforcement', async () => {
    const login = await call('/auth/login', { email: customer.email, password }, 'POST', null); assert.equal(login.status, 200); token = login.data.token;
    staffToken = (await call('/auth/login', { email: staff.email, password }, 'POST', null)).data.token;
    assert.equal((await call('/cart', undefined, 'GET', staffToken)).status, 403);
    assert.equal((await call('/cart', undefined, 'GET', null)).status, 401);
    assert.equal((await call('/auth/login', { email: customer.email, password: 'incorrect-password' }, 'POST', null)).status, 401);
  });
  await check('Registration, reset token consumption, password change and expired sessions', async () => {
    const email = `${prefix}-registered@example.invalid`;
    const registration = await call('/auth/register', { fullName: 'Mobile QA Registered', email, password }, 'POST', null);
    assert.equal(registration.status, 201); users.push(await models.User.findById(registration.data.user.id));
    assert.equal((await call('/auth/register', { fullName: 'Duplicate', email, password }, 'POST', null)).status, 409);
    assert.equal((await call('/auth/forgot-password', { email }, 'POST', null)).status, 200);
    const resetToken = /token=([a-f\d]+)/.exec(capturedMail.find(m => m.to === email).text)[1];
    assert.equal((await call('/auth/reset-password', { token: 'invalid', password }, 'POST', null)).status, 400);
    const newPassword = password + '-reset';
    assert.equal((await call('/auth/reset-password', { token: resetToken, password: newPassword }, 'POST', null)).status, 200);
    assert.equal((await call('/auth/reset-password', { token: resetToken, password }, 'POST', null)).status, 400);
    const changed = await call('/auth/login', { email, password: newPassword }, 'POST', null); assert.equal(changed.status, 200);
    assert.equal((await call('/profile/password', { currentPassword: newPassword, newPassword: password, confirmPassword: password }, 'PUT', changed.data.token)).status, 200);
    const expired = backend('jsonwebtoken').sign({ id: String(customer._id), role: 'customer' }, process.env.JWT_SECRET, { expiresIn: -1 });
    assert.equal((await call('/auth/me', undefined, 'GET', expired)).status, 401);
  });
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  page.on('pageerror', e => errors.push(e.message));
  let loseOrderResponse = false;
  await page.route('http://127.0.0.1:5000/api/**', async route => {
    const request = route.request();
    const response = await fetch(apiBase + new URL(request.url()).pathname + new URL(request.url()).search, { method: request.method(), headers: { 'Content-Type': 'application/json', ...(request.headers().authorization ? { Authorization: request.headers().authorization } : {}), ...(request.headers()['idempotency-key'] ? { 'Idempotency-Key': request.headers()['idempotency-key'] } : {}) }, ...(request.postData() ? { body: request.postData() } : {}), redirect: 'manual' });
    const body = Buffer.from(await response.arrayBuffer());
    if (loseOrderResponse && request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') { loseOrderResponse = false; await route.abort('failed'); return; }
    await route.fulfill({ status: response.status, contentType: response.headers.get('content-type') || 'application/json', body });
  });
  await page.goto('http://localhost:8082');
  await page.getByText('Your next good').waitFor({ timeout: 45000 });
  await check('Public native UI: real catalog, search and product gallery', async () => {
    await clickTab('Explore'); await page.getByRole('textbox', { name: 'Search products', exact: true }).fill(prefix);
    await page.getByRole('button', { name: `View ${prefix}`, exact: true }).click();
    await page.getByText(prefix, { exact: true }).last().waitFor();
    await page.screenshot({ path: path.join(evidence, 'product.png') });
  });
  await check('Guest add preserves product destination through real login', async () => {
    await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill(customer.email); await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Log in', exact: true }).last().click();
    await page.getByRole('button', { name: 'Add to bag', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
    await page.getByRole('button', { name: 'Added to bag', exact: true }).waitFor();
    assert.equal((await call('/cart')).data.items[0].quantity, 1);
  });
  await check('Native cart quantity updates the same server cart used by the website', async () => {
    await page.goBack(); await clickTab('Cart');
    await page.getByRole('button', { name: 'Increase quantity', exact: true }).click();
    await waitFor(async () => (await call('/cart')).data.items[0]?.quantity === 2, 'Quantity did not reach shared server cart.');
    await page.screenshot({ path: path.join(evidence, 'cart.png') });
  });
  await check('Checkout shows server pricing and does not create orders on navigation', async () => {
    await page.getByRole('button', { name: 'Review pickup order', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm pickup order', exact: true }).waitFor();
    assert.equal(await models.Order.countDocuments({ customerId: customer._id }), 0);
    const preview = (await call('/orders/preview', {})).data; assert.equal(preview.canCheckout, true);
    await page.screenshot({ path: path.join(evidence, 'checkout.png') });
  });
  await check('Stock and changed-price validation prevent an unreviewed order', async () => {
    const summary = (await call('/orders/preview', {})).data;
    await models.Product.updateOne({ _id: product._id }, { $set: { price: 21000 } });
    const changed = await call('/orders', { paymentMethod: 'vnpay', expectedTotal: summary.totalAmount, expectedWalletAmount: 0 }, 'POST', token, { 'Idempotency-Key': randomUUID() });
    assert.equal(changed.status, 409); assert.equal(changed.data.code, 'PRICE_CHANGED');
    await models.Product.updateOne({ _id: product._id }, { $set: { price: 20000 } });
    await models.StockBatch.updateMany({ productId: product._id }, { $set: { quantity: 1 } });
    assert.equal((await call('/orders/preview', {})).data.canCheckout, false);
    await models.StockBatch.updateMany({ productId: product._id }, { $set: { quantity: 20 } });
    const tooMany = await call('/cart/items', { productId: String(product._id), quantity: 100 }); assert(tooMany.status >= 400);
    assert.equal(await models.Order.countDocuments({ customerId: customer._id }), 0);
  });
  await check('Lost checkout response retries the same key and creates exactly one order', async () => {
    loseOrderResponse = true;
    await page.getByRole('button', { name: 'Confirm pickup order', exact: true }).click();
    await page.getByText('Network Error', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Continue confirmation', exact: true }).click();
    await page.getByText('Let’s make it yours.', { exact: true }).waitFor();
    assert.equal(await models.Order.countDocuments({ customerId: customer._id }), 1);
    order = await models.Order.findOne({ customerId: customer._id }).lean(); assert.equal(order.status, 'pending_payment');
  });
  await check('VNPay mobile callback signature, amount check, pending reuse and duplicate safety', async () => {
    const payment = (await call('/payments/online', { orderId: String(order._id), method: 'vnpay', returnTo: 'mobile' })).data;
    assert.equal(new URL(payment.paymentUrl).searchParams.get('vnp_ReturnUrl'), apiBase + '/api/payments/vnpay/mobile-return');
    const second = (await call('/payments/online', { orderId: String(order._id), method: 'vnpay', returnTo: 'web' })).data; assert.equal(second.reused, true); assert.equal(second.txnRef, payment.txnRef);
    const invalid = await signCallback(payment.txnRef, order.payableAmount, false); assert.match(invalid.headers.get('location'), /invalid_signature/);
    await signCallback(payment.txnRef, order.payableAmount + 1); assert.equal((await models.Order.findById(order._id)).paymentStatus, 'unpaid');
    const valid = await signCallback(payment.txnRef, order.payableAmount); assert.equal(valid.headers.get('location'), `quickstore://payment-result?orderId=${order._id}`);
    await signCallback(payment.txnRef, order.payableAmount); assert.equal(await models.Transaction.countDocuments({ orderId: order._id, status: 'success' }), 1);
    await page.getByRole('button', { name: 'Check payment status', exact: true }).click(); await page.getByText('Payment confirmed.', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(evidence, 'payment-verified.png') });
  });
  await check('Staff preparation, ready notice, pickup, points and cancellation boundary', async () => {
    assert.equal((await call(`/orders/staff/${order._id}/status`, { status: 'preparing' }, 'PATCH', staffToken)).status, 200);
    assert.equal((await call(`/orders/my/${order._id}/cancel`, { reason: 'QA cancellation' })).status, 409);
    assert.equal((await call(`/orders/staff/${order._id}/status`, { status: 'ready_for_pickup' }, 'PATCH', staffToken)).status, 200);
    await page.getByRole('button', { name: 'Track this order', exact: true }).click(); await page.getByText('Your bag is ready!', { exact: false }).waitFor();
    await page.screenshot({ path: path.join(evidence, 'ready-for-pickup.png') });
    await waitFor(async () => !!(await models.Notification.findOne({ recipientIds: customer._id, title: 'Your order is ready for pickup' })), 'Ready notification missing.');
    assert.equal((await call(`/orders/staff/${order._id}/status`, { status: 'completed' }, 'PATCH', staffToken)).status, 200);
    const m = (await call('/membership/me')).data; assert.equal(m.points, Math.floor(order.totalAmount / 10000));
    assert.equal((await call('/orders/my/history')).data.items[0]._id, String(order._id));
  });
  await check('Refund goes to wallet once; next order spends wallet before VNPay', async () => {
    await call('/cart/items', { productId: String(product._id), quantity: 1 });
    const s = (await call('/orders/preview', {})).data;
    const created = (await call('/orders', { paymentMethod: 'vnpay', expectedTotal: s.totalAmount, expectedWalletAmount: 0 }, 'POST', token, { 'Idempotency-Key': randomUUID() })).data.order;
    const pay = (await call('/payments/online', { orderId: created._id, method: 'vnpay', returnTo: 'mobile' })).data;
    await signCallback(pay.txnRef, created.payableAmount);
    assert.equal((await call(`/orders/my/${created._id}/cancel`, { reason: 'QA cancellation' })).status, 200);
    await call(`/orders/my/${created._id}/cancel`, { reason: 'QA cancellation' });
    assert.equal((await call('/wallet')).data.balance, created.totalAmount);
    await call('/cart/items', { productId: String(product._id), quantity: 2 });
    const next = (await call('/orders/preview', {})).data;
    const paid = (await call('/orders', { paymentMethod: 'vnpay', expectedTotal: next.totalAmount, expectedWalletAmount: created.totalAmount }, 'POST', token, { 'Idempotency-Key': randomUUID() })).data.order;
    assert.equal(paid.walletAmount, created.totalAmount); assert.equal(paid.payableAmount, next.totalAmount - created.totalAmount);
    await call(`/orders/my/${paid._id}/cancel`, { reason: 'QA cancellation' });
  });
  await check('Gateway cancellation remains unpaid; expired order restores reserved stock and wallet', async () => {
    await call('/cart/items', { productId: String(product._id), quantity: 3 });
    const beforeStock = await models.StockBatch.findOne({ productId: product._id }).lean();
    const s = (await call('/orders/preview', {})).data;
    const created = (await call('/orders', { paymentMethod: 'vnpay', expectedTotal: s.totalAmount, expectedWalletAmount: Math.min(s.walletBalance, s.totalAmount) }, 'POST', token, { 'Idempotency-Key': randomUUID() })).data.order;
    const pay = (await call('/payments/online', { orderId: created._id, method: 'vnpay', returnTo: 'mobile' })).data;
    await signCallback(pay.txnRef, created.payableAmount, true, '24');
    assert.equal((await call(`/orders/my/${created._id}`)).data.paymentStatus, 'failed');
    await models.Order.collection.updateOne({ _id: new mongoose.Types.ObjectId(created._id) }, { $set: { createdAt: new Date(Date.now() - 86400000) } });
    assert.equal((await call(`/orders/my/${created._id}`)).data.status, 'failed');
    assert.equal((await models.StockBatch.findOne({ productId: product._id })).quantity, beforeStock.quantity);
    assert.equal((await call('/wallet')).data.balance, s.walletBalance);
    await call('/cart/items', { productId: String(product._id), quantity: 1 });
    assert.equal((await call(`/cart/items/${product._id}`, undefined, 'DELETE')).status, 200);
    assert.equal((await call('/cart')).data.itemCount, 0);
  });
  await check('Ownership protection on orders and support; profile/address/review/support persistence', async () => {
    const other = (await call('/auth/login', { email: users[2].email, password }, 'POST', null)).data.token;
    assert.equal((await call(`/orders/my/${order._id}`, undefined, 'GET', other)).status, 404);
    assert.equal((await call('/profile', { fullName: 'Mobile QA Updated', phone: '09090909090', avatarUrl: '', dateOfBirth: '2000-01-01' }, 'PUT')).status, 200);
    assert.equal((await call('/profile')).data.fullName, 'Mobile QA Updated');
    const address = await call('/addresses', { label: 'QA', receiverName: 'QA', phone: '09090909090', addressLine: '600 Nguyễn Văn Cừ nối dài, Cần Thơ', isDefault: true }); assert.equal(address.status, 201);
    const addresses = (await call('/addresses')).data; assert.equal(addresses.length, 1); assert.equal((await call(`/addresses/${addresses[0]._id}`, undefined, 'DELETE')).status, 200);
    const review = await call('/reviews', { targetType: 'product', productId: String(product._id), orderId: String(order._id), rating: 4, comment: 'QA only' }); assert.equal(review.status, 201);
    assert.equal((await call(`/reviews/${review.data._id}`, { rating: 5, comment: 'Updated QA' }, 'PUT')).status, 200);
    assert.equal((await call(`/reviews/${review.data._id}`, undefined, 'DELETE')).status, 200);
    const support = await call('/support', { subject: 'Mobile QA support', message: 'Temporary QA request', type: 'support', orderId: String(order._id) }); assert.equal(support.status, 201);
    assert.equal((await call(`/support/${support.data._id}`, undefined, 'GET', other)).status, 404);
  });
  await check('Mobile account screens load real wallet, membership, notifications and support', async () => {
    await page.goBack(); await page.goBack(); await clickTab('Account'); await page.getByText('A little more you.').waitFor();
    for (const [button, text] of [['Wallet & refunds', 'A little credit for later.'], ['Membership & points', 'Good things add up.'], ['Address book', 'Your address book.'], ['Support requests', 'We’re here to help.'], ['My reviews', 'Tell us how it went.'], ['Edit profile', 'Your details.']]) {
      await page.getByRole('button', { name: button, exact: true }).click(); await page.getByText(text, { exact: true }).waitFor(); await page.goBack();
    }
    await page.getByRole('button', { name: /^Notifications/ }).click(); await page.getByText('A little heads-up.').waitFor();
    await page.getByRole('button', { name: 'Mark all as read', exact: true }).click();
    await waitFor(async () => (await call('/notifications')).data.unreadCount === 0, 'Read receipts did not persist.'); await page.goBack();
    await page.screenshot({ path: path.join(evidence, 'account.png') });
  });
  await check('Responsive native web layout, reduced motion and no runtime errors', async () => {
    await clickTab('Home');
    for (const width of [320, 390, 768]) { await page.setViewportSize({ width, height: 844 }); await page.waitForTimeout(150); assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Overflow at ${width}`); }
    assert.deepEqual(errors, []); await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: path.join(evidence, 'home.png') });
  });
  await check('Website renders a mobile-created order; web API order appears in mobile orders', async () => {
    const web = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await web.addInitScript(value => localStorage.setItem('token', value), token);
    await web.route(/^https?:\/\/[^/]+\/api\//, async route => {
      const req = route.request(), url = new URL(req.url());
      const response = await fetch(apiBase + url.pathname + url.search, { method: req.method(), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(req.headers()['idempotency-key'] ? { 'Idempotency-Key': req.headers()['idempotency-key'] } : {}) }, ...(req.postData() ? { body: req.postData() } : {}) });
      await route.fulfill({ status: response.status, contentType: response.headers.get('content-type') || 'application/json', body: Buffer.from(await response.arrayBuffer()) });
    });
    await web.goto(`http://localhost:5173/orders/${order._id}`);
    await web.getByRole('heading', { name: `Order #${order.orderCode}`, exact: true }).waitFor().catch(async error => { console.log('WEBSITE:', (await web.locator('body').innerText()).slice(0, 2200)); throw error; });
    await web.screenshot({ path: path.join(evidence, 'website-shared-order.png') });
    const created = await web.evaluate(async ({ productId, key }) => {
      const request = (url, body, headers = {}) => fetch('/api' + url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...headers }, body: JSON.stringify(body) }).then(r => r.json());
      await request('/cart/items', { productId, quantity: 1 });
      const s = await request('/orders/preview', {});
      return request('/orders', { paymentMethod: 'vnpay', expectedTotal: s.totalAmount, expectedWalletAmount: Math.min(s.walletBalance, s.totalAmount) }, { 'Idempotency-Key': key });
    }, { productId: String(product._id), key: randomUUID() });
    assert(created.order?._id); await clickTab('Orders'); await page.getByText(created.order.orderCode, { exact: true }).waitFor();
    assert.equal(created.order.paymentMethod, 'wallet'); assert.equal(created.order.paymentStatus, 'paid');
    await call(`/orders/my/${created.order._id}/cancel`, { reason: 'QA cleanup cancellation' }); await web.close();
  });
  await check('Login preserves payment deep-link order ID; logout removes protected access', async () => {
    await page.goto(`http://localhost:8082/payment-result?orderId=${order._id}`);
    await page.getByRole('button', { name: 'Log in or sign up', exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill(customer.email); await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Log in', exact: true }).last().click(); await page.getByText('Payment confirmed.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'My orders', exact: true }).click(); await clickTab('Account');
    await page.getByRole('button', { name: 'Log out', exact: true }).click(); await clickTab('Cart');
    await page.getByRole('button', { name: 'Log in or sign up', exact: true }).waitFor();
    assert.deepEqual(errors, []);
  });
})().catch(async e => { console.error(e.message); if (page) { await page.screenshot({ path: path.join(evidence, 'failure.png') }).catch(() => {}); console.log((await page.locator('body').innerText()).slice(-2200)); } process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  // Settle asynchronous local inbox writes before removing only QA-owned records.
  await new Promise(resolve => setTimeout(resolve, 500));
  if (mongoose.connection.readyState === 1) {
    const ids = users.map(u => u._id); const orderIds = (await models.Order.find({ customerId: { $in: ids } }).select('_id').lean()).map(o => o._id);
    const notifications = await models.Notification.find({ recipientIds: { $in: ids } }).select('_id').lean();
    const cleanup = [
      [models.NotificationReceipt, { $or: [{ userId: { $in: ids } }, { notificationId: { $in: notifications.map(n => n._id) } }] }],
      [models.Notification, { recipientIds: { $in: ids } }], [models.ActivityLog, { actorId: { $in: ids } }],
      [models.PointHistory, { userId: { $in: ids } }], [models.SupportRequest, { customerId: { $in: ids } }],
      [models.Review, { customerId: { $in: ids } }], [models.Transaction, { orderId: { $in: orderIds } }],
      [models.Order, { _id: { $in: orderIds } }], [models.Cart, { userId: { $in: ids } }], [models.Wallet, { userId: { $in: ids } }],
      [models.StockBatch, { productId: { $in: products } }], [models.InventoryLog, { productId: { $in: products } }],
      [models.Product, { _id: { $in: products } }], [models.User, { _id: { $in: ids } }],
    ];
    for (const [model, filter] of cleanup) await model.deleteMany(filter);
    assert.equal(await models.User.countDocuments({ _id: { $in: ids } }), 0);
    await mongoose.disconnect();
  }
  await fs.writeFile(path.join(evidence, 'results.json'), JSON.stringify({ date: new Date().toISOString(), environment: 'Edge / Expo React Native Web + existing Express + existing MongoDB', noNewDatabase: true, liveGatewayTested: false, nativeDeviceTested: false, errors, results }, null, 2));
  if (results.length && results.every(result => result.passed)) await fs.rm(path.join(evidence, 'failure.png'), { force: true });
});
