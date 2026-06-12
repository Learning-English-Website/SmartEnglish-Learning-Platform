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
    .lean();
    
  if (!set) throw new AppError('Flashcard set not found', 404);
  
  const cards = await Flashcard.find({ set: set._id }).sort({ order: 1 }).lean();
  set.cards = cards;
  
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

  const [users, total, premiumUsers, verifiedUsers] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(filter),
    User.countDocuments({ ...filter, premium: 'premium' }),
    User.countDocuments({ ...filter, isVerified: true }),
  ]);

  res.json(ApiResponse.success({
    users,
    total,
    premiumUsers,
    verifiedUsers,
    page: Number(page),
    pages: Math.ceil(total / Number(limit))
  }, 'Users fetched'));
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
  if (!['admin', 'student', 'teacher', 'cskh'].includes(role)) {
    throw new AppError('Invalid role', 400);
  }

  const targetUser = await User.findById(req.params.id);
  if (!targetUser) throw new AppError('User not found', 404);

  // Chặn CSKH gán quyền admin cho người khác hoặc đổi vai trò của một admin hiện tại
  if (req.user.role === 'cskh') {
    if (role === 'admin') {
      throw new AppError('CSKH does not have permission to assign Admin role', 403);
    }
    if (targetUser.role === 'admin') {
      throw new AppError('CSKH cannot change the role of an Admin', 403);
    }
  }

  targetUser.role = role;
  await targetUser.save();

  res.json(ApiResponse.success(targetUser.toPublicProfile ? targetUser.toPublicProfile() : targetUser, 'User role updated'));
};

const updateUserPremium = async (req, res) => {
  const { premiumType, durationDays } = req.body;
  const userId = req.params.id;

  if (!['free', 'trial', 'premium'].includes(premiumType)) {
    throw new AppError('Invalid premium type', 400);
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  if (req.user.role === 'cskh' && user.role === 'admin') {
    throw new AppError('CSKH cannot modify Admin account status', 403);
  }

  user.premium = premiumType;
  await user.save();

  const UserProgress = require('../../models/userProgress.model');

  let isPro = false;
  let proActivatedAt = null;
  let proExpiresAt = null;
  let proMethod = null;

  if (premiumType === 'premium') {
    isPro = true;
    proActivatedAt = new Date();
    proMethod = 'manual';

    const days = typeof durationDays === 'number' ? durationDays : 30;
    if (days !== -1) {
      proExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    } else {
      proExpiresAt = null;
    }
  } else if (premiumType === 'trial') {
    isPro = true;
    proActivatedAt = new Date();
    proMethod = 'manual';
    proExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  } else {
    isPro = false;
    proActivatedAt = null;
    proExpiresAt = null;
    proMethod = null;
  }

  const progress = await UserProgress.findOneAndUpdate(
    { user: userId },
    { isPro, proActivatedAt, proExpiresAt, proMethod },
    { upsert: true, new: true }
  );

  res.json(ApiResponse.success({ user, progress }, 'User premium status updated successfully'));
};

const updateUserStatus = async (req, res) => {
  const { status } = req.body;
  const userId = req.params.id;

  if (!['active', 'locked'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  if (req.user.role === 'cskh' && user.role === 'admin') {
    throw new AppError('CSKH cannot modify Admin account status', 403);
  }

  if (user._id.toString() === req.user._id.toString() && status === 'locked') {
    throw new AppError('Cannot lock your own account', 400);
  }

  user.status = status;
  await user.save();

  res.json(ApiResponse.success(user.toPublicProfile ? user.toPublicProfile() : user, 'User status updated successfully'));
};

const deleteUser = async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    throw new AppError('Cannot delete yourself', 400);
  }
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  
  if (user.role === 'admin' && req.user.role !== 'admin') {
    throw new AppError('Only Admins can delete Admin accounts', 403);
  }

  await User.findByIdAndDelete(req.params.id);
  res.json(ApiResponse.success(null, 'User deleted'));
};

const getOrders = async (req, res) => {
  const Order = require('../../models/order.model');
  const { search, status, method, page = 1, limit = 10 } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (method) filter.method = method;

  if (search) {
    const matchedUsers = await User.find({
      $or: [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');

    const userIds = matchedUsers.map(u => u._id);

    filter.$or = [
      { orderId: { $regex: search, $options: 'i' } },
      { transId: { $regex: search, $options: 'i' } },
      { user: { $in: userIds } }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total, revenueResult] = await Promise.all([
    Order.find(filter)
      .populate('user', 'username email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Order.countDocuments(filter),
    Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

  res.json(ApiResponse.success({
    orders,
    total,
    totalRevenue,
    page: Number(page),
    pages: Math.ceil(total / Number(limit))
  }, 'Orders fetched successfully'));
};

const verifyOrderPayment = async (req, res) => {
  const { orderId } = req.params;
  const paymentService = require('../payment/payment.service');
  const result = await paymentService.verifyPayment(orderId);
  res.json(ApiResponse.success(result, 'Order payment verification completed'));
};

const updateOrderStatusManually = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const Order = require('../../models/order.model');

  if (!['pending', 'completed', 'failed', 'refunded'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  const order = await Order.findOne({ orderId }).populate('user');
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.status === status) {
    return res.json(ApiResponse.success(order, `Order is already ${status}`));
  }

  order.status = status;
  if (status === 'completed') {
    order.paidAt = new Date();
    if (!order.transId) {
      order.transId = 'MANUAL_' + Date.now();
    }
  }
  await order.save();

  if (status === 'completed') {
    const UserProgress = require('../../models/userProgress.model');
    await UserProgress.findOneAndUpdate(
      { user: order.user._id },
      {
        isPro: true,
        proActivatedAt: new Date(),
        proExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        proMethod: 'manual',
      },
      { upsert: true }
    );
    await User.findByIdAndUpdate(order.user._id, { premium: 'premium' });
  } else if (status === 'refunded' || status === 'failed') {
    const UserProgress = require('../../models/userProgress.model');
    await UserProgress.findOneAndUpdate(
      { user: order.user._id },
      {
        isPro: false,
        proActivatedAt: null,
        proExpiresAt: null,
        proMethod: null,
      }
    );
    await User.findByIdAndUpdate(order.user._id, { premium: 'free' });
  }

  res.json(ApiResponse.success(order, 'Order status updated manually'));
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
  getUsers, getUser, updateUser, updateUserRole, updateUserStatus, deleteUser,
  updateUserPremium, getOrders, verifyOrderPayment, updateOrderStatusManually,
  getCourseTree, reorderUnits, reorderLessons, reorderChallenges,
};
