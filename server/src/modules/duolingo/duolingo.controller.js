const duolingoService = require('./duolingo.service');
const { asyncHandler } = require('../../shared/utils/asyncHandler');
const { ApiResponse } = require('../../shared/utils/apiResponse');

class DuolingoController {
  // === COURSES ===
  getCourses = asyncHandler(async (req, res) => {
    const courses = await duolingoService.getCourses();
    res.json(ApiResponse.success(courses));
  });

  getCourse = asyncHandler(async (req, res) => {
    const course = await duolingoService.getCourseById(req.params.courseId);
    res.json(ApiResponse.success(course));
  });

  selectCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.body;
    const result = await duolingoService.selectCourse(req.userId, courseId);
    res.json(ApiResponse.success(result, 'Course selected successfully'));
  });

  // === UNITS ===
  getUnits = asyncHandler(async (req, res) => {
    const units = await duolingoService.getUnits(req.userId);
    res.json(ApiResponse.success(units));
  });

  // === LESSONS ===
  getLesson = asyncHandler(async (req, res) => {
    const lesson = await duolingoService.getLesson(req.params.lessonId, req.userId);
    res.json(ApiResponse.success(lesson));
  });

  getNextLesson = asyncHandler(async (req, res) => {
    const lesson = await duolingoService.getNextLesson(req.userId);
    res.json(ApiResponse.success(lesson));
  });

  // === QUIZ / CHALLENGES ===
  submitAnswer = asyncHandler(async (req, res) => {
    const { challengeId, selectedOptionId, userAnswer } = req.body;
    const result = await duolingoService.submitAnswer(req.userId, challengeId, selectedOptionId, userAnswer);
    res.json(ApiResponse.success(result));
  });

  completeLesson = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    const result = await duolingoService.completeLesson(req.userId, lessonId);
    res.json(ApiResponse.success(result));
  });

  // === HEARTS ===
  getHearts = asyncHandler(async (req, res) => {
    const hearts = await duolingoService.getUserHearts(req.userId);
    res.json(ApiResponse.success(hearts));
  });

  refillHearts = asyncHandler(async (req, res) => {
    const result = await duolingoService.refillHearts(req.userId);
    res.json(ApiResponse.success(result));
  });

  reduceHearts = asyncHandler(async (req, res) => {
    const result = await duolingoService.reduceHearts(req.userId);
    if (result.error === 'no_hearts') {
      return res.status(403).json(ApiResponse.error('No hearts left', 'NO_HEARTS'));
    }
    res.json(ApiResponse.success(result));
  });

  // === PRACTICE ===
  practiceLesson = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    const result = await duolingoService.practiceLesson(req.userId, lessonId);
    res.json(ApiResponse.success(result));
  });

  // === LEADERBOARD ===
  getLeaderboard = asyncHandler(async (req, res) => {
    const { type = 'weekly' } = req.query;
    const leaderboard = await duolingoService.getLeaderboard(type);
    res.json(ApiResponse.success(leaderboard));
  });
}

module.exports = new DuolingoController();
