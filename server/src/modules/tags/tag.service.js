const Tag = require('../../models/tag.model');
const FlashcardSet = require('../../models/flashcardSet.model');
const { AppError } = require('../../shared/errors/AppError');

const getAll = async (userId, folderId = null) => {
  return Tag.find({ user: userId, folder: folderId || null }).sort({ name: 1 }).lean();
};

// Get tags that are used in public flashcard sets
const getPublicTags = async () => {
  // Find all public sets and extract their tags
  const publicSets = await FlashcardSet.find({ isPublic: true })
    .select('tags')
    .populate('tags', 'name color')
    .lean();

  // Collect all tags from public sets
  const tagMap = new Map();
  publicSets.forEach(set => {
    if (set.tags && set.tags.length > 0) {
      set.tags.forEach(tag => {
        if (tag && !tagMap.has(tag._id.toString())) {
          tagMap.set(tag._id.toString(), {
            _id: tag._id,
            name: tag.name,
            color: tag.color || '#6366f1'
          });
        }
      });
    }
  });

  // Return sorted unique tags
  return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const getById = async (tagId, userId) => {
  const tag = await Tag.findOne({ _id: tagId, user: userId }).lean();
  if (!tag) throw new AppError('Tag not found', 404);
  return tag;
};

const create = async (userId, { name, color, folderId }) => {
  const existing = await Tag.findOne({ user: userId, name: name.trim(), folder: folderId || null });
  if (existing) throw new AppError('Tag already exists', 409);

  return Tag.create({ user: userId, name: name.trim(), color: color || '#6366f1', folder: folderId || null });
};

const update = async (tagId, userId, { name, color }) => {
  const tag = await Tag.findOne({ _id: tagId, user: userId });
  if (!tag) throw new AppError('Tag not found', 404);

  if (name !== undefined) tag.name = name.trim();
  if (color !== undefined) tag.color = color;

  return tag.save();
};

const remove = async (tagId, userId) => {
  const tag = await Tag.findOneAndDelete({ _id: tagId, user: userId });
  if (!tag) throw new AppError('Tag not found', 404);
  return tag;
};

const search = async (userId, query, folderId = null) => {
  return Tag.find({
    user: userId,
    folder: folderId || null,
    name: { $regex: query, $options: 'i' },
  })
    .sort({ name: 1 })
    .limit(20)
    .lean();
};

const getOrCreate = async (userId, tagName) => {
  const normalized = tagName.trim().toLowerCase();
  let tag = await Tag.findOne({ user: userId, name: { $regex: `^${normalized}$`, $options: 'i' } });
  if (!tag) {
    tag = await Tag.create({ user: userId, name: tagName.trim() });
  }
  return tag;
};

const getOrCreateMany = async (userId, tagNames) => {
  const uniqueNames = [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))];
  const tags = await Promise.all(uniqueNames.map((name) => getOrCreate(userId, name)));
  return tags;
};

module.exports = { getAll, getPublicTags, getById, create, update, remove, search, getOrCreate, getOrCreateMany };
