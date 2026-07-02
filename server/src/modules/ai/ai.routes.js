const express = require('express');
const router = express.Router();

const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { requireCsrfForAiRoutes, rateLimitUserFeature } = require('./ai.middleware');
const aiController = require('./ai.controller');

// All AI module routes require user authentication
router.use(authenticate);

// CSRF Origin verification applies to all AI mutations (POST, PUT, DELETE)
router.use(requireCsrfForAiRoutes);

// --- AI Key Management ---
router.get('/key/status', aiController.getAiKeyStatus);
router.post('/key/validate', aiController.validateAiKey);
router.post('/key', aiController.setAiKey);
router.delete('/key', aiController.clearAiKey);

// --- AI Generation Features ---
router.post('/flashcards/generate', rateLimitUserFeature('flashcard', 30, 60), aiController.generateFlashcards);
router.post('/flashcards/enhance', rateLimitUserFeature('flashcard_enhance', 30, 60), aiController.enhanceFlashcard);
router.post('/lessons/generate', authorize('teacher', 'admin'), rateLimitUserFeature('lesson_plan', 30, 60), aiController.generateLesson);

// --- AI Chatbot Endpoints ---
router.post('/chat/sessions', rateLimitUserFeature('create_chat_session', 10, 60), aiController.createChatSession);
router.get('/chat/sessions', aiController.getChatSessions);
router.get('/chat/sessions/:id/messages', aiController.getChatMessages);
router.post('/chat/sessions/:id/messages', rateLimitUserFeature('chatbot', 10, 60), aiController.sendChatMessage);
router.delete('/chat/sessions/:id', aiController.deleteChatSession);
router.post('/chat/sessions/:id/end', rateLimitUserFeature('chat_summary', 10, 60), aiController.endChatSession);
router.get('/chat/sessions/:id/summary', aiController.getChatSummary);
router.post('/chat/sessions/:id/save-vocab', aiController.saveVocabToFlashcard);

module.exports = router;
