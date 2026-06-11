const Feedback = require('../../models/feedback.model');
const { ApiResponse } = require('../../shared/utils/apiResponse');
const { AppError } = require('../../shared/errors/AppError');
const { asyncHandler } = require('../../shared/utils/asyncHandler');

class FeedbackController {
  // Student: Create feedback
  createFeedback = asyncHandler(async (req, res) => {
    const { title, content, category, attachments } = req.body;
    if (!title || !content) {
      throw new AppError('Title and content are required', 400);
    }

    const feedback = await Feedback.create({
      user: req.userId,
      title,
      content,
      category: category || 'other',
      attachments: attachments || [],
      status: 'pending'
    });

    res.status(201).json(ApiResponse.success(feedback, 'Feedback submitted successfully'));
  });

  // Admin/CSKH: Get all feedbacks with filters & pagination
  getFeedbacks = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, category, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;

    if (search) {
      const User = require('../user/user.model');
      const matchedUsers = await User.find({
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = matchedUsers.map(u => u._id);

      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { user: { $in: userIds } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [feedbacks, total] = await Promise.all([
      Feedback.find(filter)
        .populate('user', 'username email avatar')
        .populate('repliedBy', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Feedback.countDocuments(filter)
    ]);

    res.json(ApiResponse.success({
      feedbacks,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    }, 'Feedbacks fetched successfully'));
  });

  // Admin/CSKH: Get feedback details
  getFeedbackDetail = asyncHandler(async (req, res) => {
    const feedback = await Feedback.findById(req.params.id)
      .populate('user', 'username email avatar')
      .populate('repliedBy', 'username email');
    if (!feedback) {
      throw new AppError('Feedback not found', 404);
    }
    res.json(ApiResponse.success(feedback, 'Feedback details fetched'));
  });

  // Admin/CSKH: Reply and/or update status of a feedback
  replyFeedback = asyncHandler(async (req, res) => {
    const { status, cskhReply } = req.body;
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      throw new AppError('Feedback not found', 404);
    }

    if (status) {
      if (!['pending', 'in_progress', 'resolved'].includes(status)) {
        throw new AppError('Invalid status value', 400);
      }
      feedback.status = status;
    }

    if (cskhReply !== undefined) {
      feedback.cskhReply = cskhReply;
      feedback.repliedBy = req.userId;
      if (feedback.status === 'pending') {
        feedback.status = 'in_progress';
      }
    }

    await feedback.save();
    
    await feedback.populate('user', 'username email avatar');
    await feedback.populate('repliedBy', 'username email');

    res.json(ApiResponse.success(feedback, 'Feedback updated successfully'));
  });
}

module.exports = new FeedbackController();
