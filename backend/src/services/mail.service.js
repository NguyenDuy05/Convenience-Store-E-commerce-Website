let transporter;

// Tạo kết nối SMTP từ cấu hình .env (không có thì chỉ in email ra console)
function getTransporter() {
    if (transporter !== undefined) return transporter;
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST) { transporter = null; return transporter; }
    const nodemailer = require('nodemailer');
    const port = Number(SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port,
        secure: port === 465,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
    });
    return transporter;
}

// Gửi email (chưa cấu hình SMTP thì in nội dung ra console)
exports.sendMail = async ({ to, subject, text, html }) => {
    const t = getTransporter();
    if (!t) {
        console.log(`\n========== [MAIL - SMTP not configured, console preview only] ==========\nTo: ${to}\nSubject: ${subject}\n\n${text}\n=====================================================================\n`);
        return { dev: true };
    }
    return t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html });
};

// Kiểm tra kết nối và đăng nhập SMTP (không gửi email)
exports.verifyMail = async () => {
    const t = getTransporter();
    if (!t) throw new Error('SMTP_HOST is not configured');
    return t.verify();
};
