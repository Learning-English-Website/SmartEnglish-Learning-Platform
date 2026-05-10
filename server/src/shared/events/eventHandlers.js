const eventBus = require('./eventBus');

/**
 * Register all domain event handlers here.
 * This keeps side-effect logic (emails, notifications, analytics)
 * decoupled from the primary business logic.
 */

// Example: user:registered → send welcome email
eventBus.on('user:registered', async ({ userId, email, username }) => {
  try {
    console.log(`📧 [Event] user:registered — ${email}`);
    // TODO: send welcome email via nodemailer
  } catch (err) {
    console.error('[EventBus] user:registered handler error:', err.message);
  }
});

// Example: user:passwordReset → send reset email
eventBus.on('user:passwordReset', async ({ email, resetToken }) => {
  try {
    console.log(`📧 [Event] user:passwordReset — ${email}`);
    // TODO: send password reset email
  } catch (err) {
    console.error('[EventBus] user:passwordReset handler error:', err.message);
  }
});

module.exports = eventBus;
