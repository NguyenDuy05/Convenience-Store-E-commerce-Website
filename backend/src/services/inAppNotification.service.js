const { Notification, NotificationSettings } = require('../models');

const DEFAULTS = { orders: true, payments: true, staffOrders: true, vouchers: true, promotions: true };
exports.DEFAULTS = DEFAULTS;
exports.getSettings = async () => ({ ...DEFAULTS, ...((await NotificationSettings.findById('global').lean()) || {}) });

// Unique source keys make retries and simultaneous gateway callbacks safe.
async function insertOnce(sourceKey, fields) {
  try {
    return await Notification.findOneAndUpdate({ sourceKey }, { $setOnInsert: { ...fields, sourceKey } }, { upsert: true, new: true, runValidators: true });
  } catch (error) {
    if (error.code === 11000) return null;
    throw error;
  }
}

exports.orderEvent = async (order, event, title, message, eventKey = '') => {
  try {
    const settings = await exports.getSettings();
    const payment = event.startsWith('payment_');
    const enabled = payment ? settings.payments : settings.orders;
    const history = order.statusHistory || [];
    const version = event === 'status_updated' ? `${order.status}:${history.at(-1)?.changedAt?.toISOString?.() || history.length}` : `${event}${eventKey ? `:${eventKey}` : ''}`;
    const key = `${order._id}:${version}`;
    const work = [];
    if (enabled && order.customerId) work.push(insertOnce(`customer:${key}`, {
      title, message: `${message}\nOrder code: ${order.orderCode}`, type: payment ? 'payment' : 'order',
      audience: 'users', recipientIds: [order.customerId], link: `/orders/${order._id}/tracking`,
      status: 'published', publishedAt: new Date(),
    }));
    if (event === 'order_created' && settings.staffOrders) {
      for (const role of ['staff', 'admin']) work.push(insertOnce(`${role}:${key}`, {
        title: `New order · ${order.orderCode}`, message: "A customer placed an online order. Check the payment and prepare it for pickup.",
        type: 'order', audience: role, link: role === 'admin' ? `/admin/orders/${order._id}` : `/staff/orders/${order._id}`,
        status: 'published', publishedAt: new Date(),
      }));
    }
    await Promise.all(work);
  } catch (error) {
    console.error('In-app order notification failed:', error.code || error.name);
  }
};

exports.withdrawOffer = async (offer, type) => {
  try {
    await Notification.updateMany({ type, sourceKey: new RegExp(`^${type}:${offer._id}:`), status: 'published' }, { $set: { status: 'archived' } });
  } catch (error) { console.error('Offer withdrawal failed:', error.code || error.name); }
};

exports.announceOffer = async (offer, type) => {
  try {
    const settings = await exports.getSettings();
    if (!(type === 'voucher' ? settings.vouchers : settings.promotions)) return;
    if (offer.status !== 'active' || new Date(offer.endDate) <= new Date()) return;
    const label = type === 'voucher' ? offer.code : offer.name;
    const benefit = offer.type === 'percent' ? `${offer.value}%` : `${Number(offer.value).toLocaleString('vi-VN')}đ`;
    await insertOnce(`${type}:${offer._id}:${new Date(offer.startDate).toISOString()}`, {
      title: `${type === 'voucher' ? "New voucher" : "New offer"} · ${label}`,
      message: `${offer.description || label}\nSave ${benefit}${offer.minOrderAmount ? ` on orders from ${Number(offer.minOrderAmount).toLocaleString('vi-VN')}đ` : ''}.${type === 'voucher' ? ` Enter code ${offer.code} at checkout.` : ''}`,
      type, audience: 'customer', link: type === 'voucher' ? '/cart' : '/promotions',
      status: 'published', publishedAt: new Date(Math.max(Date.now(), +new Date(offer.startDate))), expiresAt: offer.endDate,
    });
  } catch (error) {
    console.error('Offer notification failed:', error.code || error.name);
  }
};
