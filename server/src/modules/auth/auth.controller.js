const authService = require('./auth.service');
const { ApiResponse } = require('../../shared/utils/apiResponse');
const { AppError } = require('../../shared/errors/AppError');

// Express 5 natively catches async errors — no asyncHandler wrapper needed

// Helper to set JWT cookies (HttpOnly, sameSite=Strict)
function setAuthCookies(res, { accessToken, refreshToken }) {
  const isProd = process.env.NODE_ENV === 'production';
  // Access token – short lived (15m)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  // Refresh token – long lived (7d)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

const register = async (req, res) => {
  const result = await authService.register(req.body);
  // result includes { user, accessToken, refreshToken }
  setAuthCookies(res, result);
  // Do not expose tokens in body for security; only send user profile
  const { accessToken, refreshToken, ...rest } = result;
  res.status(201).json(ApiResponse.success(rest, 'Registration successful'));
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  setAuthCookies(res, result);
  const { accessToken, refreshToken, ...rest } = result;
  res.status(200).json(ApiResponse.success(rest, 'Login successful'));
};

const refreshToken = async (req, res) => {
  // Đọc refresh token từ HttpOnly cookie (không dùng body)
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) throw new AppError('No refresh token provided', 401);
  const result = await authService.refreshToken(token);
  // Set cookies mới
  setAuthCookies(res, result);
  res.status(200).json(ApiResponse.success(null, 'Token refreshed'));
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

module.exports = { register, login, refreshToken, logout, forgotPassword };
