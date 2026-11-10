import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const source = await readFile(new URL('../src/utils/domain.js', import.meta.url), 'utf8');
const domain = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
);
const require = createRequire(import.meta.url);
const vnpay = require('../../backend/src/services/vnpay.service.js');

test('patched Router query parser preserves valid Unicode and tolerates malformed percent runs', () => {
  const query = require('query-string');
  assert.equal(query.parse('q=%C4%91%E1%BB%93%20u%E1%BB%91ng').q, 'đồ uống');
  const start = performance.now();
  const result = query.parse('q=' + '%FF%C3%A5'.repeat(12000));
  assert.equal(typeof result.q, 'string');
  assert(performance.now() - start < 2000, 'Malformed decoding should complete in bounded time.');
});

test('quantities respect stock and the server limit of 99', () => {
  assert.equal(domain.quantityLimit(120), 99);
  assert.equal(domain.quantityLimit(0), 0);
  assert.equal(domain.quantityLimit(-2), 0);
  assert.equal(domain.quantityLimit(3), 3);
});
test('legacy web product assets resolve to the shared backend image endpoint', () => {
  assert.equal(
    domain.imageUrl('/images/products/a b.png', 'https://api.quick.test/api'),
    'https://api.quick.test/api/products/images/file/a%20b.png',
  );
  assert.equal(domain.imageUrl(null, 'https://api.quick.test/api'), null);
});
test('catalog estimate recognizes public promotion DTO fields and caps discounts', () => {
  assert.equal(
    domain.estimatePrice({ _id: 'p', categoryId: { _id: 'c' }, price: 20000 }, [
      { scope: 'category', categories: [{ _id: 'c' }], type: 'percent', value: 10 },
      {
        scope: 'product',
        products: [{ _id: 'p' }],
        type: 'fixed',
        value: 50000,
        maxDiscount: 2000,
      },
    ]),
    16000,
  );
});
test('payment host allowlist rejects deceptive hosts, credentials and unsafe schemes', () => {
  for (const url of [
    'javascript:alert(1)',
    'https://sandbox.vnpayment.vn.evil.test/',
    'https://evil.test/',
    'http://sandbox.vnpayment.vn/',
    'https://user:pass@sandbox.vnpayment.vn/',
  ])
    assert.throws(() => domain.safePaymentUrl(url, 'https://api.quick.test/api'));
  assert.equal(
    domain.safePaymentUrl(
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      'https://api.quick.test/api',
    ),
    'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  );
});
test('mock gateway is allowed only for the same API origin in development', () => {
  const url = 'http://127.0.0.1:5000/api/payments/mock/pay?txnRef=1';
  assert.equal(domain.safePaymentUrl(url, 'http://127.0.0.1:5000/api', true), url);
  assert.throws(() => domain.safePaymentUrl(url, 'http://127.0.0.1:5000/api', false));
});
test('ambiguous checkout failures retain the same attempt', () => {
  for (const error of [
    {},
    { response: { status: 503 } },
    { response: { status: 409, data: { code: 'CHECKOUT_PROCESSING' } } },
  ])
    assert.equal(domain.ambiguousCheckout(error), true);
  assert.equal(
    domain.ambiguousCheckout({ response: { status: 409, data: { code: 'PRICE_CHANGED' } } }),
    false,
  );
});
test('login return cannot navigate to an external URL', () => {
  assert.equal(domain.internalDestination('/product/123'), '/product/123');
  assert.equal(domain.internalDestination('//evil.test'), '/account');
  assert.equal(domain.internalDestination('https://evil.test'), '/account');
});
test('mobile VNPay return is server-configured, signed, and preserves web default', () => {
  process.env.VNPAY_TMN_CODE = 'QAONLY';
  process.env.VNPAY_HASH_SECRET = 'test-only-key';
  process.env.VNPAY_RETURN_URL = 'https://api.quick.test/api/payments/vnpay/return';
  delete process.env.VNPAY_MOBILE_RETURN_URL;
  const web = new URL(vnpay.createPaymentUrl({ txnRef: 'q1', amount: 10000 }));
  const mobile = new URL(
    vnpay.createPaymentUrl({ txnRef: 'q2', amount: 10000, returnTo: 'mobile' }),
  );
  assert.equal(web.searchParams.get('vnp_ReturnUrl'), process.env.VNPAY_RETURN_URL);
  assert.equal(
    mobile.searchParams.get('vnp_ReturnUrl'),
    'https://api.quick.test/api/payments/vnpay/mobile-return',
  );
  assert.equal(vnpay.verifyCallback(Object.fromEntries(mobile.searchParams)).valid, true);
  mobile.searchParams.set('vnp_ReturnUrl', 'https://evil.test');
  assert.equal(vnpay.verifyCallback(Object.fromEntries(mobile.searchParams)).valid, false);
});
