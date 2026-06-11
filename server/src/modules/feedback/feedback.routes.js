const express = require('express');
const router = express.Router();
const feedbackController = require('./feedback.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Student route
router.post('/', authenticate, feedbackController.createFeedback);

// Admin / CSKH routes
router.get('/admin', authenticate, authorize('admin', 'cskh'), feedbackController.getFeedbacks);
router.get('/admin/:id', authenticate, authorize('admin', 'cskh'), feedbackController.getFeedbackDetail);
router.put('/admin/:id', authenticate, authorize('admin', 'cskh'), feedbackController.replyFeedback);

module.exports = router;
