const mongoose = require('mongoose');
const Folder = require('../../models/folder.model');
const FlashcardSet = require('../../models/flashcardSet.model');
const { AppError } = require('../../shared/errors/AppError');

const FAVORITE_FOLDER_NAME = 'Yêu thích';
const isFavoriteFolder = (folder) => folder.name?.trim().toLowerCase() === FAVORITE_FOLDER_NAME.toLowerCase();

const getAccessibleSet = async (setId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(setId)) {
    throw new AppError('Invalid flashcard set id', 400);
  }

  const set = await FlashcardSet.findById(setId);
  if (!set) throw new AppError('Flashcard set not found', 404);

  const isOwner = set.user.toString() === userId.toString();
  if (!set.isPublic && !isOwner) throw new AppError('Access denied', 403);

  return set;
};

const getAll = async (userId) => {
  const folders = await Folder.find({
    user: userId,
    name: { $ne: FAVORITE_FOLDER_NAME },
  }).sort({ name: 1 }).lean();

  // Normalize: rename parent → parentId for frontend compatibility
  return folders.map((f) => ({
    ...f,
    parentId: f.parent,
    sets: f.sets || [],
  }));
};

const getById = async (folderId, userId) => {
  const folder = await Folder.findOne({
    _id: folderId,
    user: userId,
    name: { $ne: FAVORITE_FOLDER_NAME },
  }).lean();
  if (!folder) throw new AppError('Folder not found', 404);
  return folder;
};

const create = async (userId, { name, parent, parentId }) => {
  if (name && name.trim().toLowerCase() === FAVORITE_FOLDER_NAME.toLowerCase()) {
    throw new AppError('Thư mục "Yêu thích" đã tồn tại mặc định.', 400);
  }

  const finalParent = parent || parentId;
  if (finalParent) {
    const parentFolder = await Folder.findOne({ _id: finalParent, user: userId });
    if (!parentFolder) throw new AppError('Parent folder not found', 404);
  }

  return Folder.create({ user: userId, name: name.trim(), parent: finalParent || null });
};

const update = async (folderId, userId, { name, parent, parentId }) => {
  const folder = await Folder.findOne({ _id: folderId, user: userId });
  if (!folder) throw new AppError('Folder not found', 404);

  if (isFavoriteFolder(folder)) {
    if (name && name.trim().toLowerCase() !== FAVORITE_FOLDER_NAME.toLowerCase()) {
      throw new AppError('Không thể đổi tên thư mục Yêu thích mặc định.', 400);
    }
  } else if (name && name.trim().toLowerCase() === FAVORITE_FOLDER_NAME.toLowerCase()) {
    throw new AppError('Không thể đặt tên thư mục trùng với thư mục "Yêu thích" mặc định.', 400);
  }

  if (name !== undefined) folder.name = name.trim();
  const finalParent = parent !== undefined ? parent : parentId;
  if (finalParent !== undefined) {
    if (finalParent === folderId) throw new AppError('Folder cannot be its own parent', 400);
    if (finalParent) {
      const parentFolder = await Folder.findOne({ _id: finalParent, user: userId });
      if (!parentFolder) throw new AppError('Parent folder not found', 404);
    }
    folder.parent = finalParent || null;
  }

  return folder.save();
};

const remove = async (folderId, userId) => {
  const folder = await Folder.findOne({ _id: folderId, user: userId });
  if (!folder) throw new AppError('Folder not found', 404);

  if (isFavoriteFolder(folder)) {
    throw new AppError('Không thể xóa thư mục Yêu thích mặc định.', 400);
  }

  await Folder.deleteOne({ _id: folderId, user: userId });

  // Move child folders to root (parent = null)
  await Folder.updateMany({ parent: folderId, user: userId }, { $set: { parent: null } });

  return folder;
};

const addSet = async (folderId, setId, userId) => {
  const folder = await Folder.findOne({ _id: folderId, user: userId });
  if (!folder) throw new AppError('Folder not found', 404);

  if (isFavoriteFolder(folder)) throw new AppError('Folder not found', 404);

  await getAccessibleSet(setId, userId);

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

  if (isFavoriteFolder(folder)) throw new AppError('Folder not found', 404);

  if (folder.sets) {
    folder.sets = folder.sets.filter((id) => id.toString() !== setId);
    await folder.save();
  }

  return folder;
};

const getByParent = async (userId, parentId = null) => {
  return Folder.find({
    user: userId,
    parent: parentId,
    name: { $ne: FAVORITE_FOLDER_NAME },
  }).sort({ name: 1 }).lean();
};

const getSets = async (folderId, userId) => {
  const folder = await Folder.findOne({
    _id: folderId,
    user: userId,
    name: { $ne: FAVORITE_FOLDER_NAME },
  }).lean();
  if (!folder) throw new AppError('Folder not found', 404);

  if (!folder.sets || folder.sets.length === 0) {
    return { ...folder, sets: [] };
  }

  const sets = await FlashcardSet.find({ _id: { $in: folder.sets } })
    .populate('user', 'username avatar')
    .populate('tags', 'name color')
    .lean();
  return { ...folder, sets };
};

module.exports = { getAll, getById, create, update, remove, addSet, removeSet, getByParent, getSets };
