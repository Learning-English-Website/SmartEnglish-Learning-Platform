const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

const adminOnly = authorize('admin');
const adminOrTeacher = authorize('admin', 'teacher');

const adminOrCskh = async (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'cskh')) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin or CSKH access required' } });
  }
  next();
};

// All administrative routes require authentication
router.use(authenticate);

// ── Admin-Only or CSKH Routes (Stats, Flashcards, Folders, Community, Users, Orders) ───────────────────
router.get('/stats', adminOnly, adminController.getStats);

// Flashcards & Folders moderation
router.get('/flashcard-sets', adminOnly, adminController.getFlashcardSets);
router.get('/flashcard-sets/:id', adminOnly, adminController.getFlashcardSet);
router.delete('/flashcard-sets/:id', adminOnly, adminController.deleteFlashcardSet);

router.get('/folders', adminOnly, adminController.getAllFolders);
router.get('/folders/:id', adminOnly, adminController.getFolder);
router.delete('/folders/:id', adminOnly, adminController.deleteFolder);

router.get('/community-sets', adminOnly, adminController.getCommunitySets);
router.delete('/community-sets/:id', adminOnly, adminController.deleteCommunitySet);

// User management
router.get('/users', adminOrCskh, adminController.getUsers);
router.get('/users/:id', adminOrCskh, adminController.getUser);
router.put('/users/:id', adminOnly, adminController.updateUser);
router.put('/users/:id/role', adminOnly, adminController.updateUserRole);
router.put('/users/:id/premium', adminOrCskh, adminController.updateUserPremium);
router.delete('/users/:id', adminOnly, adminController.deleteUser);

// Orders & Transactions
router.get('/orders', adminOrCskh, adminController.getOrders);
router.post('/orders/:orderId/verify', adminOrCskh, adminController.verifyOrderPayment);
router.put('/orders/:orderId/status', adminOrCskh, adminController.updateOrderStatusManually);

// ── Admin & Teacher Shared Routes (Duolingo Curriculum) ─────────────────────
router.use(adminOrTeacher);

// Courses
router.get('/courses', adminController.getCourses);
router.get('/courses/:courseId/tree', adminController.getCourseTree);
router.put('/courses/:courseId/reorder-units', adminController.reorderUnits);
router.get('/courses/:id', adminController.getCourse);
router.post('/courses', adminController.createCourse);
router.put('/courses/:id', adminController.updateCourse);
router.delete('/courses/:id', adminController.deleteCourse);

// Units reordering
router.put('/units/:unitId/reorder-lessons', adminController.reorderLessons);

// Lessons reordering
router.put('/lessons/:lessonId/reorder-challenges', adminController.reorderChallenges);

// Units
router.get('/units', adminController.getUnits);
router.get('/units/:id', adminController.getUnit);
router.post('/units', adminController.createUnit);
router.put('/units/:id', adminController.updateUnit);
router.delete('/units/:id', adminController.deleteUnit);

// Lessons
router.get('/lessons', adminController.getLessons);
router.get('/lessons/:id', adminController.getLesson);
router.post('/lessons', adminController.createLesson);
router.put('/lessons/:id', adminController.updateLesson);
router.delete('/lessons/:id', adminController.deleteLesson);

// Challenges
router.get('/challenges', adminController.getChallenges);
router.get('/challenges/:id', adminController.getChallenge);
router.post('/challenges', adminController.createChallenge);
router.put('/challenges/:id', adminController.updateChallenge);
router.delete('/challenges/:id', adminController.deleteChallenge);

// Challenge Options
router.get('/challenge-options', adminController.getChallengeOptions);
router.post('/challenge-options', adminController.createChallengeOption);
router.put('/challenge-options/:id', adminController.updateChallengeOption);
router.delete('/challenge-options/:id', adminController.deleteChallengeOption);

module.exports = router;
