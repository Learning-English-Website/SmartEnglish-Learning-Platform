const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authenticate } = require('../../middleware/auth.middleware');

const adminOnly = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } });
  }
  next();
};

const adminOrCskh = async (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'cskh')) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin or CSKH access required' } });
  }
  next();
};

router.use(authenticate);

// Stats
router.get('/stats', adminOnly, adminController.getStats);

// ── Courses ───────────────────────────────────────────────────────────────────
router.get('/courses', adminOnly, adminController.getCourses);
router.get('/courses/:id', adminOnly, adminController.getCourse);
router.post('/courses', adminOnly, adminController.createCourse);
router.put('/courses/:id', adminOnly, adminController.updateCourse);
router.delete('/courses/:id', adminOnly, adminController.deleteCourse);

// ── Units ─────────────────────────────────────────────────────────────────────
router.get('/units', adminOnly, adminController.getUnits);
router.get('/units/:id', adminOnly, adminController.getUnit);
router.post('/units', adminOnly, adminController.createUnit);
router.put('/units/:id', adminOnly, adminController.updateUnit);
router.delete('/units/:id', adminOnly, adminController.deleteUnit);

// ── Lessons ───────────────────────────────────────────────────────────────────
router.get('/lessons', adminOnly, adminController.getLessons);
router.get('/lessons/:id', adminOnly, adminController.getLesson);
router.post('/lessons', adminOnly, adminController.createLesson);
router.put('/lessons/:id', adminOnly, adminController.updateLesson);
router.delete('/lessons/:id', adminOnly, adminController.deleteLesson);

// ── Challenges ─────────────────────────────────────────────────────────────────
router.get('/challenges', adminOnly, adminController.getChallenges);
router.get('/challenges/:id', adminOnly, adminController.getChallenge);
router.post('/challenges', adminOnly, adminController.createChallenge);
router.put('/challenges/:id', adminOnly, adminController.updateChallenge);
router.delete('/challenges/:id', adminOnly, adminController.deleteChallenge);

// ── Challenge Options ──────────────────────────────────────────────────────────
router.get('/challenge-options', adminOnly, adminController.getChallengeOptions);
router.post('/challenge-options', adminOnly, adminController.createChallengeOption);
router.put('/challenge-options/:id', adminOnly, adminController.updateChallengeOption);
router.delete('/challenge-options/:id', adminOnly, adminController.deleteChallengeOption);

// ── Flashcard Sets ────────────────────────────────────────────────────────────
router.get('/flashcard-sets', adminOnly, adminController.getFlashcardSets);
router.get('/flashcard-sets/:id', adminOnly, adminController.getFlashcardSet);
router.delete('/flashcard-sets/:id', adminOnly, adminController.deleteFlashcardSet);

// ── Folders ───────────────────────────────────────────────────────────────────
router.get('/folders', adminOnly, adminController.getAllFolders);
router.get('/folders/:id', adminOnly, adminController.getFolder);
router.delete('/folders/:id', adminOnly, adminController.deleteFolder);

// ── Community Sets ────────────────────────────────────────────────────────────
router.get('/community-sets', adminOnly, adminController.getCommunitySets);
router.delete('/community-sets/:id', adminOnly, adminController.deleteCommunitySet);

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', adminOrCskh, adminController.getUsers);
router.get('/users/:id', adminOrCskh, adminController.getUser);
router.put('/users/:id', adminOnly, adminController.updateUser);
router.put('/users/:id/role', adminOnly, adminController.updateUserRole);
router.put('/users/:id/premium', adminOrCskh, adminController.updateUserPremium);
router.delete('/users/:id', adminOnly, adminController.deleteUser);

// ── Orders & Transactions ─────────────────────────────────────────────────────
router.get('/orders', adminOrCskh, adminController.getOrders);
router.post('/orders/:orderId/verify', adminOrCskh, adminController.verifyOrderPayment);
router.put('/orders/:orderId/status', adminOrCskh, adminController.updateOrderStatusManually);

module.exports = router;
