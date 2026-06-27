/**
 * Learning Content API Integration Tests (UC11 - UC20)
 */

const request = require('supertest');
const app = require('../src/app');
const { generateAccessToken } = require('../src/shared/utils/jwt');

jest.mock('../src/shared/events/eventBus', () => ({
  emit: jest.fn(),
  on: jest.fn(),
}));

const User = require('../src/modules/user/user.model');
const FlashcardSet = require('../src/models/flashcardSet.model');
const Flashcard = require('../src/models/flashcard.model');
const Folder = require('../src/models/folder.model');
const Bookmark = require('../src/models/bookmark.model');
const Course = require('../src/models/course.model');
const Unit = require('../src/models/unit.model');
const Lesson = require('../src/models/lesson.model');
const Challenge = require('../src/models/challenge.model');
const ChallengeProgress = require('../src/models/challengeProgress.model');
const UserProgress = require('../src/models/userProgress.model');

describe('Learning Content API Integration Tests (UC11 - UC20)', () => {
  let owner;
  let viewer;
  let ownerToken;
  let viewerToken;
  let set;

  beforeEach(async () => {
    owner = await User.create({
      email: 'uc11-owner@example.com',
      username: 'uc11owner',
      password: 'hashed-password',
      role: 'student',
      isVerified: true,
    });

    viewer = await User.create({
      email: 'uc17-viewer@example.com',
      username: 'uc17viewer',
      password: 'hashed-password',
      role: 'student',
      isVerified: true,
    });

    ownerToken = generateAccessToken(owner);
    viewerToken = generateAccessToken(viewer);

    set = await FlashcardSet.create({
      user: owner._id,
      title: 'UC11-UC20 API Set',
      description: 'Seeded set for UC11-UC20 API tests',
      isPublic: false,
      cardCount: 2,
    });

    await Flashcard.create([
      { set: set._id, front: 'alpha', back: 'chữ alpha', order: 0 },
      { set: set._id, front: 'beta', back: 'chữ beta', order: 1 },
    ]);
  });

  describe('UC11 - Quản lý thẻ ghi nhớ', () => {
    it('TC-UC11-01: should add a new flashcard successfully', async () => {
      const res = await request(app)
        .post(`/api/flashcards/set/${set._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ front: 'automation', back: 'tự động hóa' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.front).toBe('automation');
      expect(res.body.data.back).toBe('tự động hóa');

      const dbSet = await FlashcardSet.findById(set._id);
      expect(dbSet.cardCount).toBe(3);
    });

    it('TC-UC11-02: should reject saving a flashcard when required fields are missing', async () => {
      const res = await request(app)
        .post(`/api/flashcards/set/${set._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ front: 'missing-back' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('front and back are required');

      const card = await Flashcard.findOne({ set: set._id, front: 'missing-back' });
      expect(card).toBeNull();
    });
  });

  describe('UC12 - Sắp xếp thứ tự thẻ', () => {
    it('TC-UC12-01: should reorder cards successfully', async () => {
      const cards = await Flashcard.find({ set: set._id }).sort({ order: 1 });
      const reversedIds = cards.map((card) => card._id.toString()).reverse();

      const res = await request(app)
        .put(`/api/flashcards/set/${set._id}/reorder`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ cardIds: reversedIds });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const reordered = await Flashcard.find({ set: set._id }).sort({ order: 1 });
      expect(reordered.map((card) => card._id.toString())).toEqual(reversedIds);
    });
  });

  describe('UC13 - Tạo thư mục', () => {
    it('TC-UC13-01: should create a new root folder successfully', async () => {
      const res = await request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'UC13 Root Folder' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('UC13 Root Folder');
      expect(res.body.data.parent).toBeNull();
    });

    it('TC-UC13-03: should reject folder creation when name is invalid', async () => {
      const res = await request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Yêu thích' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Yêu thích');
    });
  });

  describe('UC15 - Quản lý học phần trong thư mục', () => {
    it('TC-UC15-01: should add a flashcard set to a folder successfully', async () => {
      const folder = await Folder.create({
        user: owner._id,
        name: 'UC15 Folder',
        sets: [],
      });

      const res = await request(app)
        .post(`/api/folders/${folder._id}/sets`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ setId: set._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbFolder = await Folder.findById(folder._id);
      expect(dbFolder.sets.map((id) => id.toString())).toContain(set._id.toString());
    });
  });

  describe('UC17 - Chia sẻ học phần công khai', () => {
    it('TC-UC17-01: should make a set public and create a shareable link', async () => {
      const updateRes = await request(app)
        .put(`/api/flashcard-sets/${set._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ isPublic: true });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.isPublic).toBe(true);

      const shareRes = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ setId: set._id.toString() });

      expect(shareRes.status).toBe(201);
      expect(shareRes.body.success).toBe(true);
      expect(shareRes.body.data.shareCode).toBeTruthy();
    });

    it('TC-UC17-03: should save a public set into the viewer saved list', async () => {
      await FlashcardSet.updateOne({ _id: set._id }, { $set: { isPublic: true } });

      const res = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ setId: set._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const bookmark = await Bookmark.findOne({ user: viewer._id, set: set._id });
      expect(bookmark).toBeTruthy();

      const bookmarksRes = await request(app)
        .get('/api/bookmarks')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(bookmarksRes.status).toBe(200);
      expect(bookmarksRes.body.data.map((favorite) => favorite.set._id.toString()))
        .toContain(set._id.toString());

      const favoriteFolder = await Folder.findOne({ user: viewer._id, name: 'Yêu thích' });
      expect(favoriteFolder).toBeNull();
    });
  });

  describe('UC19 - Học theo lộ trình bài học', () => {
    let course;
    let unit;
    let lesson;
    let challenge;

    beforeEach(async () => {
      course = await Course.create({
        slug: 'uc19-course',
        title: 'UC19 Course',
        isPublished: true,
        isActive: true,
      });

      unit = await Unit.create({
        course: course._id,
        title: 'UC19 Unit',
        order: 1,
      });

      lesson = await Lesson.create({
        unit: unit._id,
        title: 'UC19 Lesson',
        type: 'challenge',
        isLocked: false,
        isCompleted: false,
        order: 1,
      });

      challenge = await Challenge.create({
        lesson: lesson._id,
        type: 'SELECT',
        question: 'What does "Hello" mean?',
        options: [
          { text: 'Xin chào', correct: true },
          { text: 'Tạm biệt', correct: false },
        ],
        order: 1,
      });

      await UserProgress.create({
        user: owner._id,
        activeCourse: course._id,
        hearts: 5,
        maxHearts: 5,
        points: 0,
        totalXP: 0,
      });
    });

    it('TC-UC19-01: should complete a roadmap lesson and award XP', async () => {
      const answerRes = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          challengeId: challenge._id.toString(),
          selectedOptionId: 'Xin chào',
        });

      expect(answerRes.status).toBe(200);
      expect(answerRes.body.success).toBe(true);
      expect(answerRes.body.data.isCorrect).toBe(true);
      expect(answerRes.body.data.pointsEarned).toBe(10);

      const completeRes = await request(app)
        .post(`/api/duolingo/lessons/${lesson._id}/complete`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send();

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.success).toBe(true);

      const progress = await UserProgress.findOne({ user: owner._id });
      expect(progress.points).toBeGreaterThanOrEqual(30);

      const cp = await ChallengeProgress.findOne({
        user: owner._id,
        challenge: challenge._id,
        completed: true,
      });
      expect(cp).toBeTruthy();
    });

    it('TC-UC19-03: should block lesson answer submission when the user has no hearts', async () => {
      await UserProgress.updateOne({ user: owner._id }, { $set: { hearts: 0 } });

      const res = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          challengeId: challenge._id.toString(),
          selectedOptionId: 'Tạm biệt',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('hết tim');

      const progress = await UserProgress.findOne({ user: owner._id });
      expect(progress.hearts).toBe(0);
    });
  });
});
