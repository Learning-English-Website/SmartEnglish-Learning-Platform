const authService = require('./auth.service');
const { ApiResponse } = require('../../shared/utils/apiResponse');

// Express 5 natively catches async errors — no asyncHandler wrapper needed

const register = async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(ApiResponse.success(result, 'Registration successful'));
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(200).json(ApiResponse.success(result, 'Login successful'));
};

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshToken(refreshToken);
  res.status(200).json(ApiResponse.success(result, 'Token refreshed'));
};

const logout = async (req, res) => {
  await authService.logout(req.user._id);
  res.status(200).json(ApiResponse.success(null, 'Logged out successfully'));
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  res.status(200).json(ApiResponse.success(null, result.message));
};

module.exports = { register, login, refreshToken, logout, forgotPassword };
