const router = require('express').Router();
const c = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// UC-01 Register
router.post('/register', c.register);
// UC-03/14/26 Login (Customer, Staff, Admin)
router.post('/login', c.login);
// Đăng ký / đăng nhập bằng Google
router.post('/google', c.googleLogin);
// UC-04/15/27 Logout
router.post('/logout', authenticate, c.logout);
// UC-05/16 Forgot Password (Customer, Staff)
router.post('/forgot-password', c.forgotPassword);
// UC-05/16 Forgot Password (đặt lại mật khẩu)
router.post('/reset-password', c.resetPassword);
// Lấy thông tin người đang đăng nhập
router.get('/me', authenticate, c.getMe);

module.exports = router;