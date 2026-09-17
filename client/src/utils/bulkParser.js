export const BULK_FORMATS = {
  TWO_FIELD: '2_field',       // front | back
  THREE_FIELD: '3_field',     // front | back | example
  FOUR_FIELD: '4_field',      // front | back | pronunciation | example
};

export const FORMAT_LABELS = {
  [BULK_FORMATS.TWO_FIELD]: '2 trường: Thuật ngữ | Định nghĩa',
  [BULK_FORMATS.THREE_FIELD]: '3 trường: Thuật ngữ | Định nghĩa | Ví dụ',
  [BULK_FORMATS.FOUR_FIELD]: '4 trường: Thuật ngữ | Định nghĩa | Phát âm (IPA) | Ví dụ',
};

/**
 * Parses raw text into flashcards based on the selected format.
 *
 * @param {string} rawText
 * @param {string} formatKey - one of BULK_FORMATS
 * @param {string} [separator='|']
 * @returns {{ cards: Array<Object>, invalidLines: number[], totalLines: number, error: string }}
 */
export function parseBulkText(rawText, formatKey = BULK_FORMATS.TWO_FIELD, separator = '|') {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return {
      cards: [],
      invalidLines: [],
      totalLines: 0,
      error: 'Chưa có dữ liệu nào để xử lý.',
    };
  }

  const rawLines = rawText.split(/\r?\n/);
  const cards = [];
  const invalidLines = [];
  let nonEmptyCount = 0;

  rawLines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmedLine = line.trim();

    // Skip completely empty lines without marking as invalid
    if (!trimmedLine) {
      return;
    }

    nonEmptyCount++;
    const parts = line.split(separator);

    if (parts.length < 2) {
      invalidLines.push(lineNum);
      return;
    }

    const front = parts[0].trim();
    if (!front) {
      invalidLines.push(lineNum);
      return;
    }

    if (formatKey === BULK_FORMATS.TWO_FIELD) {
      // 2 fields: everything after the first separator is the back
      const back = parts.slice(1).join(separator).trim();
      if (!back) {
        invalidLines.push(lineNum);
        return;
      }
      cards.push({ front, back });
    } else if (formatKey === BULK_FORMATS.THREE_FIELD) {
      // 3 fields: front | back | example
      const back = parts[1].trim();
      if (!back) {
        invalidLines.push(lineNum);
        return;
      }
      const example = parts.length > 2 ? parts.slice(2).join(separator).trim() : '';
      const card = { front, back };
      if (example) card.example = example;
      cards.push(card);
    } else if (formatKey === BULK_FORMATS.FOUR_FIELD) {
      // 4 fields: front | back | pronunciation | example
      const back = parts[1].trim();
      if (!back) {
        invalidLines.push(lineNum);
        return;
      }
      const pronunciation = parts.length > 2 ? parts[2].trim() : '';
      const example = parts.length > 3 ? parts.slice(3).join(separator).trim() : '';
      const card = { front, back };
      if (pronunciation) card.pronunciation = pronunciation;
      if (example) card.example = example;
      cards.push(card);
    } else {
      // Fallback: 2-field
      const back = parts.slice(1).join(separator).trim();
      if (!back) {
        invalidLines.push(lineNum);
        return;
      }
      cards.push({ front, back });
    }
  });

  let error = '';
  if (cards.length === 0) {
    error = 'Không phân tích được dòng nào hợp lệ. Vui lòng kiểm tra định dạng và dấu phân cách.';
  } else if (invalidLines.length > 0) {
    error = `Bỏ qua ${invalidLines.length} dòng không hợp lệ (dòng: ${invalidLines.join(', ')})`;
  }

  return {
    cards,
    invalidLines,
    totalLines: nonEmptyCount,
    error,
  };
}
