const VIETNAM_OFFSET = 7 * 60 * 60 * 1000;
const minutes = value => {
  const match = /^(\d{2}):(\d{2})$/.exec(value || '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};
const formatOpening = date => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(date));

function pickupSchedule(store, now = new Date()) {
  if (store?.status === 'closed') return { isOpen: false, acceptingOrders: false, nextOpenAt: null, notice: 'The store is temporarily closed.' };
  if (!store?.openingHours?.length) return { isOpen: true, acceptingOrders: true, nextOpenAt: null, notice: '' };
  const local = new Date(now.getTime() + VIETNAM_OFFSET);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - VIETNAM_OFFSET;
  const currentMinute = local.getUTCHours() * 60 + local.getUTCMinutes();
  const today = store.openingHours.find(row => row.day === local.getUTCDay());
  const opens = minutes(today?.openTime), closes = minutes(today?.closeTime);
  if (today && !today.isClosed && opens !== null && closes !== null && currentMinute >= opens && currentMinute < closes) {
    return { isOpen: true, acceptingOrders: true, nextOpenAt: null, notice: '' };
  }
  for (let offset = 0; offset <= 7; offset += 1) {
    const row = store.openingHours.find(item => item.day === (local.getUTCDay() + offset) % 7);
    const start = minutes(row?.openTime);
    if (!row || row.isClosed || start === null || (offset === 0 && start <= currentMinute)) continue;
    const nextOpenAt = new Date(midnight + offset * 86400000 + start * 60000);
    return { isOpen: false, acceptingOrders: true, nextOpenAt, notice: `Preorder accepted. Preparation starts when the store opens at ${formatOpening(nextOpenAt)} (Vietnam time).` };
  }
  return { isOpen: false, acceptingOrders: false, nextOpenAt: null, notice: 'No pickup hours are available. Please contact the store.' };
}
module.exports = { pickupSchedule, formatOpening };
