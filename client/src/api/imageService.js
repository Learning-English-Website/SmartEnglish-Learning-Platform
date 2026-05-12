/**
 * imageService — Pixabay image search
 * Free API: https://pixabay.com (get your free key at pixabay.com/api/docs/)
 *
 * Add to client/.env:
 *   VITE_PIXABAY_KEY=your_key_here
 *
 * Free tier: 200 requests/hour (plenty for development)
 */

const PIXABAY_KEY = import.meta.env.VITE_PIXABAY_KEY ?? '';
const PIXABAY_URL = 'https://pixabay.com/api/';

/**
 * Search Pixabay for images matching a query.
 *
 * @param {string} query
 * @param {number} perPage  — number of results (max 20 on free tier)
 * @returns {Promise<Array<{
 *   id: number,
 *   previewUrl: string,
 *   webformatUrl: string,   // medium quality ~640px
 *   largeImageURL: string,  // full size
 *   tags: string,
 *   user: string,
 * }>>}
 */
export async function searchImages(query, perPage = 12) {
  if (!query?.trim()) return [];

  if (!PIXABAY_KEY) {
    console.warn('[imageService] VITE_PIXABAY_KEY not set. Using placeholder images.');
    return generatePlaceholders(query, perPage);
  }

  const params = new URLSearchParams({
    key:         PIXABAY_KEY,
    q:           query.trim(),
    image_type:  'photo',
    safesearch:  'true',
    per_page:    String(Math.min(perPage, 20)),
    min_width:   '300',
  });

  const resp = await fetch(`${PIXABAY_URL}?${params}`);
  if (!resp.ok) throw new Error(`Pixabay API error: ${resp.status}`);

  const data = await resp.json();
  return (data.hits ?? []).map((h) => ({
    id:            h.id,
    previewUrl:    h.previewURL,
    webformatUrl:  h.webformatURL,
    largeImageURL: h.largeImageURL,
    tags:          h.tags,
    user:          h.user,
  }));
}

/**
 * Fallback when no API key: generate deterministic Unsplash placeholder URLs.
 * Each call returns different photos via Unsplash source URL.
 */
function generatePlaceholders(query, count) {
  const encoded = encodeURIComponent(query);
  return Array.from({ length: count }, (_, i) => ({
    id:            i,
    previewUrl:    `https://source.unsplash.com/200x150/?${encoded}&sig=${i}`,
    webformatUrl:  `https://source.unsplash.com/400x300/?${encoded}&sig=${i}`,
    largeImageURL: `https://source.unsplash.com/800x600/?${encoded}&sig=${i}`,
    tags:          query,
    user:          'Unsplash',
  }));
}
