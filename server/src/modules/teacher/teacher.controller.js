const Course = require('../../models/course.model');
const Unit = require('../../models/unit.model');
const Lesson = require('../../models/lesson.model');
const Challenge = require('../../models/challenge.model');
const ChallengeOption = require('../../models/challengeOption.model');
const DailyChallenge = require('../../models/dailyChallenge.model');
const { ApiResponse } = require('../../shared/utils/apiResponse');
const { AppError } = require('../../shared/errors/AppError');

// ── Courses ───────────────────────────────────────────────────────────────────

const getCourses = async (req, res) => {
  const { page, limit = 10, search } = req.query;
  const filter = {};
  if (search) {
    filter.title = { $regex: search, $options: 'i' };
  }

  if (!page && req.query.paginate !== 'true') {
    const courses = await Course.find(filter).sort({ order: 1, createdAt: -1 });
    return res.json(ApiResponse.success(courses, 'Courses fetched'));
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [courses, total] = await Promise.all([
    Course.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Course.countDocuments(filter),
  ]);
  res.json(ApiResponse.success({
    courses,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  }, 'Courses fetched'));
};

const getCourse = async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new AppError('Course not found', 404);
  res.json(ApiResponse.success(course, 'Course fetched'));
};

const createCourse = async (req, res) => {
  const course = await Course.create({
    ...req.body,
    isPublished: req.body.isPublished ?? true,
  });
  res.status(201).json(ApiResponse.success(course, 'Course created'));
};

const updateCourse = async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!course) throw new AppError('Course not found', 404);
  res.json(ApiResponse.success(course, 'Course updated'));
};

const deleteCourse = async (req, res) => {
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) throw new AppError('Course not found', 404);

  await Unit.deleteMany({ course: course._id });
  const deletedLessonIds = [];

  const units = await Unit.find({ course: course._id });
  for (const unit of units) {
    const lessons = await Lesson.find({ unit: unit._id });
    deletedLessonIds.push(...lessons.map(l => l._id));
    await Lesson.deleteMany({ unit: unit._id });
  }

  for (const lessonId of deletedLessonIds) {
    const challenges = await Challenge.find({ lesson: lessonId });
    for (const ch of challenges) {
      await ChallengeOption.deleteMany({ challenge: ch._id });
    }
    await Challenge.deleteMany({ lesson: lessonId });
  }

  res.json(ApiResponse.success(null, 'Course and all related content deleted'));
};

// ── Units ─────────────────────────────────────────────────────────────────────

