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
    // 1. Try Resend HTTP API if API key is configured (Bypasses Render SMTP port blocking)
    if (process.env.RESEND_API_KEY) {
      try {
        console.log(`[Mailer] Sending email to ${to} via Resend HTTP API...`);
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.SMTP_FROM || 'onboarding@resend.dev',
            to: [to],
            subject: subject,
            text: text,
            html: html
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`[Mailer] Email sent to ${to} via Resend API | id=${result.id}`);
          return;
        } else {
          const errText = await response.text();
          console.error(`[Mailer] Resend API failed: ${errText}`);
        }
      } catch (err) {
        console.error(`[Mailer] Resend API error: ${err.message}`);
      }
    }

    // 2. Fallback to SMTP
    if (!this.transporter) {
      console.warn(`[Mailer] SMTP not configured. Skipping email to ${to}`);
      return;
    }

    const info = await this.transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });

    console.log(`[Mailer] Email sent to ${to} | messageId=${info.messageId}`);
  }
}

module.exports = new MailerService();
