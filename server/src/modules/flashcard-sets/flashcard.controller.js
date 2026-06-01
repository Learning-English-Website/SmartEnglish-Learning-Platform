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

// Helper: parse 1 dòng CSV (hỗ trợ quoted fields)
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && inQuotes && line[i + 1] === '"') {
      current += '"';
      i++;
    } else if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
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

  const { front, back, pronunciation, example, note, collocation, relatedWords, imageUrl } = req.body;
  if (!front || !back) throw new AppError('front and back are required', 400);

  // Chặn tài khoản thường vượt quá 30 từ
  if (req.user.premium !== 'premium') {
    const existingCount = await Flashcard.countDocuments({ set: setId });
    if (existingCount >= 30) {
      throw new AppError('Bộ thẻ học của tài khoản thường giới hạn tối đa 30 từ. Vui lòng nâng cấp Premium để thêm không giới hạn!', 400);
    }
  }

  const card = await Flashcard.create({
    set: setId,
    front: front.trim(),
    back: back.trim(),
    pronunciation: pronunciation || null,
    example: example || null,
    note: note || null,
    collocation: collocation || null,
    relatedWords: relatedWords || null,
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
      collocation: c.collocation || null,
      relatedWords: c.relatedWords || null,
      imageUrl: c.imageUrl || null,
    }));

  if (validCards.length === 0) throw new AppError('No valid cards provided', 400);

  // Chặn tài khoản thường vượt quá 30 từ khi thêm hàng loạt
  if (req.user.premium !== 'premium') {
    const existingCount = await Flashcard.countDocuments({ set: setId });
    if (existingCount + validCards.length > 30) {
      throw new AppError('Bộ thẻ học của tài khoản thường giới hạn tối đa 30 từ. Việc thêm số từ này sẽ vượt quá giới hạn. Vui lòng nâng cấp Premium!', 400);
    }
  }

  const created = await Flashcard.insertMany(validCards);
  await FlashcardSet.findByIdAndUpdate(setId, { $inc: { cardCount: created.length } });

  res.status(201).json(ApiResponse.success(created, `${created.length} cards created`));
};

// ── POST /api/flashcards/set/:setId/import-csv ─────────────────────────────
const importCsvCards = async (req, res) => {
  const { setId } = req.params;
  await requireOwner(setId, req.user._id);

  const { csvData } = req.body;
  if (!csvData) throw new AppError('csvData is required', 400);

  const lines = csvData.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new AppError('CSV must have headers and at least 1 data row', 400);

  // Detect columns từ header
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const colFront = headers.findIndex((h) => ['front', 'term', 'word', 'question'].includes(h));
  const colBack  = headers.findIndex((h) => ['back', 'definition', 'meaning', 'answer', 'translation'].includes(h));
  if (colFront === -1 || colBack === -1)
    throw new AppError('CSV must have "front" and "back" columns', 400);

  const colPron    = headers.findIndex((h) => ['pronunciation', 'pronounce', 'ipa'].includes(h));
  const colEx      = headers.findIndex((h) => ['example', 'sentence', 'usage'].includes(h));
  const colNote    = headers.findIndex((h) => ['note', 'notes', 'hint'].includes(h));
  const colColloc  = headers.findIndex((h) => ['collocation', 'collocations'].includes(h));
  const colRelated = headers.findIndex((h) => ['relatedwords', 'relatedword', 'related', 'related_words'].includes(h));

  const validCards = lines
    .slice(1)
    .map((line) => {
      const cols = parseCsvLine(line);
      const front = cols[colFront]?.trim();
      const back  = cols[colBack]?.trim();
      if (!front || !back) return null;
      return {
        set: setId,
        front,
        back,
        pronunciation: colPron    !== -1 ? (cols[colPron]?.trim()    || null) : null,
        example:       colEx      !== -1 ? (cols[colEx]?.trim()      || null) : null,
        note:          colNote    !== -1 ? (cols[colNote]?.trim()     || null) : null,
        collocation:   colColloc  !== -1 ? (cols[colColloc]?.trim()  || null) : null,
        relatedWords:  colRelated !== -1 ? (cols[colRelated]?.trim() || null) : null,
      };
    })
    .filter(Boolean);

  if (validCards.length === 0) throw new AppError('No valid cards found in CSV', 400);

  // Chặn tài khoản thường vượt quá 30 từ khi nhập CSV
  if (req.user.premium !== 'premium') {
    const existingCount = await Flashcard.countDocuments({ set: setId });
    if (existingCount + validCards.length > 30) {
      throw new AppError('Bộ thẻ học của tài khoản thường giới hạn tối đa 30 từ. Nhập file CSV này sẽ vượt quá giới hạn. Vui lòng nâng cấp Premium!', 400);
    }
  }

  const created = await Flashcard.insertMany(validCards);
  await FlashcardSet.findByIdAndUpdate(setId, { $inc: { cardCount: created.length } });

  res.status(201).json(
    ApiResponse.success(
      { imported: created.length, cards: created },
      `${created.length} cards imported successfully`
    )
  );
};

// ── PUT /api/flashcards/:cardId ─────────────────────────────────────────────
const updateCard = async (req, res) => {
  // populate('set') chỉ để kiểm tra ownership, không dùng trong response
  const card = await Flashcard.findById(req.params.cardId).populate('set');
  if (!card) throw new AppError('Card not found', 404);
  if (card.set.user.toString() !== req.user._id.toString()) throw new AppError('Access denied', 403);

  const { front, back, pronunciation, example, note, collocation, relatedWords, imageUrl } = req.body;
  if (front !== undefined) card.front = front.trim();
  if (back !== undefined) card.back = back.trim();
  if (pronunciation !== undefined) card.pronunciation = pronunciation || null;
  if (example !== undefined) card.example = example || null;
  if (note !== undefined) card.note = note || null;
  if (collocation !== undefined) card.collocation = collocation || null;
  if (relatedWords !== undefined) card.relatedWords = relatedWords || null;
  if (imageUrl !== undefined) card.imageUrl = imageUrl || null;

  await card.save();

  // Re-fetch bằng .lean() để set trả về là string ID, không phải object
  const updatedCard = await Flashcard.findById(card._id).lean();
  res.json(ApiResponse.success(updatedCard, 'Card updated'));
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

module.exports = { getCardsBySet, createCard, bulkCreateCards, importCsvCards, updateCard, deleteCard, reorderCards };
