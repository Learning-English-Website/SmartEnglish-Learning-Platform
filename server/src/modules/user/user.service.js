const User = require('./user.model');
const redis = require('../../config/redis');
const { AppError } = require('../../shared/errors/AppError');

const refreshKey = (userId) => `refresh:${userId}`;

class UserService {
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user.toPublicProfile();
  }

  async updateProfile(userId, data) {
    const allowedFields = ['username', 'avatar'];
    const updateData = {};
    allowedFields.forEach((field) => {
      if (data[field] !== undefined) updateData[field] = data[field];
    });

    // Check username uniqueness if changing
    if (updateData.username) {
      const existing = await User.findOne({ username: updateData.username, _id: { $ne: userId } });
      if (existing) throw new AppError('Username already taken', 409);
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });
    if (!user) throw new AppError('User not found', 404);
    return user.toPublicProfile();
  }

  async deleteAccount(userId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    await redis.del(refreshKey(String(userId)));
    await User.findByIdAndDelete(userId);
    return { message: 'Account deleted successfully' };
  }
}

module.exports = new UserService();