const getUnits = async (req, res) => {
  const { courseId, page, limit = 10, search } = req.query;
  const filter = courseId ? { course: courseId } : {};
  if (search) {
    filter.title = { $regex: search, $options: 'i' };
  }

  if (!page && req.query.paginate !== 'true') {
    const units = await Unit.find(filter).populate('course', 'title').sort({ order: 1 });
    return res.json(ApiResponse.success(units, 'Units fetched'));
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [units, total] = await Promise.all([
    Unit.find(filter)
      .populate('course', 'title')
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Unit.countDocuments(filter),
  ]);
  res.json(ApiResponse.success({
    units,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  }, 'Units fetched'));
};

const getUnit = async (req, res) => {
  const unit = await Unit.findById(req.params.id).populate('course', 'title');
  if (!unit) throw new AppError('Unit not found', 404);
  res.json(ApiResponse.success(unit, 'Unit fetched'));
};

const createUnit = async (req, res) => {
  const unit = await Unit.create({
    ...req.body,
    isLockedDefault: false,
  });
  await unit.populate('course', 'title');
  res.status(201).json(ApiResponse.success(unit, 'Unit created'));
};

const updateUnit = async (req, res) => {
  const unit = await Unit.findByIdAndUpdate(
    req.params.id,
    { ...req.body, isLockedDefault: false },
    { new: true }
  ).populate('course', 'title');
  if (!unit) throw new AppError('Unit not found', 404);
  res.json(ApiResponse.success(unit, 'Unit updated'));
};

const deleteUnit = async (req, res) => {
  const unit = await Unit.findByIdAndDelete(req.params.id);
  if (!unit) throw new AppError('Unit not found', 404);

  const deletedLessonIds = [];
  const lessons = await Lesson.find({ unit: unit._id });
  deletedLessonIds.push(...lessons.map(l => l._id));
  await Lesson.deleteMany({ unit: unit._id });

  for (const lessonId of deletedLessonIds) {
    const challenges = await Challenge.find({ lesson: lessonId });
    for (const ch of challenges) {
      await ChallengeOption.deleteMany({ challenge: ch._id });
    }
    await Challenge.deleteMany({ lesson: lessonId });
  }

  res.json(ApiResponse.success(null, 'Unit and all related lessons/challenges deleted'));
};

// ── Lessons ───────────────────────────────────────────────────────────────────

const getLessons = async (req, res) => {
  const { unitId, page, limit = 10, search } = req.query;
  const filter = unitId ? { unit: unitId } : {};
  if (search) {
    filter.title = { $regex: search, $options: 'i' };
  }

  if (!page && req.query.paginate !== 'true') {
    const lessons = await Lesson.find(filter)
      .populate({
        path: 'unit',
        select: 'title course',
        populate: {
          path: 'course',
          select: 'title'
        }
      })
      .sort({ order: 1 });
    return res.json(ApiResponse.success(lessons, 'Lessons fetched'));
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [lessons, total] = await Promise.all([
    Lesson.find(filter)
      .populate({
        path: 'unit',
        select: 'title course',
        populate: {
          path: 'course',
          select: 'title'
        }
      })
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Lesson.countDocuments(filter),
  ]);
  res.json(ApiResponse.success({
    lessons,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  }, 'Lessons fetched'));
};

const getLesson = async (req, res) => {
  const lesson = await Lesson.findById(req.params.id).populate('unit', 'title course');
  if (!lesson) throw new AppError('Lesson not found', 404);
  res.json(ApiResponse.success(lesson, 'Lesson fetched'));
};

const createLesson = async (req, res) => {
  const lesson = await Lesson.create(req.body);
  await lesson.populate('unit', 'title course');
  res.status(201).json(ApiResponse.success(lesson, 'Lesson created'));
};

const updateLesson = async (req, res) => {
  const lesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('unit', 'title course');
  if (!lesson) throw new AppError('Lesson not found', 404);
  res.json(ApiResponse.success(lesson, 'Lesson updated'));
};

const deleteLesson = async (req, res) => {
  const lesson = await Lesson.findByIdAndDelete(req.params.id);
  if (!lesson) throw new AppError('Lesson not found', 404);

  const challenges = await Challenge.find({ lesson: lesson._id });
  for (const ch of challenges) {
    await ChallengeOption.deleteMany({ challenge: ch._id });
  }
  await Challenge.deleteMany({ lesson: lesson._id });

  res.json(ApiResponse.success(null, 'Lesson and all challenges deleted'));
};

// ── Challenges ─────────────────────────────────────────────────────────────────

const getChallenges = async (req, res) => {
  const { lessonId, page = 1, limit = 10, search } = req.query;
  const filter = lessonId ? { lesson: lessonId } : {};
  
  if (search) {
    filter.question = { $regex: search, $options: 'i' };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [challenges, total] = await Promise.all([
    Challenge.find(filter)
      .populate('lesson', 'title unit')
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Challenge.countDocuments(filter),
  ]);

  res.json(ApiResponse.success({
    challenges,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  }, 'Challenges fetched'));
};

const getChallenge = async (req, res) => {
  const challenge = await Challenge.findById(req.params.id)
    .populate('lesson', 'title unit');
  if (!challenge) throw new AppError('Challenge not found', 404);
  
  const challengeObj = challenge.toObject();
  
  // Fetch options from ChallengeOption first. If none exist, fall back to embedded challenge.options
  const challengeOptions = await ChallengeOption.find({ challenge: challenge._id });
  if (challengeOptions && challengeOptions.length > 0) {
    challengeObj.options = challengeOptions.map(opt => opt.toObject());
  } else {
    challengeObj.options = challengeObj.options || [];
  }
  
  res.json(ApiResponse.success(challengeObj, 'Challenge fetched'));
};

const createChallenge = async (req, res) => {
  const { options, ...challengeData } = req.body;
  const challenge = await Challenge.create(challengeData);

  if (options && Array.isArray(options) && options.length > 0) {
    const optionDocs = options.map(opt => ({
      ...opt,
      challenge: challenge._id,
    }));
    await ChallengeOption.insertMany(optionDocs);
  }

  await challenge.populate('lesson', 'title unit');
  
  const challengeObj = challenge.toObject();
  const challengeOptions = await ChallengeOption.find({ challenge: challenge._id });
  if (challengeOptions && challengeOptions.length > 0) {
    challengeObj.options = challengeOptions.map(opt => opt.toObject());
  } else {
    challengeObj.options = challengeObj.options || [];
  }

  res.status(201).json(ApiResponse.success(challengeObj, 'Challenge created'));
};

const updateChallenge = async (req, res) => {
  const { options, ...challengeData } = req.body;

  const challenge = await Challenge.findByIdAndUpdate(req.params.id, challengeData, { new: true });
  if (!challenge) throw new AppError('Challenge not found', 404);

  if (options && Array.isArray(options)) {
    await ChallengeOption.deleteMany({ challenge: challenge._id });
    if (options.length > 0) {
      const optionDocs = options.map(opt => ({
        ...opt,
        challenge: challenge._id,
      }));
      await ChallengeOption.insertMany(optionDocs);
    }
  }

  await challenge.populate('lesson', 'title unit');
  
  const challengeObj = challenge.toObject();
  const challengeOptions = await ChallengeOption.find({ challenge: challenge._id });
  if (challengeOptions && challengeOptions.length > 0) {
    challengeObj.options = challengeOptions.map(opt => opt.toObject());
  } else {
    challengeObj.options = challengeObj.options || [];
  }

  res.json(ApiResponse.success(challengeObj, 'Challenge updated'));
};

const deleteChallenge = async (req, res) => {
  const challenge = await Challenge.findByIdAndDelete(req.params.id);
  if (!challenge) throw new AppError('Challenge not found', 404);
  await ChallengeOption.deleteMany({ challenge: challenge._id });
  res.json(ApiResponse.success(null, 'Challenge and options deleted'));
};

// ── Challenge Options ──────────────────────────────────────────────────────────

const getChallengeOptions = async (req, res) => {
  const { challengeId } = req.query;
  const filter = challengeId ? { challenge: challengeId } : {};
  const options = await ChallengeOption.find(filter).populate('challenge', 'question');
  res.json(ApiResponse.success(options, 'Options fetched'));
};

const createChallengeOption = async (req, res) => {
  const option = await ChallengeOption.create(req.body);
  res.status(201).json(ApiResponse.success(option, 'Option created'));
};

const updateChallengeOption = async (req, res) => {
  const option = await ChallengeOption.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!option) throw new AppError('Option not found', 404);
  res.json(ApiResponse.success(option, 'Option updated'));
};

const deleteChallengeOption = async (req, res) => {
  const option = await ChallengeOption.findByIdAndDelete(req.params.id);
  if (!option) throw new AppError('Option not found', 404);
  res.json(ApiResponse.success(null, 'Option deleted'));
};

// ── Course Outline Tree ────────────────────────────────────────────────────────

const getCourseTree = async (req, res) => {
  const { courseId } = req.params;
  const course = await Course.findById(courseId);
  if (!course) throw new AppError('Course not found', 404);

  const units = await Unit.find({ course: courseId }).sort({ order: 1 }).lean();
  const unitIds = units.map(u => u._id);

  const lessons = await Lesson.find({ unit: { $in: unitIds } }).sort({ order: 1 }).lean();
  const lessonIds = lessons.map(l => l._id);

  const challenges = await Challenge.find({ lesson: { $in: lessonIds } })
    .select('_id type question order lesson')
    .sort({ order: 1 })
    .lean();

  const lessonMap = {};
  lessons.forEach(l => {
    lessonMap[l._id] = { ...l, challenges: [] };
  });
  challenges.forEach(ch => {
    if (lessonMap[ch.lesson]) {
      lessonMap[ch.lesson].challenges.push(ch);
    }
  });

  const unitMap = {};
  units.forEach(u => {
    unitMap[u._id] = { ...u, lessons: [] };
  });
  Object.values(lessonMap).forEach(l => {
    if (unitMap[l.unit]) {
      unitMap[l.unit].lessons.push(l);
    }
  });

  const tree = Object.values(unitMap);
  res.json(ApiResponse.success({ course, tree }, 'Course tree fetched'));
};

// ── Bulk Reordering ────────────────────────────────────────────────────────────

const reorderUnits = async (req, res) => {
  const { courseId } = req.params;
  const { unitIds } = req.body;

  if (!Array.isArray(unitIds)) {
    throw new AppError('unitIds must be an array', 400);
  }

  const bulkOps = unitIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, course: courseId },
      update: { $set: { order: index } }
    }
  }));

  if (bulkOps.length > 0) {
    await Unit.bulkWrite(bulkOps);
  }

  res.json(ApiResponse.success(null, 'Units reordered'));
};

