const { ApiResponse } = require('../../shared/utils/apiResponse');
const folderService = require('./folder.service');

const getAll = async (req, res) => {
  const folders = await folderService.getAll(req.user._id);
  res.json(ApiResponse.success(folders));
};

const create = async (req, res) => {
  const folder = await folderService.create(req.user._id, req.body);
  res.status(201).json(ApiResponse.success(folder, 'Folder created'));
};

const update = async (req, res) => {
  const folder = await folderService.update(req.params.id, req.user._id, req.body);
  res.json(ApiResponse.success(folder, 'Folder updated'));
};

const remove = async (req, res) => {
  await folderService.remove(req.params.id, req.user._id);
  res.json(ApiResponse.success(null, 'Folder deleted'));
};

const addSet = async (req, res) => {
  const { setId } = req.body;
  if (!setId) {
    throw new (require('../../shared/errors/AppError'))('setId is required', 400);
  }
  const folder = await folderService.addSet(req.params.id, setId, req.user._id);
  res.json(ApiResponse.success(folder, 'Set added to folder'));
};

const removeSet = async (req, res) => {
  const folder = await folderService.removeSet(req.params.id, req.params.setId, req.user._id);
  res.json(ApiResponse.success(folder, 'Set removed from folder'));
};

module.exports = { getAll, create, update, remove, addSet, removeSet };
