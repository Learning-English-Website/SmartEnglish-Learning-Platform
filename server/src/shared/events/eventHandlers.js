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
      subject: 'Memoris - Xác thực tài khoản của bạn',
      text: `Xin chào ${username}, mã OTP xác thực của bạn là ${otp}. Mã này có hiệu lực trong vòng 10 phút.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
          <!-- Brand Header -->
          <div style="background-color: #07091E; padding: 24px; text-align: center; border-bottom: 3px solid #38BDF8;">
            <span style="font-size: 28px; vertical-align: middle;">🧠</span>
            <span style="color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; margin-left: 8px; vertical-align: middle;">Memoris</span>
          </div>
          <!-- Content Body -->
          <div style="padding: 32px 24px; color: #1f2937;">
            <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #111827; text-align: center;">Xác Minh Địa Chỉ Email</h2>
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Xin chào <strong>${username}</strong>,</p>
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px; color: #4b5563;">Chào mừng bạn đến với Memoris! Để hoàn tất việc đăng ký tài khoản và bắt đầu hành trình học tập, vui lòng sử dụng mã xác minh OTP bên dưới:</p>
            
            <div style="background-color: #f3f4f6; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <div style="font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; font-weight: 600;">Mã OTP của bạn là</div>
              <div style="font-size: 32px; letter-spacing: 6px; font-weight: 800; color: #4255FF; margin: 0; font-family: monospace;">${otp}</div>
              <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Mã này có hiệu lực trong vòng <strong>10 phút</strong>.</div>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; margin: 0; color: #64748b; text-align: center;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
          </div>
          <!-- Footer -->
          <div style="padding: 20px 24px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0 0 4px;">© 2026 Memoris. Học tập thông minh hơn mỗi ngày.</p>
          </div>
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
      subject: 'Memoris - Đặt lại mật khẩu của bạn',
      text: `Xin chào ${username}, mã OTP khôi phục mật khẩu của bạn là ${otp}. Mã này có hiệu lực trong vòng 10 phút.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
          <!-- Brand Header -->
          <div style="background-color: #07091E; padding: 24px; text-align: center; border-bottom: 3px solid #38BDF8;">
            <span style="font-size: 28px; vertical-align: middle;">🧠</span>
            <span style="color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; margin-left: 8px; vertical-align: middle;">Memoris</span>
          </div>
          <!-- Content Body -->
          <div style="padding: 32px 24px; color: #1f2937;">
            <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #111827; text-align: center;">Khôi Phục Mật Khẩu</h2>
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Xin chào <strong>${username}</strong>,</p>
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px; color: #4b5563;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu từ tài khoản của bạn. Vui lòng sử dụng mã xác minh OTP dưới đây để hoàn tất:</p>
            
            <div style="background-color: #fef2f2; border: 1px dashed #fca5a5; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <div style="font-size: 13px; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; font-weight: 600; font-weight: bold;">Mã OTP khôi phục mật khẩu</div>
              <div style="font-size: 32px; letter-spacing: 6px; font-weight: 800; color: #ef4444; margin: 0; font-family: monospace;">${otp}</div>
              <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Mã này có hiệu lực trong vòng <strong>10 phút</strong>.</div>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; margin: 0; color: #64748b; text-align: center;">Vì lý do bảo mật, tuyệt đối không chia sẻ mã này cho bất kỳ ai khác.</p>
          </div>
          <!-- Footer -->
          <div style="padding: 20px 24px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0 0 4px;">© 2026 Memoris. Học tập thông minh hơn mỗi ngày.</p>
          </div>
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
