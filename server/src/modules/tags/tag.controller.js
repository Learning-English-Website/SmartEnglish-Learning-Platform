const { ApiResponse } = require('../../shared/utils/apiResponse');
const tagService = require('./tag.service');

const getAll = async (req, res) => {
  const tags = await tagService.getAll(req.user._id);
  res.json(ApiResponse.success(tags));
};

const search = async (req, res) => {
  const { q } = req.query;
  const tags = await tagService.search(req.user._id, q || '');
  res.json(ApiResponse.success(tags));
};

const create = async (req, res) => {
  const tag = await tagService.create(req.user._id, req.body);
  res.status(201).json(ApiResponse.success(tag, 'Tag created'));
};

const update = async (req, res) => {
  const tag = await tagService.update(req.params.id, req.user._id, req.body);
  res.json(ApiResponse.success(tag, 'Tag updated'));
};

const remove = async (req, res) => {
  await tagService.remove(req.params.id, req.user._id);
  res.json(ApiResponse.success(null, 'Tag deleted'));
};

// ── GET /api/tags/public ──────────────────────────────────────────────────
const getPublicTags = async (req, res) => {
  const tags = await tagService.getPublicTags();
  res.json(ApiResponse.success(tags));
};

module.exports = { getAll, search, create, update, remove, getPublicTags };
