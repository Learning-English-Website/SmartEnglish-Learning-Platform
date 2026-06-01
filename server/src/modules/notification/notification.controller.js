const notificationService = require('./notification.service');
const { asyncHandler } = require('../../shared/utils/asyncHandler');
const { ApiResponse } = require('../../shared/utils/apiResponse');

class NotificationController {
  getNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const result = await notificationService.getNotifications(req.userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true',
    });
    res.json(ApiResponse.success(result));
  });

  getUnreadCount = asyncHandler(async (req, res) => {
    const count = await notificationService.getUnreadCount(req.userId);
    res.json(ApiResponse.success({ unreadCount: count }));
  });

  markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const notification = await notificationService.markAsRead(req.userId, id);
    if (!notification) throw new Error('Notification not found');
    res.json(ApiResponse.success(notification, 'Marked as read'));
  });

  markAllAsRead = asyncHandler(async (req, res) => {
    await notificationService.markAllAsRead(req.userId);
    res.json(ApiResponse.success(null, 'All notifications marked as read'));
  });

  deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await notificationService.deleteNotification(req.userId, id);
    res.json(ApiResponse.success(null, 'Notification deleted'));
  });
}

module.exports = new NotificationController();
