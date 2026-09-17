/**
 * Media API Integration Tests (MEMORIS-UX-TASK-003)
 * Tests: Cloudinary production upload, missing-config fail-closed,
 * failure fail-closed, dev local fallback, delete flows, and ImageUploader contract.
 */

const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const mediaRoutes = require('../src/modules/media/media.routes');
const cloudinaryConfig = require('../src/config/cloudinary.config');
const { UPLOAD_DIR } = require('../src/config/upload.config');

describe('Media API (MEMORIS-UX-TASK-003)', () => {
  let app;
  const originalEnv = process.env;
  const sampleImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  beforeAll(() => {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  });

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/media', mediaRoutes);

    // Global error handler
    app.use((err, req, res, next) => {
      const status = err.statusCode || err.status || 500;
      res.status(status).json({
        success: false,
        message: err.message || 'Internal Server Error',
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // 1. Configured Cloudinary success returns 201, secure_url, identifier and provider metadata
  test('1. configured Cloudinary success returns 201, secure_url, identifier and expected provider metadata', async () => {
    process.env.NODE_ENV = 'production';
    jest.spyOn(cloudinaryConfig, 'isCloudinaryConfigured').mockReturnValue(true);
    const mockCloudinaryResult = {
      url: 'https://res.cloudinary.com/test-cloud/image/upload/v12345/memoris/images/test_sample.png',
      publicId: 'memoris/images/test_sample',
      size: sampleImageBuffer.length,
      format: 'png',
    };
    const uploadSpy = jest.spyOn(cloudinaryConfig, 'uploadToCloudinary').mockResolvedValue(mockCloudinaryResult);

    const filesBefore = fs.readdirSync(UPLOAD_DIR);

    const res = await request(app)
      .post('/api/media/upload')
      .attach('image', sampleImageBuffer, 'test_sample.png');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.url).toBe(mockCloudinaryResult.url);
    expect(res.body.filename).toBe(mockCloudinaryResult.publicId);
    expect(res.body.provider).toBe('cloudinary');
    expect(res.body.size).toBe(mockCloudinaryResult.size);
    expect(uploadSpy).toHaveBeenCalledTimes(1);

    // Verify local disk was NOT touched
    const filesAfter = fs.readdirSync(UPLOAD_DIR);
    expect(filesAfter.length).toBe(filesBefore.length);
  });

  // 2. Production missing configuration does not write a local file and returns documented 5xx
  test('2. production missing configuration does not write a local file and returns documented 5xx (500)', async () => {
    process.env.NODE_ENV = 'production';
    jest.spyOn(cloudinaryConfig, 'isCloudinaryConfigured').mockReturnValue(false);

    const filesBefore = fs.readdirSync(UPLOAD_DIR);

    const res = await request(app)
      .post('/api/media/upload')
      .attach('image', sampleImageBuffer, 'prod_missing.png');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Production cloud storage is not configured');

    // Never write local file in production
    const filesAfter = fs.readdirSync(UPLOAD_DIR);
    expect(filesAfter.length).toBe(filesBefore.length);
  });

  // 3. Configured Cloudinary failure does not write a local file and returns documented retryable 5xx (502)
  test('3. configured Cloudinary failure does not write a local file and returns documented retryable 502', async () => {
    process.env.NODE_ENV = 'production';
    jest.spyOn(cloudinaryConfig, 'isCloudinaryConfigured').mockReturnValue(true);
    jest.spyOn(cloudinaryConfig, 'uploadToCloudinary').mockRejectedValue(new Error('Cloudinary stream connection timeout'));

    const filesBefore = fs.readdirSync(UPLOAD_DIR);

    const res = await request(app)
      .post('/api/media/upload')
      .attach('image', sampleImageBuffer, 'prod_fail.png');

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Cloud storage upload failed');
    expect(res.body.error).toContain('Cloudinary stream connection timeout');

    // Crucial check: Fail-closed, must NOT fall back to local disk
    const filesAfter = fs.readdirSync(UPLOAD_DIR);
    expect(filesAfter.length).toBe(filesBefore.length);
  });

  // 4. Development/test local fallback still works when Cloudinary is absent
  test('4. development/test local fallback still works when Cloudinary is absent', async () => {
    process.env.NODE_ENV = 'development';
    jest.spyOn(cloudinaryConfig, 'isCloudinaryConfigured').mockReturnValue(false);

    const res = await request(app)
      .post('/api/media/upload')
      .attach('image', sampleImageBuffer, 'dev_fallback.png');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.provider).toBe('local');
    expect(res.body.url).toMatch(/\/uploads\/images\/.+\.png$/);
    expect(typeof res.body.filename).toBe('string');

    // Local file was created
    const createdFilePath = path.join(UPLOAD_DIR, res.body.filename);
    expect(fs.existsSync(createdFilePath)).toBe(true);

    // Clean up created file
    fs.unlinkSync(createdFilePath);
  });

  // 5. Delete behavior for Cloudinary and local identifiers
  describe('5. delete behavior for Cloudinary and local identifiers', () => {
    test('Cloudinary identifier calls Cloudinary delete adapter', async () => {
      jest.spyOn(cloudinaryConfig, 'isCloudinaryConfigured').mockReturnValue(true);
      const deleteSpy = jest.spyOn(cloudinaryConfig, 'deleteFromCloudinary').mockResolvedValue({ result: 'ok' });

      const res = await request(app)
        .delete('/api/media/delete')
        .send({ filename: 'memoris/images/cloud_asset_123', provider: 'cloudinary' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(deleteSpy).toHaveBeenCalledWith('memoris/images/cloud_asset_123');
    });

    test('Local filename removes file from local disk', async () => {
      const localTestName = `test_delete_${Date.now()}.png`;
      const localTestPath = path.join(UPLOAD_DIR, localTestName);
      fs.writeFileSync(localTestPath, sampleImageBuffer);
      expect(fs.existsSync(localTestPath)).toBe(true);

      const res = await request(app)
        .delete('/api/media/delete')
        .send({ filename: localTestName, provider: 'local' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(fs.existsSync(localTestPath)).toBe(false);
    });
  });

  // 6. Multipart field 'image' and response shape remain compatible with ImageUploader
  describe('6. multipart field and response shape compatibility', () => {
    test('rejects request when no image file is provided or field is unexpected', async () => {
      process.env.NODE_ENV = 'development';
      jest.spyOn(cloudinaryConfig, 'isCloudinaryConfigured').mockReturnValue(false);

      // Case A: Missing file
      const resNoFile = await request(app)
        .post('/api/media/upload')
        .send({});

      expect(resNoFile.status).toBe(400);
      expect(resNoFile.body.success).toBe(false);
      expect(resNoFile.body.message).toBe('No image file provided');

      // Case B: Wrong field name
      const resWrongField = await request(app)
        .post('/api/media/upload')
        .attach('wrongField', sampleImageBuffer, 'wrong.png');

      expect(resWrongField.status).toBe(400);
      expect(resWrongField.body.success).toBe(false);
      expect(resWrongField.body.message).toBeTruthy();
    });

    test('valid multipart field image returns expected shape for ImageUploader', async () => {
      process.env.NODE_ENV = 'development';
      jest.spyOn(cloudinaryConfig, 'isCloudinaryConfigured').mockReturnValue(false);

      const res = await request(app)
        .post('/api/media/upload')
        .attach('image', sampleImageBuffer, 'compatible.png');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('url');
      expect(res.body).toHaveProperty('filename');
      expect(res.body).toHaveProperty('size');
      expect(res.body).toHaveProperty('provider');

      // Clean up local file
      const createdPath = path.join(UPLOAD_DIR, res.body.filename);
      if (fs.existsSync(createdPath)) {
        fs.unlinkSync(createdPath);
      }
    });
  });
});