const reorderLessons = async (req, res) => {
  const { unitId } = req.params;
  const { lessonIds } = req.body;

  if (!Array.isArray(lessonIds)) {
    throw new AppError('lessonIds must be an array', 400);
  }

  const bulkOps = lessonIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, unit: unitId },
      update: { $set: { order: index } }
    }
  }));

  if (bulkOps.length > 0) {
    await Lesson.bulkWrite(bulkOps);
  }

  res.json(ApiResponse.success(null, 'Lessons reordered'));
};

const reorderChallenges = async (req, res) => {
  const { lessonId } = req.params;
  const { challengeIds } = req.body;

  if (!Array.isArray(challengeIds)) {
    throw new AppError('challengeIds must be an array', 400);
  }

  const bulkOps = challengeIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, lesson: lessonId },
      update: { $set: { order: index } }
    }
  }));

  if (bulkOps.length > 0) {
    await Challenge.bulkWrite(bulkOps);
  }

  res.json(ApiResponse.success(null, 'Challenges reordered'));
};

// ── Daily Challenges ─────────────────────────────────────────────────────────

const getDailyChallenges = async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = {};
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = startDate;
    if (endDate) filter.date.$lte = endDate;
  }
  const challenges = await DailyChallenge.find(filter)
    .populate({
      path: 'lesson',
      select: 'title order unit',
      populate: {
        path: 'unit',
        select: 'title course',
        populate: {
          path: 'course',
          select: 'title'
        }
      }
    })
    .sort({ date: 1 })
    .lean();

  res.json(ApiResponse.success(challenges, 'Daily challenges fetched'));
};

