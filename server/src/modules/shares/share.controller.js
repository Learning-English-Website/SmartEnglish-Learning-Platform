const { ApiResponse } = require('../../shared/utils/apiResponse');
const shareService = require('./share.service');

/**
 * POST /api/shares - Create share link for a set
 */
const createShare = async (req, res) => {
  const { setId } = req.body;
  const share = await shareService.createShare(req.user._id, setId);
  res.status(201).json(ApiResponse.success(share, 'Share link created'));
};

/**
 * GET /api/shares - Get all shares by current user
 */
const getUserShares = async (req, res) => {
  const shares = await shareService.getUserShares(req.user._id);
  res.json(ApiResponse.success(shares, 'Shares fetched'));
};

/**
 * DELETE /api/shares/:id - Deactivate a share
 */
const deactivateShare = async (req, res) => {
  await shareService.deactivateShare(req.user._id, req.params.id);
  res.json(ApiResponse.success(null, 'Share deactivated'));
};

/**
 * GET /api/shares/shared/:shareCode - Get shared set by code (public)
 */
const getByShareCode = async (req, res) => {
  const share = await shareService.getByShareCode(req.params.shareCode);
  res.json(ApiResponse.success(share, 'Shared set fetched'));
};

module.exports = {
  createShare,
  getUserShares,
  deactivateShare,
  getByShareCode,
};
