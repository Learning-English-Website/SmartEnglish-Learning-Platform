const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../modules/user/user.model');
const { generateAccessToken, generateRefreshToken } = require('../shared/utils/jwt');
const { AppError } = require('../shared/errors/AppError');
const redis = require('../config/redis');

// Serialize user ID into session (not used with JWT, but required by passport)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Helper to store refresh token in Redis
const REFRESH_KEY = (uid) => `refresh:${uid}`;

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new AppError('Google account has no email', 400));
          // Find existing user by email
          let user = await User.findOne({ email });
          if (user) {
            // Attach Google ID if not already stored
            if (!user.oauth?.googleId) {
              user.oauth = user.oauth || {};
              user.oauth.googleId = profile.id;
              await user.save();
            }
          } else {
            // Generate a unique, valid username based on Google display name
            let baseUsername = profile.displayName ? profile.displayName.replace(/\s+/g, '') : 'User';
            // strip special characters to keep it alphanumeric
            baseUsername = baseUsername.replace(/[^a-zA-Z0-9]/g, '');
            if (baseUsername.length < 3) {
              baseUsername = (baseUsername + '123').slice(0, 5);
            }
            if (baseUsername.length > 25) {
              baseUsername = baseUsername.slice(0, 25);
            }

            let username = baseUsername;
            let count = 1;
            // loop to ensure unique username is generated
            while (await User.findOne({ username })) {
              username = `${baseUsername}${count}`;
              count++;
            }

            // Create a new user with Google info
            user = await User.create({
              email,
              username,
              password: undefined, // No local password
              oauth: { googleId: profile.id },
              avatar: profile.photos?.[0]?.value,
            });
          }
          // Generate JWTs
          const accessJwt = generateAccessToken(user);
          const refreshJwt = generateRefreshToken(user);
          // Store refresh token in Redis (7 days TTL)
          await redis.set(REFRESH_KEY(user._id), refreshJwt, 'EX', 7 * 24 * 60 * 60);
          return done(null, { user, accessToken: accessJwt, refreshToken: refreshJwt });
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

module.exports = passport;
