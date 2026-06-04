const mailerService = require('../../shared/services/mailer.service');
const eventBus = require('../events/eventBus');
const User = require('../../modules/user/user.model');

const BASE_URL = process.env.CLIENT_URL || 'https://smartenglish.app';

const STREAK_REMINDER_HTML = (username, streak) => `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
  <!-- Brand Header -->
  <div style="background-color: #07091E; padding: 24px; text-align: center; border-bottom: 3px solid #38BDF8;">
    <span style="font-size: 28px; vertical-align: middle;">🧠</span>
    <span style="color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; margin-left: 8px; vertical-align: middle;">Memoris</span>
  </div>
  <!-- Content Body -->
  <div style="padding: 32px 24px; color: #1f2937;">
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #f97316; text-align: center;">🔥 Đừng để đứt chuỗi học tập!</h2>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Xin chào <strong>${username}</strong>,</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px; color: #4b5563;">
      Bạn đang duy trì chuỗi học tập liên tục cực kỳ ấn tượng là <strong style="color: #f97316;">${streak} ngày</strong>! Hãy hoàn thành một bài học ngay hôm nay để giữ vững phong độ nhé.
    </p>
    
    <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 8px;">🔥</div>
      <div style="font-size: 32px; font-weight: 900; color: #f97316; margin: 0;">${streak}</div>
      <div style="font-size: 12px; color: #9a3412; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold; margin-top: 4px;">Ngày Streak Hiện Tại</div>
    </div>
    
    <a href="${BASE_URL}/duolingo/learn" style="display: block; background: linear-gradient(135deg, #f97316, #ea580c); color: #ffffff; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(234, 88, 12, 0.2);">
      Tiếp Tục Học Ngay →
    </a>
  </div>
  <!-- Footer -->
  <div style="padding: 20px 24px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">Bạn nhận được email này vì bạn đang có chuỗi học tập đang hoạt động trên Memoris.</p>
  </div>
</div>`;

const ACHIEVEMENT_UNLOCKED_HTML = (username, achievement) => `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
  <!-- Brand Header -->
  <div style="background-color: #07091E; padding: 24px; text-align: center; border-bottom: 3px solid #38BDF8;">
    <span style="font-size: 28px; vertical-align: middle;">🧠</span>
    <span style="color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; margin-left: 8px; vertical-align: middle;">Memoris</span>
  </div>
  <!-- Content Body -->
  <div style="padding: 32px 24px; color: #1f2937; text-align: center;">
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #635bff;">🏆 Mở Khóa Thành Tích Mới!</h2>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">Chúc mừng <strong>${username}</strong>! Bạn đã xuất sắc đạt được:</p>
    
    <div style="background-color: #f5f3ff; border: 2px solid #c4b5fd; border-radius: 18px; padding: 24px; margin-bottom: 24px;">
      <div style="font-size: 56px; margin-bottom: 12px;">${achievement.emoji || '🏆'}</div>
      <h3 style="color: #4c1d95; margin: 0 0 8px; font-size: 20px; font-weight: 800;">${achievement.title}</h3>
      <p style="color: #6d28d9; margin: 0 0 16px; font-size: 14px; line-height: 1.5;">${achievement.description}</p>
      <div style="background-color: #fef3c7; border-radius: 999px; display: inline-block; padding: 6px 16px; border: 1px solid #fde68a;">
        <span style="color: #d97706; font-weight: 800; font-size: 14px;">⚡ +${achievement.xpReward || 0} XP</span>
      </div>
    </div>
    
    <a href="${BASE_URL}/achievements" style="display: block; background: linear-gradient(135deg, #635bff, #818cf8); color: #ffffff; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(99, 91, 255, 0.2);">
      Xem Tất Cả Thành Tích →
    </a>
  </div>
  <!-- Footer -->
  <div style="padding: 20px 24px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">© 2026 Memoris. Học tập thông minh hơn mỗi ngày.</p>
  </div>
</div>`;

