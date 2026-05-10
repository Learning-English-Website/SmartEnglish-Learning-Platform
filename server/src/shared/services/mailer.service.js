const nodemailer = require('nodemailer');

const hasSmtpConfig = () => Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

const createTransporter = () => {
  if (!hasSmtpConfig()) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

class MailerService {
  constructor() {
    this.transporter = createTransporter();
  }

  async sendMail({ to, subject, text, html }) {
    if (!this.transporter) {
      console.warn(`[Mailer] SMTP not configured. Skipping email to ${to}`);
      return;
    }

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
  }
}

module.exports = new MailerService();
