const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

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
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never return password in queries by default
    },
    role: {
      type: String,
      enum: ['admin', 'student', 'teacher'],
      default: 'student',
    },
    avatar: {
      type: String,
      default: null,
    },
    premium: {
      type: String,
      enum: ['free', 'trial', 'premium'],
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
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// email and username already indexed via unique:true in schema definition
UserSchema.index({ 'oauth.googleId': 1 });

// ── Pre-save Hook: Hash password ──────────────────────────────────────────────
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// ── Instance Methods ──────────────────────────────────────────────────────────
UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
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
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
};

// ── Static Methods ────────────────────────────────────────────────────────────
UserSchema.statics.findByEmail = function (email) {
  return this.findOne({ email }).select('+password');
};

const User = mongoose.model('User', UserSchema);
module.exports = User;