const saveDailyChallenge = async (req, res) => {
  const { date, lessonId, xpReward = 50, bonusMultiplier = 2 } = req.body;
  if (!date || !lessonId) {
    throw new AppError('Date and lessonId are required', 400);
  }

  const lessonObj = await Lesson.findById(lessonId);
  if (!lessonObj) {
    throw new AppError('Lesson not found', 404);
  }

  const challenge = await DailyChallenge.findOneAndUpdate(
    { date },
    {
      lesson: lessonId,
      xpReward: Number(xpReward),
      bonusMultiplier: Number(bonusMultiplier),
    },
    { upsert: true, new: true }
  ).populate({
    path: 'lesson',
    select: 'title order unit',
    populate: {
      path: 'unit',
      select: 'title course',
      populate: {
        path: 'course',
        select: 'title'
      }
    }
  });

  const { getDateKey } = require('../../shared/utils/dateKey');
  const todayKey = getDateKey(new Date());
  if (date === todayKey) {
    const dailyChallengeService = require('../quest/dailyChallenge.service');
    await dailyChallengeService.emitTodayChallengeSnapshot();
  }

  res.json(ApiResponse.success(challenge, 'Daily challenge saved successfully'));
};

const deleteDailyChallenge = async (req, res) => {
  const { date } = req.params;
  const challenge = await DailyChallenge.findOneAndDelete({ date });
  if (!challenge) {
    throw new AppError('Daily challenge not found for this date', 404);
  }

  const { getDateKey } = require('../../shared/utils/dateKey');
  const todayKey = getDateKey(new Date());
  if (date === todayKey) {
    const dailyChallengeService = require('../quest/dailyChallenge.service');
    await dailyChallengeService.emitTodayChallengeSnapshot();
  }

  res.json(ApiResponse.success(null, 'Daily challenge deleted successfully'));
};

