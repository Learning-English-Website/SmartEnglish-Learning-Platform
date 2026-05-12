const Flashcard = require('../../models/flashcard.model');
const FlashcardSet = require('../../models/flashcardSet.model');
const { ApiResponse } = require('../../shared/utils/apiResponse');
const { AppError } = require('../../shared/errors/AppError');

// Helper: verify set ownership
async function requireOwner(setId, userId) {
  const set = await FlashcardSet.findById(setId);
  if (!set) throw new AppError('Flashcard set not found', 404);
  if (set.user.toString() !== userId.toString()) throw new AppError('Access denied', 403);
  return set;
}

// ── GET /api/flashcards/set/:setId ─────────────────────────────────────────
const getCardsBySet = async (req, res) => {
  const { setId } = req.params;
  const set = await FlashcardSet.findById(setId);
  if (!set) throw new AppError('Set not found', 404);

  // Allow owner or public set viewers
  const isOwner = set.user.toString() === req.user._id.toString();
  if (!set.isPublic && !isOwner) throw new AppError('Access denied', 403);

  const cards = await Flashcard.find({ set: setId }).sort({ createdAt: 1 }).lean();
  res.json(ApiResponse.success(cards, 'Cards fetched'));
};

// ── POST /api/flashcards/set/:setId (single create) ────────────────────────
const createCard = async (req, res) => {
  const { setId } = req.params;
  const set = await requireOwner(setId, req.user._id);

  const { front, back, pronunciation, example, note, imageUrl } = req.body;
  if (!front || !back) throw new AppError('front and back are required', 400);

  const card = await Flashcard.create({
    set: setId,
    front: front.trim(),
    back: back.trim(),
    pronunciation: pronunciation || null,
    example: example || null,
    note: note || null,
    imageUrl: imageUrl || null,
  });

  // Update cardCount
  await FlashcardSet.findByIdAndUpdate(setId, { $inc: { cardCount: 1 } });

  res.status(201).json(ApiResponse.success(card, 'Card created'));
};

// ── POST /api/flashcards/set/:setId/bulk ───────────────────────────────────
const bulkCreateCards = async (req, res) => {
  const { setId } = req.params;
  const set = await requireOwner(setId, req.user._id);

  const { cards } = req.body;
  if (!Array.isArray(cards) || cards.length === 0) {
    throw new AppError('cards array is required', 400);
  }

  const validCards = cards
    .filter((c) => c.front?.trim() && c.back?.trim())
    .map((c) => ({
      set: setId,
      front: c.front.trim(),
      back: c.back.trim(),
      pronunciation: c.pronunciation || null,
      example: c.example || null,
      note: c.note || null,
      imageUrl: c.imageUrl || null,
    }));

  if (validCards.length === 0) throw new AppError('No valid cards provided', 400);

  const created = await Flashcard.insertMany(validCards);
  await FlashcardSet.findByIdAndUpdate(setId, { $inc: { cardCount: created.length } });

  res.status(201).json(ApiResponse.success(created, `${created.length} cards created`));
};

// ── PUT /api/flashcards/:cardId ─────────────────────────────────────────────
const updateCard = async (req, res) => {
  const card = await Flashcard.findById(req.params.cardId).populate('set');
  if (!card) throw new AppError('Card not found', 404);
  if (card.set.user.toString() !== req.user._id.toString()) throw new AppError('Access denied', 403);

  const { front, back, pronunciation, example, note, imageUrl } = req.body;
  if (front !== undefined) card.front = front.trim();
  if (back !== undefined) card.back = back.trim();
  if (pronunciation !== undefined) card.pronunciation = pronunciation || null;
  if (example !== undefined) card.example = example || null;
  if (note !== undefined) card.note = note || null;
  if (imageUrl !== undefined) card.imageUrl = imageUrl || null;

  await card.save();
  res.json(ApiResponse.success(card, 'Card updated'));
};

// ── DELETE /api/flashcards/:cardId ──────────────────────────────────────────
const deleteCard = async (req, res) => {
  const card = await Flashcard.findById(req.params.cardId).populate('set');
  if (!card) throw new AppError('Card not found', 404);
  if (card.set.user.toString() !== req.user._id.toString()) throw new AppError('Access denied', 403);

  const setId = card.set._id;
  await card.deleteOne();
  await FlashcardSet.findByIdAndUpdate(setId, { $inc: { cardCount: -1 } });

  res.json(ApiResponse.success(null, 'Card deleted'));
};

// ── PUT /api/flashcards/set/:setId/reorder ──────────────────────────────────
const reorderCards = async (req, res) => {
  // Simple acknowledgement — full reorder requires order field; skip for now
  res.json(ApiResponse.success(null, 'Reorder acknowledged'));
};

module.exports = { getCardsBySet, createCard, bulkCreateCards, updateCard, deleteCard, reorderCards };
