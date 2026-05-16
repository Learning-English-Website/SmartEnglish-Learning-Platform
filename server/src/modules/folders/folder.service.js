const Folder = require('../../models/folder.model');
const { AppError } = require('../../shared/errors/AppError');

const getAll = async (userId) => {
  const folders = await Folder.find({ user: userId }).sort({ name: 1 }).lean();
  // Normalize: rename parent → parentId for frontend compatibility
  return folders.map((f) => ({
    ...f,
    parentId: f.parent,
    sets: f.sets || [],
  }));
};

const getById = async (folderId, userId) => {
  const folder = await Folder.findOne({ _id: folderId, user: userId }).lean();
  if (!folder) throw new AppError('Folder not found', 404);
  return folder;
};

const create = async (userId, { name, parent }) => {
  if (parent) {
    const parentFolder = await Folder.findOne({ _id: parent, user: userId });
    if (!parentFolder) throw new AppError('Parent folder not found', 404);
  }

  return Folder.create({ user: userId, name: name.trim(), parent: parent || null });
};

const update = async (folderId, userId, { name, parent }) => {
  const folder = await Folder.findOne({ _id: folderId, user: userId });
  if (!folder) throw new AppError('Folder not found', 404);

  if (name !== undefined) folder.name = name.trim();
  if (parent !== undefined) {
    if (parent === folderId) throw new AppError('Folder cannot be its own parent', 400);
    if (parent) {
      const parentFolder = await Folder.findOne({ _id: parent, user: userId });
      if (!parentFolder) throw new AppError('Parent folder not found', 404);
    }
    folder.parent = parent || null;
  }

  return folder.save();
};

const remove = async (folderId, userId) => {
  const folder = await Folder.findOneAndDelete({ _id: folderId, user: userId });
  if (!folder) throw new AppError('Folder not found', 404);

  // Move child folders to root (parent = null)
  await Folder.updateMany({ parent: folderId, user: userId }, { $set: { parent: null } });

  return folder;
};

const addSet = async (folderId, setId, userId) => {
  const folder = await Folder.findOne({ _id: folderId, user: userId });
  if (!folder) throw new AppError('Folder not found', 404);

  if (!folder.sets) folder.sets = [];
  if (!folder.sets.includes(setId)) {
    folder.sets.push(setId);
    await folder.save();
  }

  return folder;
};

const removeSet = async (folderId, setId, userId) => {
  const folder = await Folder.findOne({ _id: folderId, user: userId });
  if (!folder) throw new AppError('Folder not found', 404);

  if (folder.sets) {
    folder.sets = folder.sets.filter((id) => id.toString() !== setId);
    await folder.save();
  }

  return folder;
};

const getByParent = async (userId, parentId = null) => {
  return Folder.find({ user: userId, parent: parentId }).sort({ name: 1 }).lean();
};

const getSets = async (folderId, userId) => {
  const folder = await Folder.findOne({ _id: folderId, user: userId }).lean();
  if (!folder) throw new AppError('Folder not found', 404);

  if (!folder.sets || folder.sets.length === 0) {
    return { ...folder, sets: [] };
  }

  const FlashcardSet = require('../../models/flashcardSet.model');
  const sets = await FlashcardSet.find({ _id: { $in: folder.sets } })
    .populate('tags', 'name color')
    .lean();
  return { ...folder, sets };
};

module.exports = { getAll, getById, create, update, remove, addSet, removeSet, getByParent, getSets };
