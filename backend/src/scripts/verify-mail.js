require('dotenv').config();
const { verifyMail } = require('../services/mail.service');

const timeout = setTimeout(() => {
  console.error('SMTP verification timed out. No email sent.');
  process.exit(1);
}, 30000);

verifyMail()
  .then(() => console.log('SMTP connection and authentication OK. No email sent.'))
  .catch((error) => {
    console.error('SMTP verification failed:', error.code || error.name, error.responseCode || '');
    process.exitCode = 1;
  })
  .finally(() => clearTimeout(timeout));
