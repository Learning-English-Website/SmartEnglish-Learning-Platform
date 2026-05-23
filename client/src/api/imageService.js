/**
 * imageService — Pexels image search
 * Free API: https://www.pexels.com/api/
 *
 * Add to client/.env:
 *   VITE_PEXELS_KEY=your_api_key_here
 *
 * Free tier: 200 requests/month (plenty for development)
 */

const PEXELS_KEY = import.meta.env.VITE_PEXELS_KEY ?? '';
const PEXELS_URL = 'https://api.pexels.com/v1/search';

// Export for use in other components
export { PEXELS_KEY };

/**
 * Common Vietnamese -> English translation map for image search
 */
const VI_TO_EN = {
  // Animals
  'con voi': 'elephant', 'voi': 'elephant',
  'con mèo': 'cat', 'mèo': 'cat',
  'con chó': 'dog', 'chó': 'dog',
  'con chim': 'bird', 'chim': 'bird',
  'con cá': 'fish', 'cá': 'fish',
  'con hổ': 'tiger', 'hổ': 'tiger',
  'con sư tử': 'lion', 'sư tử': 'lion',
  'con gấu': 'bear', 'gấu': 'bear',
  'con khỉ': 'monkey', 'khỉ': 'monkey',
  'con thỏ': 'rabbit', 'thỏ': 'rabbit',
  'con rắn': 'snake', 'rắn': 'snake',
  'con hươu': 'deer', 'hươu': 'deer',
  'con nai': 'deer', 'nai': 'deer',
  'con báo': 'leopard', 'báo': 'leopard',
  'con cáo': 'fox', 'cáo': 'fox',
  'con sói': 'wolf', 'sói': 'wolf',
  // Food
  'thức ăn': 'food', 'đồ ăn': 'food', 'bữa ăn': 'meal',
  'cơm': 'rice', 'phở': 'pho noodles', 'bánh mì': 'bread',
  'bánh': 'cake', 'trái cây': 'fruit', 'quả': 'fruit',
  'táo': 'apple', 'cam': 'orange', 'chuối': 'banana',
  'nho': 'grape', 'dưa hấu': 'watermelon', 'xoài': 'mango',
  // Nature
  'cây': 'tree', 'hoa': 'flower', ' lá': 'leaf',
  'núi': 'mountain', 'sông': 'river', 'biển': 'ocean', 'biển': 'sea',
  'rừng': 'forest', 'bãi biển': 'beach', 'cây cối': 'nature',
  // Objects
  'nhà': 'house', 'ô tô': 'car', 'xe': 'vehicle',
  'sách': 'book', 'bút': 'pen', 'giấy': 'paper',
  // Places
  'thành phố': 'city', 'tp hcm': 'ho chi minh city', 'hà nội': 'hanoi',
  'việt nam': 'vietnam', 'đà nẵng': 'da nang',
  // Colors
  'đỏ': 'red', 'xanh': 'blue', 'vàng': 'yellow', 'trắng': 'white',
  'đen': 'black', 'tím': 'purple', 'cam': 'orange', 'hồng': 'pink',
  // People
  'người': 'person', 'nam': 'man', 'nữ': 'woman',
  'trẻ em': 'children', 'gia đình': 'family',
};

/**
 * Translate Vietnamese query to English for better search results.
 */
function translateToEnglish(query) {
  const lower = query.toLowerCase().trim();

  if (VI_TO_EN[lower]) return VI_TO_EN[lower];

  for (const [vi, en] of Object.entries(VI_TO_EN)) {
    if (lower.includes(vi)) return lower.replace(vi, en);
  }

  const words = lower.split(/\s+/);
  for (const word of words) {
    if (VI_TO_EN[word]) return VI_TO_EN[word];
  }

  return query;
}

/**
 * Fallback when no API key: use LoremFlickr which searches by keyword.
 * https://loremflickr.com - Free, searches actual images by keyword.
 */
function generatePlaceholders(query, count) {
  const encoded = encodeURIComponent(query);
  return Array.from({ length: count }, (_, i) => ({
    id:            i,
    previewUrl:    `https://loremflickr.com/200/150/${encoded}?lock=${i + 1000}`,
    webformatUrl:  `https://loremflickr.com/400/300/${encoded}?lock=${i + 2000}`,
    largeImageURL: `https://loremflickr.com/800/600/${encoded}?lock=${i + 3000}`,
    tags:          query,
    user:          'LoremFlickr',
  }));
}

/**
 * Search Pexels for images matching a query.
 * Automatically translates Vietnamese to English for better results.
 *
 * @param {string} query
 * @param {number} perPage  — number of results (max 20)
 * @returns {Promise<Array<{
 *   id: number,
 *   previewUrl: string,
 *   webformatUrl: string,
 *   largeImageURL: string,
 *   tags: string,
 *   user: string,
 * }>>}
 */
export async function searchImages(query, perPage = 12) {
  if (!query?.trim()) return [];

  // Translate Vietnamese to English for better search results
  const translatedQuery = translateToEnglish(query.trim());

  if (!PEXELS_KEY) {
    console.warn('[imageService] VITE_PEXELS_KEY not set. Using LoremFlickr placeholders.');
    return generatePlaceholders(translatedQuery, perPage);
  }

  const params = new URLSearchParams({
    query:       translatedQuery,
    per_page:    String(Math.min(perPage, 20)),
    orientation: 'all',
  });

  const resp = await fetch(`${PEXELS_URL}?${params}`, {
    headers: {
      Authorization: PEXELS_KEY,
    },
  });

  if (!resp.ok) {
    throw new Error(`Pexels API error: ${resp.status}`);
  }

  const data = await resp.json();
  return (data.photos ?? []).map((p) => ({
    id:            p.id,
    previewUrl:    p.src?.tiny || p.src?.small || p.src?.medium,
    webformatUrl:  p.src?.medium,
    largeImageURL: p.src?.large || p.src?.original,
    tags:          p.alt || translatedQuery,
    user:          p.photographer,
  }));
}
