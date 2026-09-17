/**
 * Escapes a single field according to RFC 4180 CSV specifications.
 * Quotes the field if it contains commas, double quotes, or newlines.
 * Double quotes inside the field are doubled (" -> "").
 *
 * @param {string|number|null|undefined} value
 * @returns {string}
 */
export function escapeCsvField(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serializes an array of flashcard objects to a UTF-8 BOM CSV string.
 * Stable headers: front,back,pronunciation,example,note
 *
 * @param {Array<Object>} cards
 * @returns {string}
 */
export function serializeCardsToCsv(cards = []) {
  const BOM = '\uFEFF';
  const headers = ['front', 'back', 'pronunciation', 'example', 'note'];
  const headerRow = headers.join(',');

  const rows = cards.map((card) => {
    return [
      escapeCsvField(card?.front || ''),
      escapeCsvField(card?.back || ''),
      escapeCsvField(card?.pronunciation || ''),
      escapeCsvField(card?.example || ''),
      escapeCsvField(card?.note || ''),
    ].join(',');
  });

  return BOM + [headerRow, ...rows].join('\r\n');
}

/**
 * Creates a safe filename for CSV download.
 *
 * @param {string} title
 * @returns {string}
 */
export function getSafeCsvFilename(title) {
  if (!title || typeof title !== 'string' || !title.trim()) {
    return 'flashcards.csv';
  }
  const sanitized = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80);
  return `${sanitized || 'flashcards'}.csv`;
}

/**
 * Triggers a browser download of flashcard CSV.
 *
 * @param {Array<Object>} cards
 * @param {string} setTitle
 */
export function exportCardsToCsv(cards = [], setTitle = '') {
  const csvContent = serializeCardsToCsv(cards);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = getSafeCsvFilename(setTitle);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
