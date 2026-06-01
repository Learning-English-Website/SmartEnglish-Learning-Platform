const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

// ── Enums ──────────────────────────────────────────────────────────────────────
const ROLE_ENUM = ['admin', 'student', 'teacher'];
const PREMIUM_ENUM = ['free', 'trial', 'premium'];

// ── User Schema ────────────────────────────────────────────────────────────────
const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must not exceed 30 characters'],
    },
    password: {
      type: String,
      required: function () {
        return !this.oauth?.googleId && !this.oauth?.facebookId;
      },
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ROLE_ENUM,
      default: 'student',
    },
    avatar: {
      type: String,
      default: null,
    },
    premium: {
      type: String,
      enum: PREMIUM_ENUM,
      default: 'free',
    },
    oauth: {
      googleId: { type: String, default: null },
      facebookId: { type: String, default: null },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    // ── Gamification ───────────────────────────────────────────────────────────
    streak: {
      current:       { type: Number, default: 0 },
      longest:       { type: Number, default: 0 },
      lastStudyDate: { type: Date,   default: null },
    },
    streakFreezes: {
      type: Number,
      default: 0
    },

    // ── Notification preferences / scheduling ───────────────────────────────────
    emailReminderEnabled: {
      type: Boolean,
      default: true,
    },
    lastStreakReminderSentAt: {
      type: Date,
      default: null,
    },

    gamification: {
      xp:    { type: Number, default: 0 },
      level: { type: Number, default: 1 },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
// NOTE: email and username indexes are auto-created by `unique: true` in schema fields.
// Explicit schema.index() calls below are for non-unique compound indexes only.
UserSchema.index({ 'oauth.googleId': 1 });
UserSchema.index({ 'oauth.facebookId': 1 });

// ── Pre-save Hook: Hash password ───────────────────────────────────────────────
UserSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// ── Instance Methods ───────────────────────────────────────────────────────────
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.toPublicProfile = function () {
  return {
    _id: this._id,
    email: this.email,
    username: this.username,
    role: this.role,
    avatar: this.avatar,
    premium: this.premium,
    isVerified: this.isVerified,
    streak: this.streak,
    streakFreezes: this.streakFreezes,
    gamification: this.gamification,
    emailReminderEnabled: this.emailReminderEnabled,
    lastStreakReminderSentAt: this.lastStreakReminderSentAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

UserSchema.methods.isOAuthUser = function () {
  return !!(this.oauth?.googleId || this.oauth?.facebookId);
};

// ── Static Methods ─────────────────────────────────────────────────────────────
UserSchema.statics.findByEmail = function (email) {
  return this.findOne({ email }).select('+password');
};

UserSchema.statics.findByGoogleId = function (googleId) {
  return this.findOne({ 'oauth.googleId': googleId });
};

UserSchema.statics.findByFacebookId = function (facebookId) {
  return this.findOne({ 'oauth.facebookId': facebookId });
};

// ── Export ─────────────────────────────────────────────────────────────────────
const User = mongoose.model('User', UserSchema);

module.exports = User;
