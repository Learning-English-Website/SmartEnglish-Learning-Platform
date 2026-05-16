const { ApiResponse } = require('../../shared/utils/apiResponse');
const folderService = require('./folder.service');

const getAll = async (req, res) => {
  const folders = await folderService.getAll(req.user._id);
  res.json(ApiResponse.success(folders));
};

const getById = async (req, res) => {
  const folder = await folderService.getById(req.params.id, req.user._id);
  res.json(ApiResponse.success(folder));
};

const getSets = async (req, res) => {
  const result = await folderService.getSets(req.params.id, req.user._id);
  res.json(ApiResponse.success(result));
};

const getSubfolders = async (req, res) => {
  const subfolders = await folderService.getByParent(req.user._id, req.params.id);
  res.json(ApiResponse.success(subfolders));
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

module.exports = { getAll, getById, getSets, getSubfolders, create, update, remove, addSet, removeSet };
