const express = require('express');
const router = express.Router();
const supportChatController = require('./supportChat.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Student endpoints
router.get('/messages', authenticate, supportChatController.getStudentMessages.bind(supportChatController));
router.post('/messages', authenticate, supportChatController.sendStudentMessage.bind(supportChatController));

// CSKH / Admin endpoints
router.get('/admin/sessions', authenticate, authorize('admin', 'cskh'), supportChatController.getSupportSessions.bind(supportChatController));
router.get('/admin/sessions/:studentId/messages', authenticate, authorize('admin', 'cskh'), supportChatController.getStudentMessagesForCSKH.bind(supportChatController));
router.post('/admin/sessions/:studentId/messages', authenticate, authorize('admin', 'cskh'), supportChatController.sendCSKHMessage.bind(supportChatController));
router.put('/admin/sessions/:studentId/assign', authenticate, authorize('admin', 'cskh'), supportChatController.assignCSKH.bind(supportChatController));
router.put('/admin/sessions/:studentId/close', authenticate, authorize('admin', 'cskh'), supportChatController.closeSession.bind(supportChatController));

module.exports = router;
