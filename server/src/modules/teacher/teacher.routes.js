const express = require('express');
const router = express.Router();
const teacherController = require('./teacher.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

const teacherOrAdmin = authorize('teacher', 'admin');

// All teacher routes require authentication and teacher/admin authorization
router.use(authenticate);
router.use(teacherOrAdmin);

// Courses
router.get('/courses', teacherController.getCourses);
router.get('/courses/:courseId/tree', teacherController.getCourseTree);
router.put('/courses/:courseId/reorder-units', teacherController.reorderUnits);
router.get('/courses/:id', teacherController.getCourse);
router.post('/courses', teacherController.createCourse);
router.put('/courses/:id', teacherController.updateCourse);
router.delete('/courses/:id', teacherController.deleteCourse);

// Units reordering
router.put('/units/:unitId/reorder-lessons', teacherController.reorderLessons);

// Lessons reordering
router.put('/lessons/:lessonId/reorder-challenges', teacherController.reorderChallenges);

// Units
router.get('/units', teacherController.getUnits);
router.get('/units/:id', teacherController.getUnit);
router.post('/units', teacherController.createUnit);
router.put('/units/:id', teacherController.updateUnit);
router.delete('/units/:id', teacherController.deleteUnit);

// Lessons
router.get('/lessons', teacherController.getLessons);
router.get('/lessons/:id', teacherController.getLesson);
router.post('/lessons', teacherController.createLesson);
router.put('/lessons/:id', teacherController.updateLesson);
router.delete('/lessons/:id', teacherController.deleteLesson);

// Challenges
router.get('/challenges', teacherController.getChallenges);
router.get('/challenges/:id', teacherController.getChallenge);
router.post('/challenges', teacherController.createChallenge);
router.put('/challenges/:id', teacherController.updateChallenge);
router.delete('/challenges/:id', teacherController.deleteChallenge);

// Challenge Options
router.get('/challenge-options', teacherController.getChallengeOptions);
router.post('/challenge-options', teacherController.createChallengeOption);
router.put('/challenge-options/:id', teacherController.updateChallengeOption);
router.delete('/challenge-options/:id', teacherController.deleteChallengeOption);

// Daily Challenges
router.get('/daily-challenges', teacherController.getDailyChallenges);
router.post('/daily-challenges', teacherController.saveDailyChallenge);
router.delete('/daily-challenges/:date', teacherController.deleteDailyChallenge);

module.exports = router;
