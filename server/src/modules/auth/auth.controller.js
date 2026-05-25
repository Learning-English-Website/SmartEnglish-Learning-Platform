const authService = require('./auth.service');
const { ApiResponse } = require('../../shared/utils/apiResponse');
const { AppError } = require('../../shared/errors/AppError');

// Express 5 natively catches async errors — no asyncHandler wrapper needed

// Helper to set JWT cookies (HttpOnly)
function setAuthCookies(res, { accessToken, refreshToken }) {
  const isProd = process.env.NODE_ENV === 'production';
  // Development: lax (works across subdomains/ports). Production: none + secure
  const sameSite = isProd ? 'none' : 'lax';
  // Access token – short lived (15m)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite,
    maxAge: 15 * 60 * 1000,
  });
  // Refresh token – long lived (7d)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

const register = async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(ApiResponse.success(result, 'OTP sent. Verify your email to activate account.'));
};

const resendVerificationOtp = async (req, res) => {
  const result = await authService.resendVerificationOtp(req.body.email);
  res.status(200).json(ApiResponse.success(null, result.message));
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  setAuthCookies(res, result);
  res.status(200).json(ApiResponse.success(result, 'Login successful'));
};

const refreshToken = async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) throw new AppError('No refresh token provided', 401);
  const result = await authService.refreshToken(token);
  setAuthCookies(res, result);
  res.status(200).json(ApiResponse.success(result, 'Token refreshed'));
};

const logout = async (req, res) => {
  await authService.logout(req.user._id);
  // Clear HttpOnly cookies
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.status(200).json(ApiResponse.success(null, 'Logged out successfully'));
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  res.status(200).json(ApiResponse.success(null, result.message));
};

const verifyResetOtp = async (req, res) => {
  const { email, otp } = req.body;
  const result = await authService.verifyResetOtp(email, otp);
  res.status(200).json(ApiResponse.success(null, result.message));
};

const verifyEmailOtp = async (req, res) => {
  const { email, otp } = req.body;
  const result = await authService.verifyEmailOtp(email, otp);
  setAuthCookies(res, result);
  res.status(200).json(ApiResponse.success(result, result.message));
};

const resetPasswordWithOtp = async (req, res) => {
  const result = await authService.resetPasswordWithOtp(req.body);
  res.status(200).json(ApiResponse.success(null, result.message));
};

module.exports = {
  register,
  resendVerificationOtp,
  login,
  refreshToken,
  logout,
  forgotPassword,
  verifyResetOtp,
  verifyEmailOtp,
  resetPasswordWithOtp,
};
