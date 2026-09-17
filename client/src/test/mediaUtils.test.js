import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getMediaUrl } from '../utils/mediaUtils.js';

describe('Media Utilities - getMediaUrl', () => {
  test('returns empty string for falsy input', () => {
    assert.equal(getMediaUrl(null), '');
    assert.equal(getMediaUrl(undefined), '');
    assert.equal(getMediaUrl(''), '');
  });

  test('returns absolute HTTP/HTTPS URLs untouched (e.g. Cloudinary, Pexels, external)', () => {
    const cloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    const httpUrl = 'http://example.com/images/card.png';
    assert.equal(getMediaUrl(cloudinaryUrl), cloudinaryUrl);
    assert.equal(getMediaUrl(httpUrl), httpUrl);
  });

  test('returns data and blob URLs untouched', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const blobUrl = 'blob:http://localhost:5173/1234-5678';
    assert.equal(getMediaUrl(dataUrl), dataUrl);
    assert.equal(getMediaUrl(blobUrl), blobUrl);
  });

  test('resolves relative /uploads/ paths using API host', () => {
    const relativeUrl = '/uploads/images/test-image.jpg';
    const resolved = getMediaUrl(relativeUrl);
    assert.ok(resolved.endsWith('/uploads/images/test-image.jpg'));
    assert.ok(resolved.startsWith('http'));
  });
});
