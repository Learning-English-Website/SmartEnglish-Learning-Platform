const Course = require('../../models/course.model');
const Unit = require('../../models/unit.model');
const Lesson = require('../../models/lesson.model');
const Challenge = require('../../models/challenge.model');
const ChallengeOption = require('../../models/challengeOption.model');
const FlashcardSet = require('../../models/flashcardSet.model');
const Flashcard = require('../../models/flashcard.model');
const Folder = require('../../models/folder.model');
const User = require('../user/user.model');
const { ApiResponse } = require('../../shared/utils/apiResponse');
const { AppError } = require('../../shared/errors/AppError');

const adminOnly = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }
  next();
};

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
  const course = await Course.create(req.body);
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
  const unit = await Unit.create(req.body);
  await unit.populate('course', 'title');
  res.status(201).json(ApiResponse.success(unit, 'Unit created'));
};

const updateUnit = async (req, res) => {
  const unit = await Unit.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('course', 'title');
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
    const lessons = await Lesson.find(filter).populate('unit', 'title course').sort({ order: 1 });
    return res.json(ApiResponse.success(lessons, 'Lessons fetched'));
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [lessons, total] = await Promise.all([
    Lesson.find(filter)
      .populate('unit', 'title course')
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
    .populate('lesson', 'title unit')
    .populate('options');
  if (!challenge) throw new AppError('Challenge not found', 404);
  res.json(ApiResponse.success(challenge, 'Challenge fetched'));
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
  res.status(201).json(ApiResponse.success(challenge, 'Challenge created'));
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
  await challenge.populate('options');
  res.json(ApiResponse.success(challenge, 'Challenge updated'));
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

// ── Admin Stats ──────────────────────────────────────────────────────────────

const getStats = async (req, res) => {
  const [courses, units, lessons, challenges] = await Promise.all([
    Course.countDocuments(),
    Unit.countDocuments(),
    Lesson.countDocuments(),
    Challenge.countDocuments(),
  ]);

  res.json(ApiResponse.success({
    courses,
    units,
    lessons,
    challenges,
  }, 'Admin stats fetched'));
};

// ── Flashcard Sets ────────────────────────────────────────────────────────────

const getFlashcardSets = async (req, res) => {
  const { search, userId, page = 1, limit = 10 } = req.query;
  const filter = {};

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }
  if (userId) filter.user = userId;

  const skip = (Number(page) - 1) * Number(limit);
  const [sets, total] = await Promise.all([
    FlashcardSet.find(filter)
      .populate('user', 'username avatar email')
      .populate('tags', 'name color')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    FlashcardSet.countDocuments(filter),
  ]);

  res.json(ApiResponse.success({ sets, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }, 'Flashcard sets fetched'));
};

const getFlashcardSet = async (req, res) => {
  const set = await FlashcardSet.findById(req.params.id)
    .populate('user', 'username avatar email')
    .populate('tags', 'name color')
    .populate({
      path: 'cards',
      options: { sort: { order: 1 } },
    });
  if (!set) throw new AppError('Flashcard set not found', 404);
  res.json(ApiResponse.success(set, 'Flashcard set fetched'));
};

const deleteFlashcardSet = async (req, res) => {
  const set = await FlashcardSet.findByIdAndDelete(req.params.id);
  if (!set) throw new AppError('Flashcard set not found', 404);
  await Flashcard.deleteMany({ set: set._id });
  res.json(ApiResponse.success(null, 'Flashcard set and its cards deleted'));
};

// ── Folders ───────────────────────────────────────────────────────────────────

const getAllFolders = async (req, res) => {
  const { userId, search, page = 1, limit = 10 } = req.query;
  const filter = {};
  if (userId) filter.user = userId;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const skip = (Number(page) - 1) * Number(limit);
  const [folders, total] = await Promise.all([
    Folder.find(filter)
      .populate('user', 'username avatar email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Folder.countDocuments(filter),
  ]);

  res.json(ApiResponse.success({
    folders,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  }, 'Folders fetched'));
};

const getFolder = async (req, res) => {
  const folder = await Folder.findById(req.params.id)
    .populate('user', 'username avatar email')
    .populate({
      path: 'sets',
      populate: { path: 'user', select: 'username avatar' },
      options: { sort: { updatedAt: -1 } },
    });
  if (!folder) throw new AppError('Folder not found', 404);
  res.json(ApiResponse.success(folder, 'Folder fetched'));
};

const deleteFolder = async (req, res) => {
  const folder = await Folder.findByIdAndDelete(req.params.id);
  if (!folder) throw new AppError('Folder not found', 404);
  res.json(ApiResponse.success(null, 'Folder deleted'));
};

// ── Community Sets ────────────────────────────────────────────────────────────

const getCommunitySets = async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  const filter = { isPublic: true };

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [sets, total] = await Promise.all([
    FlashcardSet.find(filter)
      .populate('user', 'username avatar')
      .populate('tags', 'name color')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    FlashcardSet.countDocuments(filter),
  ]);

  res.json(ApiResponse.success({ sets, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }, 'Community sets fetched'));
};

const deleteCommunitySet = async (req, res) => {
  const set = await FlashcardSet.findByIdAndDelete(req.params.id);
  if (!set) throw new AppError('Set not found', 404);
  await Flashcard.deleteMany({ set: set._id });
  res.json(ApiResponse.success(null, 'Community set deleted'));
};

// ── Users ─────────────────────────────────────────────────────────────────────

const getUsers = async (req, res) => {
  const { search, role, page = 1, limit = 10 } = req.query;
  const filter = {};

  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (role) filter.role = role;

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json(ApiResponse.success({ users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }, 'Users fetched'));
};

const getUser = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password').lean();
  if (!user) throw new AppError('User not found', 404);
  res.json(ApiResponse.success(user, 'User fetched'));
};

const updateUser = async (req, res) => {
  const { username, avatar, premium } = req.body;
  const updates = {};
  if (username !== undefined) updates.username = username;
  if (avatar !== undefined) updates.avatar = avatar;
  if (premium !== undefined) updates.premium = premium;

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
  if (!user) throw new AppError('User not found', 404);
  res.json(ApiResponse.success(user, 'User updated'));
};

const updateUserRole = async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'student', 'teacher'].includes(role)) {
    throw new AppError('Invalid role', 400);
  }
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
  if (!user) throw new AppError('User not found', 404);
  res.json(ApiResponse.success(user, 'User role updated'));
};

const deleteUser = async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    throw new AppError('Cannot delete yourself', 400);
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  res.json(ApiResponse.success(null, 'User deleted'));
};

module.exports = {
  adminOnly,
  getCourses, getCourse, createCourse, updateCourse, deleteCourse,
  getUnits, getUnit, createUnit, updateUnit, deleteUnit,
  getLessons, getLesson, createLesson, updateLesson, deleteLesson,
  getChallenges, getChallenge, createChallenge, updateChallenge, deleteChallenge,
  getChallengeOptions, createChallengeOption, updateChallengeOption, deleteChallengeOption,
  getStats,
  getFlashcardSets, getFlashcardSet, deleteFlashcardSet,
  getAllFolders, getFolder, deleteFolder,
  getCommunitySets, deleteCommunitySet,
  getUsers, getUser, updateUser, updateUserRole, deleteUser,
};
