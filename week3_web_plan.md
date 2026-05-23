# 🌐 WEEK 3: WEB APP — Advanced Study Modes & Gamification (7 Ngày)

> **Tech Stack:** React + TypeScript + Vite + Tailwind CSS + React Query + React Router + Axios + Framer Motion
> **Architecture:** Clean Architecture (components/services/hooks/utils)
> **Mục tiêu:** Advanced Study Modes, Spaced Repetition, Progress Dashboard, Gamification, Performance Optimization

---

## 📆 NGÀY 1 — Advanced Study Modes (Learn & Test)

### Tasks
- [ ] **Tạo `src/services/studySessionService.ts`:**
  ```typescript
  export const studySessionService = {
    startSession: (setId: string, mode: StudyMode) =>
      api.post<StudySession>(`/study-sessions/start`, { setId, mode }),
    submitAnswer: (sessionId: string, cardId: string, isCorrect: boolean, responseTime?: number) =>
      api.post(`/study-sessions/${sessionId}/answer`, { cardId, isCorrect, responseTime }),
    completeSession: (sessionId: string) =>
      api.post<StudyResult>(`/study-sessions/${sessionId}/complete`),
    getSessionHistory: (setId?: string) =>
      api.get<StudySession[]>(`/study-sessions/history`, { params: { setId } }),
  };
  ```

- [ ] **Cập nhật `src/pages/StudyPage.tsx`:**
  - Thêm mode selector (Flashcards / Learn / Test / Match / Blast)
  - Mode icon badge trên top bar
  - Smooth transition giữa các mode

- [ ] **Tạo `src/components/study/LearnMode.tsx`:**
  - Spaced repetition card ordering
  - Confidence buttons: "Again" (0), "Hard" (1), "Good" (2), "Easy" (3)
  - Show answer after thinking time (configurable 5-30s)
  - Progress: cards remaining + mastery level

- [ ] **Tạo `src/components/study/TestMode.tsx`:**
  - Multiple choice (4 options)
  - Type the answer
  - True/False format
  - Timed mode option (10s/question)
  - Immediate feedback with explanation

- [ ] **Tạo `src/components/study/MatchMode.tsx`:**
  - Grid layout: terms on left, definitions on right
  - Drag & drop matching
  - Timer: time limit per pair
  - Score based on speed + accuracy
  - Celebration animation on match

  verify: Tất cả 4 study modes hoạt động, smooth transitions

### ✅ Deliverable
Tất cả 4 study modes hoạt động. User có thể chọn mode phù hợp với nhu cầu học tập.

---

## 📆 NGÀY 2 — Spaced Repetition System (SM-2 Algorithm)

### Tasks
- [x] **Tạo `src/hooks/useSpacedRepetition.ts`:**
  ```typescript
  interface CardSchedule {
    cardId: string;
    easeFactor: number;      // 1.3 - 2.0 (tối ưu cho người ham học)
    interval: number;        // days
    repetitions: number;     // 0, 1, 2, ...
    nextReview: Date;
    lastReview: Date;
  }

  export function useSpacedRepetition() {
    // SM-2 Algorithm implementation
    const calculateNextReview = (card: CardSchedule, quality: 0|1|2|3) => {
      // quality: 0=again, 1=hard, 2=good, 3=easy
      // Returns new CardSchedule
    };
  }
  ```

- [x] **Tạo `src/services/progressService.ts`:**
  ```typescript
  export const progressService = {
    getCardProgress: (cardId: string) =>
      api.get<CardProgress>(`/progress/cards/${cardId}`),
    updateCardProgress: (cardId: string, quality: number) =>
      api.put<CardProgress>(`/progress/cards/${cardId}`, { quality }),
    getSetProgress: (setId: string) =>
      api.get<SetProgress>(`/progress/sets/${setId}`),
    getOverallStats: () =>
      api.get<UserStats>(`/progress/stats`),
  };
  ```