const WEEKLY_PROGRESS_HTML = (username, stats) => `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
  <!-- Brand Header -->
  <div style="background-color: #07091E; padding: 24px; text-align: center; border-bottom: 3px solid #38BDF8;">
    <span style="font-size: 28px; vertical-align: middle;">🧠</span>
    <span style="color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; margin-left: 8px; vertical-align: middle;">Memoris</span>
  </div>
  <!-- Content Body -->
  <div style="padding: 32px 24px; color: #1f2937;">
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #10b981; text-align: center;">📊 Báo Cáo Học Tập Tuần Qua</h2>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">Chào <strong>${username}</strong>, cùng nhìn lại thành quả học tập tuần qua của bạn nhé!</p>
    
    <div style="margin-bottom: 24px;">
      <!-- Table layout for grid compatibility -->
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          ${stats.lessonsCompleted ? `
          <td style="width: 50%; padding: 8px;">
            <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; margin-bottom: 4px;">📚</div>
              <div style="font-size: 24px; font-weight: 900; color: #059669;">${stats.lessonsCompleted}</div>
              <div style="font-size: 12px; color: #6b7280; font-weight: bold; margin-top: 4px;">Bài học đã xong</div>
            </div>
          </td>` : ''}
          ${stats.totalXP ? `
          <td style="width: 50%; padding: 8px;">
            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; margin-bottom: 4px;">⚡</div>
              <div style="font-size: 24px; font-weight: 900; color: #d97706;">${stats.totalXP}</div>
              <div style="font-size: 12px; color: #6b7280; font-weight: bold; margin-top: 4px;">XP Tích lũy</div>
            </div>
          </td>` : ''}
        </tr>
        <tr>
          ${stats.streakDays ? `
          <td style="width: 50%; padding: 8px;">
            <div style="background-color: #fff5eb; border: 1px solid #ffedd5; border-radius: 12px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; margin-bottom: 4px;">🔥</div>
              <div style="font-size: 24px; font-weight: 900; color: #ea580c;">${stats.streakDays}</div>
              <div style="font-size: 12px; color: #6b7280; font-weight: bold; margin-top: 4px;">Ngày chuỗi (Streak)</div>
            </div>
          </td>` : ''}
          ${stats.accuracy ? `
          <td style="width: 50%; padding: 8px;">
            <div style="background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; margin-bottom: 4px;">🎯</div>
              <div style="font-size: 24px; font-weight: 900; color: #2563eb;">${stats.accuracy}%</div>
              <div style="font-size: 12px; color: #6b7280; font-weight: bold; margin-top: 4px;">Độ chính xác</div>
            </div>
          </td>` : ''}
        </tr>
      </table>
    </div>
    
    <a href="${BASE_URL}/dashboard" style="display: block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.2);">
      Tiếp Tục Bứt Phá Tuần Mới →
    </a>
  </div>
  <!-- Footer -->
  <div style="padding: 20px 24px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">Báo cáo tự động từ ứng dụng Memoris của bạn.</p>
  </div>
</div>`;

class NotificationEmailService {
  /**
   * Register all event handlers for email notifications.
   * Call this once after eventBus is initialized.
   */
  registerHandlers() {
    // Achievement unlocked → send email
    eventBus.on('achievement:unlocked', async ({ userId, achievement }) => {
      try {
        const user = await User.findById(userId).select('email username');
        if (!user?.email) return;
        await mailerService.sendMail({
          to: user.email,
          subject: `🏆 Bạn đã mở khóa "${achievement.title}" trên Memoris!`,
          text: `Chúc mừng ${user.username}! Bạn đã mở khóa thành tích: ${achievement.title}. ${achievement.description}`,
          html: ACHIEVEMENT_UNLOCKED_HTML(user.username, achievement),
        });
        console.log(`[Email] Achievement notification sent to ${user.email}`);
      } catch (err) {
        console.error('[Email] achievement:unlocked handler error:', err.message);
      }
    });

    // Streak reminder → send email
    eventBus.on('streak:reminder', async ({ userId, streak }) => {
      try {
        const user = await User.findById(userId).select('email username');
        if (!user?.email) return;
        await mailerService.sendMail({
          to: user.email,
          subject: `🔥 Đừng để mất chuỗi học tập ${streak} ngày của bạn!`,
          text: `Chào ${user.username}, bạn đang có chuỗi học tập ${streak} ngày. Hãy hoàn thành một bài học hôm nay để duy trì nhé!`,
          html: STREAK_REMINDER_HTML(user.username, streak),
        });
        console.log(`[Email] Streak reminder sent to ${user.email}`);
      } catch (err) {
        console.error('[Email] streak:reminder handler error:', err.message);
      }
    });

    console.log('[NotificationEmailService] Email event handlers registered');
  }

  /**
   * Send a weekly progress report to a user.
   * Called by a scheduled job (e.g. every Sunday at 6 PM).
   */
  async sendWeeklyReport(userId, stats) {
    try {
      const user = await User.findById(userId).select('email username');
      if (!user?.email) return;

      await mailerService.sendMail({
        to: user.email,
        subject: `📊 Báo cáo học tập tuần qua trên Memoris — tích lũy được ${stats.totalXP || 0} XP!`,
        text: `Chào ${user.username}, đây là báo cáo học tập tuần qua của bạn. Bạn đã đạt được ${stats.totalXP || 0} XP tuần này!`,
        html: WEEKLY_PROGRESS_HTML(user.username, stats),
      });
      console.log(`[Email] Weekly report sent to ${user.email}`);
    } catch (err) {
      console.error('[Email] sendWeeklyReport error:', err.message);
    }
  }
}

module.exports = new NotificationEmailService();