const saveAiLessonWithChallenges = async (req, res, next) => {
  const { unitId } = req.params;
  const { lesson: lessonInput, challenges: challengesInput } = req.body;

  // 1. Basic validation
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(unitId)) {
    throw new AppError('Mã Chương học (unitId) không hợp lệ.', 400);
  }

  const unit = await Unit.findById(unitId);
  if (!unit) {
    throw new AppError('Chương học không tồn tại.', 404);
  }

  if (!lessonInput || !lessonInput.title || !lessonInput.title.trim()) {
    throw new AppError('Thiếu tiêu đề bài học.', 400);
  }

  if (!Array.isArray(challengesInput) || challengesInput.length === 0) {
    throw new AppError('Mảng câu hỏi không được để trống.', 400);
  }

  // 2. Validate & Clean challenges input
  const validChallenges = [];
  for (const ch of challengesInput) {
    if (!ch || !ch.type || !ch.question) continue;

    const type = String(ch.type).trim().toUpperCase();
    if (!['ASSIST', 'TRANSLATE', 'FILL', 'ORDER'].includes(type)) continue;

    const question = String(ch.question).trim().slice(0, 500);
    const correctAnswer = ch.correctAnswer ? String(ch.correctAnswer).trim().slice(0, 500) : '';

    if (!question) continue;

    if (type === 'ASSIST' || type === 'FILL') {
      if (!Array.isArray(ch.options) || ch.options.length < 2 || ch.options.length > 6) continue;

      const cleanedOptions = ch.options.map(opt => ({
        text: opt && opt.text ? String(opt.text).trim().slice(0, 200) : '',
        correct: opt ? !!opt.correct : false
      })).filter(opt => opt.text.length > 0);

      if (cleanedOptions.length < 2) continue;

      const correctOpts = cleanedOptions.filter(opt => opt.correct === true);
      if (correctOpts.length !== 1) continue;

      const payload = {
        type,
        question,
        correctAnswer: correctOpts[0].text,
        options: cleanedOptions
      };

      if (type === 'FILL') {
        const sentence = ch.sentence ? String(ch.sentence).trim().slice(0, 500) : '';
        if (!sentence) continue;
        payload.sentence = sentence;
      }
      validChallenges.push(payload);

    } else if (type === 'TRANSLATE') {
      if (!correctAnswer) continue;
      const rawSource = String(ch.sourceLang || '').trim().toLowerCase();
      const rawTarget = String(ch.targetLang || '').trim().toLowerCase();
      const sourceLang = ['en', 'vi'].includes(rawSource) ? rawSource : 'vi';
      const targetLang = ['en', 'vi'].includes(rawTarget) ? rawTarget : 'en';

      validChallenges.push({
        type,
        question,
        correctAnswer,
        sourceLang,
        targetLang
      });

    } else if (type === 'ORDER') {
      if (!Array.isArray(ch.wordBank) || ch.wordBank.length === 0) continue;
      const cleanedWordBank = ch.wordBank.map(w => w ? String(w).trim().slice(0, 100) : '').filter(Boolean);
      const n = cleanedWordBank.length;
      if (n === 0) continue;

      if (!Array.isArray(ch.correctOrder) || ch.correctOrder.length !== n) continue;
      const isPermutation = ch.correctOrder.every(idx => Number.isInteger(idx) && idx >= 0 && idx < n) && new Set(ch.correctOrder).size === n;
      if (!isPermutation) continue;

      const derivedAnswer = ch.correctOrder.map(idx => cleanedWordBank[idx]).join(' ');

      validChallenges.push({
        type,
        question,
        wordBank: cleanedWordBank,
        correctOrder: ch.correctOrder,
        correctAnswer: derivedAnswer.slice(0, 500)
      });
    }
  }

  if (validChallenges.length === 0) {
    throw new AppError('Không tìm thấy câu hỏi/bài tập hợp lệ nào sau khi kiểm tra.', 422);
  }

  // 3. Compute dynamic order (max + 1)
  const lastLesson = await Lesson.findOne({ unit: unitId }).sort({ order: -1 }).select('order');
  const nextOrder = lastLesson ? lastLesson.order + 1 : 1;
  const shouldLockLesson = typeof lessonInput.isLocked === 'boolean' ? lessonInput.isLocked : false;

  // 4. Save with Rollback Mechanism
  let createdLesson = null;
  const createdChallengeIds = [];

  try {
    // Create Lesson
    createdLesson = await Lesson.create({
      unit: unitId,
      title: lessonInput.title.trim().slice(0, 200),
      subtitle: lessonInput.subtitle ? lessonInput.subtitle.trim().slice(0, 300) : '',
      grammarFocus: Array.isArray(lessonInput.grammarFocus) ? lessonInput.grammarFocus.map(g => String(g).trim().slice(0, 100)).filter(Boolean) : [],
      vocabFocus: Array.isArray(lessonInput.vocabFocus) ? lessonInput.vocabFocus.map(v => String(v).trim().slice(0, 100)).filter(Boolean) : [],
      xpReward: parseInt(lessonInput.xpReward, 10) || 10,
      estimatedMinutes: parseInt(lessonInput.estimatedMinutes, 10) || 5,
      type: lessonInput.type === 'practice' ? 'practice' : 'challenge',
      isLocked: shouldLockLesson,
      order: nextOrder
    });

    // Create Challenges and Options
    for (let i = 0; i < validChallenges.length; i++) {
      const ch = validChallenges[i];
      const challengeDoc = await Challenge.create({
        lesson: createdLesson._id,
        type: ch.type,
        question: ch.question,
        correctAnswer: ch.correctAnswer,
        sourceLang: ch.sourceLang,
        targetLang: ch.targetLang,
        wordBank: ch.wordBank,
        correctOrder: ch.correctOrder,
        sentence: ch.sentence,
        order: i
      });

      createdChallengeIds.push(challengeDoc._id);

      // Create ChallengeOptions if applicable
      if (ch.options && Array.isArray(ch.options) && ch.options.length > 0) {
        const optionDocs = ch.options.map(opt => ({
          challenge: challengeDoc._id,
          text: opt.text,
          correct: opt.correct
        }));
        await ChallengeOption.insertMany(optionDocs);
      }
    }

    res.status(201).json(ApiResponse.success(createdLesson, 'Tạo bài học bằng AI thành công.'));
  } catch (err) {
    console.error('[AI Save Rollback] Error detected, restoring state...', err);
    // Cleanup if anything fails mid-way
    try {
      if (createdChallengeIds.length > 0) {
        await ChallengeOption.deleteMany({ challenge: { $in: createdChallengeIds } });
        await Challenge.deleteMany({ _id: { $in: createdChallengeIds } });
      }
      if (createdLesson) {
        await Lesson.findByIdAndDelete(createdLesson._id);
      }
    } catch (cleanupErr) {
      console.error('[AI Save Rollback Failure] Critical: Cleanup failed:', cleanupErr);
    }
    
    throw new AppError(err.message || 'Lưu bài học thất bại. Tiến trình đã được khôi phục.', 500);
  }
};

module.exports = {
  getCourses, getCourse, createCourse, updateCourse, deleteCourse,
  getUnits, getUnit, createUnit, updateUnit, deleteUnit,
  getLessons, getLesson, createLesson, updateLesson, deleteLesson,
  getChallenges, getChallenge, createChallenge, updateChallenge, deleteChallenge,
  getChallengeOptions, createChallengeOption, updateChallengeOption, deleteChallengeOption,
  getCourseTree, reorderUnits, reorderLessons, reorderChallenges,
  getDailyChallenges, saveDailyChallenge, deleteDailyChallenge,
  saveAiLessonWithChallenges,
};
