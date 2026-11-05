require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

if (!process.env.JWT_SECRET) {
  console.error('Thiếu JWT_SECRET trong file .env');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    require('./services/payment.service').startExpiryJob();   // mỗi phút: đơn quá hạn thanh toán -> failed + hoàn kho
    return app.listen(PORT, () => console.log(`Server chạy tại http://localhost:${PORT}`));
  })
  .catch((err) => { console.error(err); process.exit(1); });
