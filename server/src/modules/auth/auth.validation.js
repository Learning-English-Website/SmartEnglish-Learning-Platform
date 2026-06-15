const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Vui lòng nhập địa chỉ email hợp lệ',
    'any.required': 'Email là bắt buộc',
  }),
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    'string.alphanum': 'Tên đăng nhập chỉ được chứa chữ cái và chữ số',
    'string.min': 'Tên đăng nhập phải có ít nhất 3 ký tự',
    'string.max': 'Tên đăng nhập không được vượt quá 30 ký tự',
    'any.required': 'Tên đăng nhập là bắt buộc',
  }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
      'string.pattern.base': 'Mật khẩu phải chứa ít nhất một chữ hoa, một chữ thường và một chữ số',
      'any.required': 'Mật khẩu là bắt buộc',
    }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Vui lòng nhập địa chỉ email hợp lệ',
    'any.required': 'Email là bắt buộc',
  }),
});

const resendVerificationOtpSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Vui lòng nhập địa chỉ email hợp lệ',
    'any.required': 'Email là bắt buộc',
  }),
});

const verifyEmailOtpSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Vui lòng nhập địa chỉ email hợp lệ',
    'any.required': 'Email là bắt buộc',
  }),
  otp: Joi.string().pattern(/^\d{6}$/).required().messages({
    'string.pattern.base': 'Mã OTP phải gồm 6 chữ số',
    'any.required': 'Mã OTP là bắt buộc',
  }),
});

const resetPasswordOtpSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Vui lòng nhập địa chỉ email hợp lệ',
    'any.required': 'Email là bắt buộc',
  }),
  otp: Joi.string().pattern(/^\d{6}$/).required().messages({
    'string.pattern.base': 'Mã OTP phải gồm 6 chữ số',
    'any.required': 'Mã OTP là bắt buộc',
  }),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
      'string.pattern.base': 'Mật khẩu phải chứa ít nhất một chữ hoa, một chữ thường và một chữ số',
      'any.required': 'Mật khẩu mới là bắt buộc',
    }),
  resetToken: Joi.string().optional(),
});

const googleAuthSchema = Joi.object({
  idToken: Joi.string().required().messages({
    'any.required': 'Google ID token là bắt buộc',
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resendVerificationOtpSchema,
  verifyEmailOtpSchema,
  resetPasswordOtpSchema,
  googleAuthSchema,
};