- [x] **Cập nhật Backend `studySession.service.js`:**
  - SM-2 algorithm implementation
  - Store card schedules in database
  - Calculate next review dates

- [x] **Cập nhật `StudySetLearn.jsx` với Quizlet UI:**
  - Quizlet-style progress bar với các cụm 6 card
  - Chế độ trắc nghiệm (multiple choice)
  - Chế độ tự luận (type answer)
  - Âm thanh "ting" khi trả lời đúng
  - Nút shuffle, nút âm thanh, nút settings
  - Top bar navigation như Quizlet
  - Tổng số card trên progress bar nhân 2 (MC + TA)

- [x] **Tối ưu SM-2 cho "người ham học":**
  - Giảm Ease Factor từ 2.5 xuống 2.0
  - Giảm interval lần 2 đúng từ 6 ngày xuống 2 ngày
  - Card sai → review lại ngay trong ngày (interval = 0)

- [ ] **Tạo `src/components/progress/LearningProgress.tsx`:**
  - Mastery level indicator (1-5 stars)
  - Cards due today count
  - Review forecast calendar
  - Streak counter

- [ ] **Tạo `src/components/progress/HeatmapCalendar.tsx`:**
  - GitHub-style contribution heatmap
  - Study activity by day
  - Intensity based on cards studied

- [ ] **Tạo `src/pages/ProgressDashboard.tsx`:**
  - Weekly/monthly stats
  - Cards mastered vs learning vs new
  - Time spent studying
  - Accuracy rate chart

- [x] **Verify:** SM-2 algorithm hoạt động, cards scheduled correctly

### ✅ Deliverable
Spaced repetition system hoạt động. Progress tracking đầy đủ. Quizlet-style Learn page với 2 chế độ học (trắc nghiệm + tự luận).

---

## 📖 SM-2 ALGORITHM — Chi tiết kỹ thuật (Dành cho Developer)

### Tổng quan
SM-2 (SuperMemo 2) là thuật toán **Spaced Repetition** (Lặp lại có khoảng cách) được tạo bởi Piotr Wozniak năm 1987. Ý tưởng cốt lõi: **Não người học hiệu quả khi được nhắc lại KIẾN THỨC NGAY TRƯỚC KHI QUÊN**.

### Các tham số trong hệ thống

| Tham số | Giá trị cũ | Giá trị mới | Ý nghĩa |
|---------|-----------|-------------|---------|
| MIN_EASE_FACTOR | 1.3 | 1.3 | Hệ số dễ tối thiểu |
| MAX_EASE_FACTOR | 2.5 | **2.0** | Hệ số dễ tối đa (giảm để tăng chậm hơn) |
| INITIAL_EASE_FACTOR | 2.5 | **2.0** | Hệ số dễ ban đầu |
| Lần 2 đúng interval | 6 ngày | **2 ngày** | Khoảng cách sau lần đúng thứ 2 |

### Quality Rating (Chất lượng trả lời)

| Quality | Tên | Ý nghĩa | Xử lý |
|---------|-----|---------|--------|
| 0 | **Again** | Quên hoàn toàn | Reset repetitions, ôn lại ngay |
| 1 | **Hard** | Nhớ nhưng khó | Reset repetitions, ôn lại ngay |
| 2 | **Good** | Nhớ được | Tăng repetitions, ôn sau 1-2 ngày |
| 3 | **Easy** | Nhớ rõ ràng | Tăng repetitions, tăng EF |

### Thuật toán chi tiết (pseudocode)

