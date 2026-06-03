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

router.use(authenticate);
router.use(adminOnly);

router.get('/stats', adminController.getStats);

// ── Courses ───────────────────────────────────────────────────────────────────
router.get('/courses', adminController.getCourses);
router.get('/courses/:id', adminController.getCourse);
router.post('/courses', adminController.createCourse);
router.put('/courses/:id', adminController.updateCourse);
router.delete('/courses/:id', adminController.deleteCourse);

// ── Units ─────────────────────────────────────────────────────────────────────
router.get('/units', adminController.getUnits);
router.get('/units/:id', adminController.getUnit);
router.post('/units', adminController.createUnit);
router.put('/units/:id', adminController.updateUnit);
router.delete('/units/:id', adminController.deleteUnit);

// ── Lessons ───────────────────────────────────────────────────────────────────
router.get('/lessons', adminController.getLessons);
router.get('/lessons/:id', adminController.getLesson);
router.post('/lessons', adminController.createLesson);
router.put('/lessons/:id', adminController.updateLesson);
router.delete('/lessons/:id', adminController.deleteLesson);

// ── Challenges ─────────────────────────────────────────────────────────────────
router.get('/challenges', adminController.getChallenges);
router.get('/challenges/:id', adminController.getChallenge);
router.post('/challenges', adminController.createChallenge);
router.put('/challenges/:id', adminController.updateChallenge);
router.delete('/challenges/:id', adminController.deleteChallenge);

// ── Challenge Options ──────────────────────────────────────────────────────────
router.get('/challenge-options', adminController.getChallengeOptions);
router.post('/challenge-options', adminController.createChallengeOption);
router.put('/challenge-options/:id', adminController.updateChallengeOption);
router.delete('/challenge-options/:id', adminController.deleteChallengeOption);

// ── Flashcard Sets ────────────────────────────────────────────────────────────
router.get('/flashcard-sets', adminController.getFlashcardSets);
router.get('/flashcard-sets/:id', adminController.getFlashcardSet);
router.delete('/flashcard-sets/:id', adminController.deleteFlashcardSet);

// ── Folders ───────────────────────────────────────────────────────────────────
router.get('/folders', adminController.getAllFolders);
router.get('/folders/:id', adminController.getFolder);
router.delete('/folders/:id', adminController.deleteFolder);

// ── Community Sets ────────────────────────────────────────────────────────────
router.get('/community-sets', adminController.getCommunitySets);
router.delete('/community-sets/:id', adminController.deleteCommunitySet);

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', adminController.updateUser);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
