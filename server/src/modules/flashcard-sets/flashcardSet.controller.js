const FlashcardSet = require('../../models/flashcardSet.model');
const Flashcard = require('../../models/flashcard.model');
const mongoose = require('mongoose');
const { ApiResponse } = require('../../shared/utils/apiResponse');
const { AppError } = require('../../shared/errors/AppError');

// ── GET /api/flashcard-sets/my ──────────────────────────────────────────────
const getMySets = async (req, res) => {
  const sets = await FlashcardSet.find({ user: req.user._id })
    .populate('user', 'username avatar')
    .populate('tags', 'name color')
    .sort({ updatedAt: -1 })
    .lean();

  // Return tag IDs for proper editing, plus tagObjects for display
  const normalized = sets.map((s) => ({
    ...s,
    tags: s.tags ? s.tags.map((t) => (typeof t === 'object' ? t._id : t)) : [],
    tagObjects: s.tags ? s.tags : [],
    language: s.language || 'English',
  }));

  res.json(ApiResponse.success(normalized, 'Sets fetched'));
};

// ── GET /api/flashcard-sets/public ─────────────────────────────────────────
const getPublicSets = async (req, res) => {
  const { search, tags, sort = 'newest', page = 1, limit = 20 } = req.query;

  const filter = { isPublic: true };
  // Exclude user's own sets from browse
  if (req.user && req.user._id) {
    filter.user = { $ne: req.user._id };
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Filter by tags (comma-separated tag IDs or names)
  if (tags) {
    const tagFilters = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagFilters.length > 0) {
      filter.tags = { $in: tagFilters };
    }
  }

  // Sort options
  let sortOption = { updatedAt: -1 }; // newest (default)
  if (sort === 'mostCards') {
    sortOption = { cardCount: -1 };
  } else if (sort === 'popular') {
    sortOption = { cardCount: -1, updatedAt: -1 }; // Fallback: most cards first, then newest
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [sets, total] = await Promise.all([
    FlashcardSet.find(filter)
      .populate('user', 'username avatar')
      .populate('tags', 'name color')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    FlashcardSet.countDocuments(filter),
  ]);

  const normalized = sets.map((s) => ({
    ...s,
    tags: s.tags ? s.tags.map((t) => (typeof t === 'object' ? t._id : t)) : [],
    tagObjects: s.tags ? s.tags : [],
    language: s.language || 'English',
  }));

  res.json(ApiResponse.paginated(normalized, { page: Number(page), limit: Number(limit), total }));
};

// ── GET /api/flashcard-sets/:id ─────────────────────────────────────────────
const getSetById = async (req, res) => {
  const set = await FlashcardSet.findById(req.params.id)
    .populate('user', 'username avatar')
    .populate('tags', 'name color')
    .lean();

  if (!set) throw new AppError('Flashcard set not found', 404);

  // Only owner or public sets can be viewed
  const isOwner = set.user._id.toString() === req.user._id.toString();
  if (!set.isPublic && !isOwner) throw new AppError('Access denied', 403);

  // Return tag IDs and tag objects for proper editing
  res.json(ApiResponse.success({
    ...set,
    tags: set.tags ? set.tags.map((t) => (typeof t === 'object' ? t._id : t)) : [],
    tagObjects: set.tags ? set.tags : [],
    language: set.language || 'English',
  }));
};

// ── POST /api/flashcard-sets ────────────────────────────────────────────────
const createSet = async (req, res) => {
  const { title, description, language, isPublic, tags } = req.body;

  if (!title || title.trim().length < 3) {
    throw new AppError('Title must be at least 3 characters', 400);
  }

  // Handle tags - convert to ObjectIds
  let tagIds = [];
  if (Array.isArray(tags) && tags.length > 0) {
    tagIds = tags
      .filter(tag => tag && typeof tag === 'string')
      .filter(tag => mongoose.Types.ObjectId.isValid(tag))
      .map(tag => new mongoose.Types.ObjectId(tag));
  }

  const set = await FlashcardSet.create({
    user: req.user._id,
    title: title.trim(),
    description: (description || '').trim(),
    language: language || 'English',
    isPublic: !!isPublic,
    tags: tagIds,
    cardCount: 0,
  });

  res.status(201).json(ApiResponse.success(set, 'Flashcard set created'));
};

// ── PUT /api/flashcard-sets/:id ─────────────────────────────────────────────
const updateSet = async (req, res) => {
  const set = await FlashcardSet.findById(req.params.id);
  if (!set) throw new AppError('Flashcard set not found', 404);
  if (set.user.toString() !== req.user._id.toString()) throw new AppError('Access denied', 403);

  const { title, description, language, isPublic, tags } = req.body;

  if (title !== undefined) {
    if (!title || title.trim().length < 3) throw new AppError('Title must be at least 3 characters', 400);
    set.title = title.trim();
  }
  if (description !== undefined) set.description = description.trim();
  if (language !== undefined) set.language = language;
  if (isPublic !== undefined) set.isPublic = !!isPublic;

  // Handle tags update - ensure it's an array of valid ObjectIds
  if (tags !== undefined) {
    if (Array.isArray(tags)) {
      // Filter valid ObjectIds and convert to ObjectId
      const validTagIds = tags
        .filter(tag => tag && typeof tag === 'string')
        .filter(tag => mongoose.Types.ObjectId.isValid(tag))
        .map(tag => new mongoose.Types.ObjectId(tag));
      set.tags = validTagIds;
    } else {
      set.tags = [];
    }
  }

  await set.save();
  res.json(ApiResponse.success(set, 'Flashcard set updated'));
};

// ── DELETE /api/flashcard-sets/:id ──────────────────────────────────────────
const deleteSet = async (req, res) => {
  const set = await FlashcardSet.findById(req.params.id);
  if (!set) throw new AppError('Flashcard set not found', 404);
  if (set.user.toString() !== req.user._id.toString()) throw new AppError('Access denied', 403);

  // Delete all cards in this set too
  await Promise.all([
    Flashcard.deleteMany({ set: set._id }),
    set.deleteOne(),
  ]);

  res.json(ApiResponse.success(null, 'Flashcard set deleted'));
};

module.exports = { getMySets, getPublicSets, getSetById, createSet, updateSet, deleteSet };