```javascript
function calculateSM2(currentSchedule, quality) {
  // Khởi tạo với giá trị hiện tại hoặc mặc định
  let { easeFactor = 2.0, interval = 0, repetitions = 0, lapses = 0 } = currentSchedule;

  if (quality < 2) {
    // === TRẢ LỜI SAI ===
    repetitions = 0;          // Reset số lần đúng liên tiếp
    interval = 0;             // Ôn lại NGAY TRONG NGÀY
    lapses += 1;             // Tăng số lần quên
    easeFactor = max(1.3, easeFactor - 0.2);  // Giảm EF, card khó hơn
    nextReview = now();      // Ôn lại ngay lập tức
  } 
  else {
    // === TRẢ LỜI ĐÚNG ===
    if (repetitions === 0) {
      interval = 1;          // Lần đầu đúng: 1 ngày
    } 
    else if (repetitions === 1) {
      interval = 2;          // Lần 2 đúng: 2 ngày (thay vì 6)
    } 
    else {
      // Từ lần 3+: dùng (EF - 0.5) thay vì EF
      // Ví dụ: EF = 2.0 → multiplier = 1.5 → tăng chậm hơn
      const effectiveEF = easeFactor - 0.5;
      interval = round(interval * effectiveEF);
    }

    repetitions += 1;        // Tăng số lần đúng liên tiếp

    // Điều chỉnh ease factor dựa trên quality
    const efChange = 0.1 - (5 - sm2Quality) * (0.08 + (5 - sm2Quality) * 0.02);
    easeFactor = clamp(MIN_EASE_FACTOR, MAX_EASE_FACTOR, easeFactor + efChange);

    // Tính ngày ôn tiếp theo
    nextReview = now() + interval days;
  }

  return { easeFactor, interval, repetitions, lapses, nextReview, lastReview: now };
}
```

### Bảng so sánh Interval (Sau khi tối ưu)

| repetitions | SM-2 Chuẩn | SM-2 "Ham Học" | Chênh lệch |
|------------|-------------|----------------|-----------|
| 0 (mới) | 1 ngày | 1 ngày | 0 |
| 1 | 6 ngày | **2 ngày** | -4 ngày |
| 2 | 15 ngày | **3 ngày** | -12 ngày |
| 3 | 37 ngày | **5 ngày** | -32 ngày |
| 4 | 90 ngày | **8 ngày** | -82 ngày |

### Flow dữ liệu

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT (React)                                            │
│  User click "Good" (quality = 2)                          │
│                          ↓                                 │
│  PUT /api/progress/cards/:cardId { quality: 2 }           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  SERVER (Node.js)                                          │
│  progress.service.js → calculateSM2(schedule, 2)          │
│                                                             │
│  repetitions: 1 → 2                                        │
│  interval: 1 → 2 (vì repetitions = 1)                    │
│  nextReview: today + 2 days                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  DATABASE (MongoDB)                                        │
│  Collection: cardprogresses                                 │
│  Document:                                                 │
│  {                                                         │
│    card: ObjectId,                                         │
│    easeFactor: 2.0,                                       │
│    interval: 2,                                            │
│    repetitions: 2,                                         │
│    nextReview: ISODate("2026-05-20"),                     │
│    lastReview: ISODate("2026-05-18"),                     │
│    lapses: 0,                                             │
│    totalReviews: 3,                                       │
│    correctReviews: 2,                                      │
│    accuracy: 67                                           │
│  }                                                         │
└─────────────────────────────────────────────────────────────┘
```

### Lấy cards để học (Query Cards Due)

```javascript
// Lấy cards cần học HÔM NAY:
db.cardprogresses.find({
    user: userId,
    nextReview: { $lte: new Date() }  // Đến hạn hoặc quá hạn
})

// Ưu tiên:
// 1. Cards mới (repetitions = 0) - chưa học bao giờ
// 2. Cards quá hạn nặng (lapses cao)
// 3. Cards đến hạn bình thường
```

### Xóa data để test lại

```javascript
// Kết nối MongoDB Atlas qua mongosh:
// mongosh "mongodb+srv://<credentials>@ac-xxxx.mongodb.net/memoris"

// Xóa tất cả progress:
db.cardprogresses.deleteMany({})

