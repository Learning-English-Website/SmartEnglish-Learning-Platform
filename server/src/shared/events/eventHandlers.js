const eventBus = require('./eventBus');
const mailerService = require('../services/mailer.service');
const notificationEmailService = require('../services/notificationEmail.service');

/**
 * Register all domain event handlers here.
 * This keeps side-effect logic (emails, notifications, analytics)
 * decoupled from the primary business logic.
 */

// user:registered → send activation OTP email
eventBus.on('user:registered', async ({ email, username, otp }) => {
  try {
    console.log(`📧 [Event] user:registered — ${email}`);
    await mailerService.sendMail({
      to: email,
      subject: 'Memoris - Verify your email',
      text: `Hi ${username}, your verification OTP is ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="margin:0 0 8px;">Verify your email</h2>
          <p>Hi <strong>${username}</strong>,</p>
          <p>Your OTP code is:</p>
          <p style="font-size: 24px; letter-spacing: 4px; font-weight: 700; margin: 8px 0;">${otp}</p>
          <p>This code expires in <strong>10 minutes</strong>.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[EventBus] user:registered handler error:', err.message);
  }
});

// user:passwordResetOtp → send password reset OTP email
eventBus.on('user:passwordResetOtp', async ({ email, username, otp }) => {
  try {
    console.log(`📧 [Event] user:passwordResetOtp — ${email}`);
    await mailerService.sendMail({
      to: email,
      subject: 'Memoris - Reset password OTP',
      text: `Hi ${username}, your password reset OTP is ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="margin:0 0 8px;">Reset your password</h2>
          <p>Hi <strong>${username}</strong>,</p>
          <p>Your password reset OTP is:</p>
          <p style="font-size: 24px; letter-spacing: 4px; font-weight: 700; margin: 8px 0;">${otp}</p>
          <p>This code expires in <strong>10 minutes</strong>.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[EventBus] user:passwordResetOtp handler error:', err.message);
  }
});

// Register email notification handlers
notificationEmailService.registerHandlers();

module.exports = eventBus;
