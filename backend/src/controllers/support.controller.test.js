const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SupportRequest, Order } = require('../models');
const { submitSupportRequest, listMySupportRequests, getSupportRequest } = require('./support.controller');
const customerId = '507f1f77bcf86cd799439012';
const id = '507f1f77bcf86cd799439011';
const request = (body) => ({ body, user: { id: customerId, role: 'customer' }, query: {}, params: { id } });

test('customer support validation and access boundaries', async (t) => {
  const originals = { create: SupportRequest.create, find: SupportRequest.find, count: SupportRequest.countDocuments, findById: SupportRequest.findById, order: Order.findOne };
  t.after(() => { SupportRequest.create = originals.create; SupportRequest.find = originals.find; SupportRequest.countDocuments = originals.count; SupportRequest.findById = originals.findById; Order.findOne = originals.order; });
  await t.test('reject invalid submissions before writing', async () => {
    SupportRequest.create = () => assert.fail('Unexpected write');
    for (const body of [undefined, {}, { subject: [], message: 'text' }, { subject: '  ', message: 'text' }, { subject: 'x', message: 'a'.repeat(5001) }, { subject: 'x', message: 'ok', type: 'invalid' }, { subject: 'x', message: 'ok', orderId: {} }]) {
      await assert.rejects(submitSupportRequest(request(body), {}), { status: 400 });
    }
  });
  await t.test('submission ignores client ownership and status', async () => {
    SupportRequest.create = async (payload) => {
      assert.deepEqual(payload, { customerId, subject: 'Help', message: 'Details', type: 'support' });
      return payload;
    };
    await submitSupportRequest(request({ subject: ' Help ', message: ' Details ', customerId: id, status: 'resolved' }), {
      status(code) { assert.equal(code, 201); return this; }, json() {},
    });
  });
  await t.test('order association requires ownership', async () => {
    Order.findOne = (filter) => {
      assert.deepEqual(filter, { _id: id, customerId });
      return { select: () => ({ lean: async () => null }) };
    };
    await assert.rejects(submitSupportRequest(request({ subject: 'Help', message: 'Details', orderId: id }), {}), { status: 404 });
  });
  await t.test('detail hides another customer request', async () => {
    SupportRequest.findById = () => ({ lean: async () => ({ customerId: id }) });
    await assert.rejects(getSupportRequest(request(), {}), { status: 404 });
  });
  await t.test('list always scopes to customer, validates filters and caps pagination', async () => {
    const req = request(); req.query = { status: 'resolved', page: '-1', limit: '1000' };
    const chain = { select() { return this; }, sort() { return this; }, skip(n) { assert.equal(n, 0); return this; }, limit(n) { assert.equal(n, 100); return this; }, lean: async () => [] };
    SupportRequest.find = (filter) => { assert.deepEqual(filter, { customerId, status: 'resolved' }); return chain; };
    SupportRequest.countDocuments = async (filter) => { assert.equal(filter.customerId, customerId); return 0; };
    await listMySupportRequests(req, { json(data) { assert.equal(data.total, 0); assert.equal(data.page, 1); } });
    req.query.status = 'invalid';
    await assert.rejects(listMySupportRequests(req, {}), { status: 400 });
  });
});
