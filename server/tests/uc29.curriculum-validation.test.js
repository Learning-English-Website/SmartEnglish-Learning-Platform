/**
 * Curriculum API Integration Tests
 * Tests: Lesson creation validation (TC-UC29-03)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

jest.mock('../src/shared/events/eventBus', () => ({
  emit: jest.fn(),
  on: jest.fn(),
}));

jest.mock('../src/config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

const User = require('../src/modules/user/user.model');
const Lesson = require('../src/models/lesson.model');
const adminRoutes = require('../src/modules/admin/admin.routes');
const { errorHandler } = require('../src/middleware/error.middleware');

describe('Curriculum Lesson Creation Validation', () => {
  let app;
  let adminToken;
  let adminUser;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Setup routes
    app.use('/api/admin', adminRoutes);

    app.use(errorHandler);
  });

  beforeEach(async () => {
    adminUser = await User.create({
      email: 'curriculum_admin@example.com',
      username: 'curr_admin',
      password: await bcrypt.hash('TestPass123!', 10),
      isVerified: true,
      role: 'admin',
    });

    adminToken = jwt.sign(
      { sub: adminUser._id.toString(), role: adminUser.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  });

  // ─────────────────────────────────────────────────────────────────
  // TC-UC29-03: Lesson creation title validation
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/admin/lessons validation', () => {
    it('TC-UC29-03: should reject lesson creation with missing title with a 400 or 422 code', async () => {
      const unitId = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .post('/api/admin/lessons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          unit: unitId,
          // title is missing
          subtitle: 'No Title Lesson Subtitle',
          xpReward: 10,
        });

      // User constraint: must return 400 or 422, cannot return 500
      expect([400, 422]).toContain(res.status);
    });
  });
});
