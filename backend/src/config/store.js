module.exports = {
  name: 'QUICK Store', phone: '09090909090',
  address: '600 Nguyễn Văn Cừ nối dài, Ninh Kiều, Cần Thơ',
  website: 'https://Quickstore.com',
  openingHours: Array.from({ length: 7 }, (_, day) => ({ day, openTime: '07:00', closeTime: '24:00', isClosed: false })),
};
