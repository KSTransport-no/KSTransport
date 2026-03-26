const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    logger.warn('SMTP not configured — emails will be logged to console instead of sent');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

async function sendMail({ to, subject, html }) {
  const from = process.env.MAIL_FROM || 'noreply@kstransport.no';
  const t = getTransporter();

  if (!t) {
    // Fallback: log to console so dev/test environments still work
    logger.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
    logger.log(`[EMAIL] Body:\n${html}`);
    return { accepted: [to], fallback: true };
  }

  const info = await t.sendMail({ from, to, subject, html });
  logger.log(`Email sent to ${to}: ${info.messageId}`);
  return info;
}

module.exports = { sendMail };