// Result: { acknowledged: true, deletedCount: 4 }
```

### Các app sử dụng SM-2

| App | Đặc điểm |
|-----|----------|
| Anki | Tùy chỉnh cao, SM-2 + FSRS |
| Quizlet | Learn mode, tốc độ nhanh |
| SuperMemo | Gốc của SM-2 |
| Duolingo | Biến thể SM-2 |
| SmartEnglish | SM-2 tối ưu cho người Việt |

---

## 📆 NGÀY 3 — Gamification System

### Tasks
- [ ] **Tạo `src/services/gamificationService.ts`:**
  ```typescript
  export const gamificationService = {
    getUserXP: () => api.get<UserXP>('/gamification/xp'),
    getAchievements: () => api.get<Achievement[]>('/gamification/achievements'),
    claimAchievement: (achievementId: string) =>
      api.post(`/gamification/achievements/${achievementId}/claim`),
    getLeaderboard: (type: 'weekly' | 'monthly' | 'all') =>
      api.get<UserRank[]>(`/gamification/leaderboard`, { params: { type } }),
  };
  ```

- [ ] **Tạo `src/components/gamification/XPProgress.tsx`:**
  - Current level display
  - XP progress bar
  - XP needed for next level
  - Level milestones (25, 50, 100, etc.)

- [ ] **Tạo `src/components/gamification/AchievementCard.tsx`:**
  - Badge icon (locked/unlocked)
  - Progress toward achievement
  - Claim reward button
  - Achievement details modal

- [ ] **Tạo `src/components/gamification/AchievementList.tsx`:**
  - Categories: Streaks, Mastery, Social, Milestones
  - Filter by category
  - Sort by progress/unlocked date

- [ ] **Tạo `src/components/gamification/StreakCounter.tsx`:**
  - Current streak display
  - Flame animation for active streak
  - Streak freeze count
  - Streak milestone celebrations

- [ ] **Tạo `src/components/gamification/Leaderboard.tsx`:**
  - Weekly/Monthly/All-time tabs
  - Top 3 highlighted with medals
  - User's rank indicator
  - Points breakdown

- [ ] **Implement XP rewards:**
  ```typescript
  const XP_REWARDS = {
    completeSet: 50,
    perfectScore: 100,
    dailyStreak: 25,
    firstPlaceLeaderboard: 500,
    masteryLevelUp: 200,
  };
  ```

- [ ] **Verify:** XP system hoạt động, achievements unlock correctly

### ✅ Deliverable
Gamification system hoàn chỉnh. XP, achievements, leaderboard hoạt động.

---

## 📆 NGÀY 4 — Audio & Media Support

### Tasks
- [ ] **Tạo `src/services/mediaService.ts`:**
  ```typescript
  export const mediaService = {
    uploadAudio: async (file: File) => {
      const formData = new FormData();
      formData.append('audio', file);
      return api.post<MediaAsset>('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    uploadImage: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      return api.post<MediaAsset>('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    getAudioUrl: (mediaId: string) =>
      api.get<{ url: string }>(`/media/${mediaId}/url`),
  };
  ```
- [ ] **Tạo `src/components/media/AudioPlayer.tsx`:**
  - Play/pause button
  - Progress bar
  - Speed control (0.5x, 1x, 1.5x, 2x)
  - Volume control
  - Auto-play option

- [ ] **Cập nhật `src/components/flashcard/CardEditor.tsx`:**
  - Add audio recorder
  - Audio preview player
  - Image upload with preview

- [ ] **Tạo `src/components/media/ImageUploader.tsx`:**
  - Drag & drop zone
  - Image preview
  - Crop/resize option
  - Alt text input for accessibility

- [ ] **Cập nhật Backend:**
  - Multer configuration for audio/image uploads
  - Media storage (local/cloud)
  - CDN serving

- [ ] **Cập nhật FlashcardViewer:**
  - Auto-play audio on card flip (optional)
  - Image display on cards
  - Pronunciation audio button

- [ ] **Verify:** Audio record/upload/playback hoạt động

### ✅ Deliverable
Media support hoàn chỉnh. Audio recording, image upload, playback hoạt động.

---

## 📆 NGÀY 5 — Performance & UX Polish

### Tasks
- [ ] **Code Splitting & Lazy Loading:**
  ```typescript
  const StudyPage = lazy(() => import('./pages/StudyPage'));
  const BrowsePage = lazy(() => import('./pages/BrowsePage'));
  const ProgressDashboard = lazy(() => import('./pages/ProgressDashboard'));
  ```

- [ ] **Optimize Images:**
  - WebP format conversion
  - Lazy loading with Intersection Observer
  - Blur placeholder (LQIP)
  - Responsive image sizes

- [ ] **Cache Optimization:**
  ```typescript
  // React Query cache config
  const cacheConfig = {
    staleTime: 5 * 60 * 1000,  // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  };
  ```

- [ ] **Virtual Scrolling cho large card lists:**
  - React Window integration
  - Smooth scroll performance

- [ ] **UX Polish:**
  - Micro-interactions với Framer Motion
  - Haptic feedback patterns
  - Skeleton loading states
  - Empty states design
  - Error boundaries

- [ ] **Accessibility Audit:**
  - Keyboard navigation với focus management
  - Screen reader testing
  - Color contrast check
  - Reduced motion support

- [ ] **PWA Support:**
  - Service worker setup
  - Offline mode for studying
  - App manifest
  - Install prompt

- [ ] **Verify:** Lighthouse score > 90, smooth performance

### ✅ Deliverable
Performance optimized. UX polished. PWA ready.

---

## 📆 NGÀY 6 — Collaboration Features

### Tasks
- [ ] **Tạo `src/services/collaborationService.ts`:**
  ```typescript
  export const collaborationService = {
    createStudyGroup: (name: string) =>
      api.post<StudyGroup>('/groups', { name }),
    joinGroup: (inviteCode: string) =>
      api.post(`/groups/join`, { inviteCode }),
    getGroupMembers: (groupId: string) =>
      api.get<GroupMember[]>(`/groups/${groupId}/members`),
    studyTogether: (groupId: string, setId: string) =>
      api.post(`/groups/${groupId}/study`, { setId }),
  };
  ```

- [ ] **Tạo `src/components/collaboration/StudyGroupCard.tsx`:**
  - Group name + avatar
  - Member count
  - Study streak
  - Join/Create button

- [ ] **Tạo `src/components/collaboration/LiveStudySession.tsx`:**
  - Real-time progress sync (Socket.io)
  - See teammates' progress
  - Shared timer
  - Celebration animations

- [ ] **Tạo `src/pages/GroupsPage.tsx`:**
  - My groups list
  - Create new group
  - Join with invite code
  - Group settings

- [ ] **Tạo `src/components/collaboration/InviteModal.tsx`:**
  - Generate invite link
  - Copy to clipboard
  - QR code generation
  - Expiry settings

- [ ] **Cập nhật Backend:**
  - WebSocket setup for real-time
  - Group CRUD APIs
  - Invite system

- [ ] **Verify:** Study groups hoạt động, real-time sync

### ✅ Deliverable
Collaboration features hoàn chỉnh. Study groups + live sessions hoạt động.

---

## 📆 NGÀY 7 — Integration Testing & Polish

### Tasks
- [ ] **Cập nhật E2E tests:**
  ```javascript
  // e2e/tests/study-modes.spec.js
  test.describe('Study Modes', () => {
    test('Learn mode schedules cards correctly', async () => {});
    test('Test mode shows results', async () => {});
    test('Match mode calculates score', async () => {});
    test('Blast mode tracks streaks', async () => {});
  });
  ```

- [ ] **Performance Testing:**
  - Lighthouse CI
  - Bundle size monitoring
  - Load time testing

- [ ] **Cross-browser Testing:**
  - Chrome, Firefox, Safari, Edge
  - Mobile browsers

- [ ] **Bug Fixes & Polish:**
  - Fix any outstanding bugs
  - UI refinements
  - Animation smoothness

- [ ] **Documentation:**
  - Update README
  - API documentation
  - User guide

- [ ] **Sprint Review:**
  - Demo all new features
  - Collect feedback
  - Plan for next sprint

- [ ] **Final Checklist:**
  - [ ] All 5 study modes working
  - [ ] Spaced repetition optimized
  - [ ] Gamification complete
  - [ ] Audio/media working
  - [ ] Performance > 90 Lighthouse
  - [ ] PWA installable
  - [ ] Collaboration ready
  - [ ] E2E tests passing
  - [ ] Documentation complete

### ✅ Deliverable
Week 3 hoàn chỉnh. App sẵn sàng production. Mọi features hoạt động tốt.

---

## 📋 Week 3 Web Checklist

| # | Checkpoint | Status |
|---|---|---|
| 1 | Advanced Study Modes (Learn, Test, Match, Blast) | ⬜ |
| 2 | Spaced Repetition (SM-2 Algorithm) | ⬜ |
| 3 | Progress Dashboard | ⬜ |
| 4 | XP & Level System | ⬜ |
| 5 | Achievements System | ⬜ |
| 6 | Leaderboard | ⬜ |
| 7 | Streak Counter | ⬜ |
| 8 | Audio Recording & Playback | ⬜ |
| 9 | Image Upload | ⬜ |
| 10 | Code Splitting & Lazy Loading | ⬜ |
| 11 | Virtual Scrolling | ⬜ |
| 12 | PWA Support | ⬜ |
| 13 | Accessibility Audit | ⬜ |
| 14 | Study Groups | ⬜ |
| 15 | Real-time Collaboration | ⬜ |
| 16 | Invite System | ⬜ |
| 17 | E2E Tests Updated | ⬜ |
| 18 | Performance Optimization | ⬜ |
| 19 | Documentation | ⬜ |

---

## ✅ Week 3 Deliverables

### Advanced Study Features
- 5 Study Modes: Flashcards, Learn, Test, Match, Blast
- SM-2 Spaced Repetition Algorithm
- Progress Dashboard với stats
- Heatmap calendar
- Learning forecast

### Gamification
- XP System (earn & spend)
- Level progression (1-100)
- 20+ Achievements
- Weekly/Monthly Leaderboard
- Streak tracking với freezes

### Media Support
- Audio recording & playback
- Pronunciation audio
- Image upload
- CDN optimization

### Collaboration
- Study Groups
- Real-time progress sync
- Invite system với QR code

### Performance
- Lazy loading & code splitting
- Virtual scrolling
- PWA (installable)
- Lighthouse > 90

---

## 🔗 API Endpoints Cần Dùng (Tuần 3)

```
# Study Sessions (Enhanced)
POST   /api/study-sessions/start          → { sessionId, mode, cards }
POST   /api/study-sessions/:id/answer     → { isCorrect, nextCard }
POST   /api/study-sessions/:id/complete    → StudyResult + XP

# Progress & Spaced Repetition
GET    /api/progress/cards/:cardId        → CardProgress
PUT    /api/progress/cards/:cardId        → CardProgress (SM-2 update)
GET    /api/progress/sets/:setId         → SetProgress
GET    /api/progress/stats               → UserStats

# Gamification
GET    /api/gamification/xp              → UserXP
GET    /api/gamification/achievements    → Achievement[]
POST   /api/gamification/achievements/:id/claim → Achievement
GET    /api/gamification/leaderboard     → UserRank[]

# Media
POST   /api/media/upload                  → MediaAsset
GET    /api/media/:id/url                → { url }

# Collaboration
POST   /api/groups                       → StudyGroup
POST   /api/groups/join                  → StudyGroup
GET    /api/groups/:id                   → StudyGroup
GET    /api/groups/:id/members           → GroupMember[]
POST   /api/groups/:id/study             → LiveSession
```

---

## 🎯 Bonus Features (Nếu có thời gian)

- AI-powered card generation từ text
- Smart suggestions (similar words, usage)
- Custom study plans
- Export stats to PDF
- Dark mode support
- Multiple languages UI
