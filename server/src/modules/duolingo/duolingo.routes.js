const express = require('express');
const router = express.Router();
const duolingoController = require('./duolingo.controller');
const { authenticate } = require('../../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Courses
router.get('/courses', duolingoController.getCourses);
router.get('/courses/:courseId', duolingoController.getCourse);
router.post('/courses/select', duolingoController.selectCourse);

// Units & Lessons
router.get('/units', duolingoController.getUnits);
router.get('/lessons/next', duolingoController.getNextLesson);
router.get('/lessons/:lessonId', duolingoController.getLesson);
router.post('/lessons/:lessonId/daily-complete', duolingoController.completeDailyChallenge);
router.post('/lessons/:lessonId/complete', duolingoController.completeLesson);

// Quiz
router.post('/quiz/answer', duolingoController.submitAnswer);

// Hearts
router.get('/hearts', duolingoController.getHearts);
router.post('/hearts/refill', duolingoController.refillHearts);
router.post('/hearts/reduce', duolingoController.reduceHearts);

// Practice
router.post('/lessons/:lessonId/practice', duolingoController.practiceLesson);

// Leaderboard
router.get('/leaderboard', duolingoController.getLeaderboard);

module.exports = router;
