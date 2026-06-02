const mailerService = require('../../shared/services/mailer.service');
const eventBus = require('../events/eventBus');
const User = require('../../modules/user/user.model');

const BASE_URL = process.env.CLIENT_URL || 'https://smartenglish.app';

const STREAK_REMINDER_HTML = (username, streak) => `
<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #fff;">
  <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 32px 24px; text-align: center;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">🔥 Don't Break Your Streak!</h1>
  </div>
  <div style="padding: 32px 24px;">
    <p style="font-size: 16px; color: #374151; margin: 0 0 16px;">Hi <strong>${username}</strong>,</p>
    <p style="font-size: 15px; color: #6b7280; margin: 0 0 20px;">
      You have a <strong style="color: #f97316;">${streak}-day streak</strong> going! Complete a lesson today to keep it alive.
    </p>
    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center;">
      <div style="font-size: 36px; margin-bottom: 8px;">🔥</div>
      <div style="font-size: 28px; font-weight: 900; color: #f97316;">${streak}</div>
      <div style="font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em;">Day Streak</div>
    </div>
    <a href="${BASE_URL}/duolingo/learn" style="display: block; background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 12px; font-weight: 700; font-size: 16px;">
      Continue Learning →
    </a>
  </div>
  <div style="padding: 16px 24px; border-top: 1px solid #e5e7eb; text-align: center;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">
      You're receiving this email because you have an active streak on Memoris.
    </p>
  </div>
</div>`;

const ACHIEVEMENT_UNLOCKED_HTML = (username, achievement) => `
<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #fff;">
  <div style="background: linear-gradient(135deg, #635bff, #818cf8); padding: 32px 24px; text-align: center;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">🏆 New Achievement Unlocked!</h1>
  </div>
  <div style="padding: 32px 24px; text-align: center;">
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px;">Congratulations <strong>${username}</strong>!</p>
    <div style="background: #f5f3ff; border: 2px solid #c4b5fd; border-radius: 20px; padding: 24px; margin-bottom: 20px;">
      <div style="font-size: 56px; margin-bottom: 12px;">${achievement.emoji || '🏆'}</div>
      <h2 style="color: #4c1d95; margin: 0 0 8px; font-size: 22px;">${achievement.title}</h2>
      <p style="color: #7c3aed; margin: 0 0 16px; font-size: 15px;">${achievement.description}</p>
      <div style="background: #fef3c7; border-radius: 999px; display: inline-block; padding: 6px 16px;">
        <span style="color: #d97706; font-weight: 800; font-size: 14px;">⚡ +${achievement.xpReward || 0} XP</span>
      </div>
    </div>
    <a href="${BASE_URL}/achievements" style="display: block; background: linear-gradient(135deg, #635bff, #818cf8); color: #fff; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 12px; font-weight: 700; font-size: 16px;">
      View All Achievements →
    </a>
  </div>
</div>`;

const WEEKLY_PROGRESS_HTML = (username, stats) => `
<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #fff;">
  <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px 24px; text-align: center;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">📊 Your Weekly Progress</h1>
  </div>
  <div style="padding: 32px 24px;">
    <p style="font-size: 16px; color: #374151; margin: 0 0 20px;">Hi <strong>${username}</strong>, here's your week in review!</p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
      ${stats.lessonsCompleted ? `
      <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; text-align: center;">
        <div style="font-size: 28px; margin-bottom: 4px;">📚</div>
        <div style="font-size: 24px; font-weight: 900; color: #059669;">${stats.lessonsCompleted}</div>
        <div style="font-size: 12px; color: #6b7280;">Lessons</div>
      </div>` : ''}
      ${stats.totalXP ? `
      <div style="background: #fef3c7; border-radius: 12px; padding: 16px; text-align: center;">
        <div style="font-size: 28px; margin-bottom: 4px;">⚡</div>
        <div style="font-size: 24px; font-weight: 900; color: #d97706;">${stats.totalXP}</div>
        <div style="font-size: 12px; color: #6b7280;">XP Earned</div>
      </div>` : ''}
      ${stats.streakDays ? `
      <div style="background: #fff7ed; border-radius: 12px; padding: 16px; text-align: center;">
        <div style="font-size: 28px; margin-bottom: 4px;">🔥</div>
        <div style="font-size: 24px; font-weight: 900; color: #ea580c;">${stats.streakDays}</div>
        <div style="font-size: 12px; color: #6b7280;">Day Streak</div>
      </div>` : ''}
      ${stats.accuracy ? `
      <div style="background: #eff6ff; border-radius: 12px; padding: 16px; text-align: center;">
        <div style="font-size: 28px; margin-bottom: 4px;">🎯</div>
        <div style="font-size: 24px; font-weight: 900; color: #2563eb;">${stats.accuracy}%</div>
        <div style="font-size: 12px; color: #6b7280;">Accuracy</div>
      </div>` : ''}
    </div>
    <a href="${BASE_URL}/dashboard" style="display: block; background: linear-gradient(135deg, #10b981, #059669); color: #fff; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 12px; font-weight: 700; font-size: 16px;">
      Continue This Week →
    </a>
  </div>
</div>`;

class NotificationEmailService {
  /**
   * Register all event handlers for email notifications.
   * Call this once after eventBus is initialized.
   */
  registerHandlers() {
    // Weekly progress report (called externally via cron/scheduler)
    // Achievement unlocked → send email
    eventBus.on('achievement:unlocked', async ({ userId, achievement }) => {
      try {
        const user = await User.findById(userId).select('email username');
        if (!user?.email) return;
        await mailerService.sendMail({
          to: user.email,
          subject: `🏆 You unlocked "${achievement.title}" on Memoris!`,
          text: `Congratulations ${user.username}! You've unlocked the achievement: ${achievement.title}. ${achievement.description}`,
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
          subject: `🔥 Don't lose your ${streak}-day streak!`,
          text: `Hi ${user.username}, you have a ${streak}-day streak. Complete a lesson today to keep it going!`,
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
        subject: `📊 Your Memoris Weekly Report — ${stats.totalXP || 0} XP earned!`,
        text: `Hi ${user.username}, here's your weekly progress. You earned ${stats.totalXP || 0} XP this week!`,
        html: WEEKLY_PROGRESS_HTML(user.username, stats),
      });
      console.log(`[Email] Weekly report sent to ${user.email}`);
    } catch (err) {
      console.error('[Email] sendWeeklyReport error:', err.message);
    }
  }
}

module.exports = new NotificationEmailService();
