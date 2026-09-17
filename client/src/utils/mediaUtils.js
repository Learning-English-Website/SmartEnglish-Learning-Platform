/**
 * Resolves an image/media URL so it works seamlessly across both
 * local development and production (Vercel + Cloudinary / Render).
 *
 * @param {string} url - The raw image URL from database, API, or asset.
 * @returns {string} The safe, absolute or resolvable URL.
 */
export function getMediaUrl(url) {
  if (!url || typeof url !== 'string') return '';

  // Already an absolute URL, data URL, or blob URL
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }

  // Relative URL (e.g. /uploads/images/... or uploads/images/...)
  const envApiUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '';
  const nodeEnvUrl = (typeof globalThis !== 'undefined' && globalThis.process?.env?.VITE_API_URL) || '';
  const apiBase = envApiUrl || nodeEnvUrl || 'http://localhost:5000';
  const hostUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;

  return `${hostUrl}${cleanUrl}`;
}

export default getMediaUrl;
