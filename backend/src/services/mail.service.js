// Gửi email. Chưa cấu hình SMTP thì in nội dung email (kèm link) ra terminal backend để dev vẫn thử được.
// Cần thêm vào .env:  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
let transporter;

function getTransporter() {
    if (transporter !== undefined) return transporter;
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST) { transporter = null; return transporter; }
    const nodemailer = require('nodemailer');          // chỉ nạp khi đã cấu hình SMTP
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

exports.sendMail = async ({ to, subject, text, html }) => {
    const t = getTransporter();
    if (!t) {
        console.log(`\n========== [MAIL - SMTP not configured, console preview only] ==========\nTo: ${to}\nSubject: ${subject}\n\n${text}\n=====================================================================\n`);
        return { dev: true };
    }
    return t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html });
};

// Chỉ kiểm tra kết nối và đăng nhập SMTP, không gửi email.
exports.verifyMail = async () => {
    const t = getTransporter();
    if (!t) throw new Error('SMTP_HOST is not configured');
    return t.verify();
};
