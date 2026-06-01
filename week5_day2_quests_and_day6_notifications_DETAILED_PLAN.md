# Day 2 & Day 6 — Chi Tiết Implementation Plan

> Dựa trên: `week5_web_plan.md` + khám phá codebase `SmartEnglish-Learning-Platform` + source tham khảo `next14-duolingo-clone`

---

## PHẦN A — NGÀY 2: Hệ thống Quests + Daily Challenges

### A.1. Tổng quan chức năng

```
USER STORY:
Tôi là một học viên hàng ngày mở app lên. Tôi thấy:
- Banner "Daily Challenge" nổi bật với bài học hôm nay + phần thưởng 2x XP
- Panel "Daily Quests" với 5 nhiệm vụ, progress bar, nút Claim
- Mỗi khi hoàn thành bài học → quest progress tự động tăng
- Quest completed → nút Claim hiện ra → click → XP được cộng
- Hết ngày → quest reset, 5 quest mới được assign
```

---

### A.2. Database Models (Server)

#### A.2.1. File: `server/src/models/quest.model.js`

Mỗi dòng là **1 template nhiệm vụ**, dùng chung cho tất cả user.

| Field | Type | Mô tả |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `title` | String | Tên nhiệm vụ: "First Steps", "Quick Learner" |
| `description` | String | Mô tả ngắn: "Complete 1 lesson" |
| `type` | Enum | `'daily'` \| `'weekly'` \| `'achievement'` |
| `xpReward` | Number | XP thưởng khi hoàn thành |
| `icon` | String | Emoji icon: `'🎯'`, `'⚡'` |
| `target` | Number | Số lần cần đạt: 1, 3, 100 |
| `progressField` | String | Field name trong UserQuest để increment. Ví dụ: `'lessonsCompleted'`, `'perfectLessons'`, `'xpEarned'` |
| `expiresAt` | Date | Thời hạn nhiệm vụ (null = không hết hạn) |
| `isActive` | Boolean | Toggle nhiệm vụ có hiệu lực không |
| `order` | Number | Thứ tự hiển thị trong panel |
| `createdAt/updatedAt` | Date | Timestamps tự động |

**5 template quests mặc định (seed vào DB khi khởi tạo):**

```
1. First Steps     → target: 1,  xp: 20,  icon: '🎯',  progressField: 'lessonsCompleted'
2. Quick Learner   → target: 3,  xp: 50,  icon: '📚',  progressField: 'lessonsCompleted'
3. Perfect Score   → target: 1,  xp: 30,  icon: '💯',  progressField: 'perfectLessons'
4. XP Hunter       → target: 100,xp: 40,  icon: '⚡',  progressField: 'xpEarned'
5. Streak Keeper   → target: 1,  xp: 25,  icon: '🔥',  progressField: 'streakDays'
```

#### A.2.2. File: `server/src/models/userQuest.model.js`

Mỗi dòng là **1 nhiệm vụ đã được assign cho 1 user cụ thể trong 1 ngày**.

| Field | Type | Mô tả |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `user` | ObjectId (ref: User) | User sở hữu nhiệm vụ |
| `quest` | ObjectId (ref: Quest) | Template nhiệm vụ |
| `progress` | Number | Tiến độ hiện tại (default: 0) |
| `completed` | Boolean | true khi progress >= target (default: false) |
| `claimed` | Boolean | true khi user đã nhận thưởng (default: false) |
| `claimedAt` | Date | Thời điểm nhận thưởng |
| `date` | String | Format `YYYY-MM-DD`. Dùng để group quest theo ngày |
| `createdAt/updatedAt` | Date | Timestamps |

**Index:** `{ user: 1, quest: 1, date: 1 }` → unique. Đảm bảo mỗi user chỉ có 1 dòng cho 1 quest trong 1 ngày.

#### A.2.3. File: `server/src/models/dailyChallenge.model.js`

Mỗi dòng là **1 challenge đặc biệt cho ngày cụ thể**.

| Field | Type | Mô tả |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `date` | String | Format `YYYY-MM-DD`, **unique** |
| `lesson` | ObjectId (ref: Lesson) | Lesson được chọn làm challenge |
| `xpReward` | Number | XP thưởng: 50 |
| `bonusMultiplier` | Number | Hệ số nhân XP: 2 |
| `participants` | Number | Số user đã tham gia |
| `createdAt/updatedAt` | Date | Timestamps |

---

### A.3. Backend Services

#### A.3.1. File: `server/src/modules/quest/quest.service.js`

**Class: `QuestService`**

##### Method: `getDailyQuests(userId)` — Lấy quest hàng ngày

```
INPUT: userId (string)
OUTPUT: Array<{
  id, title, description, xpReward, icon,
  progress, target, completed, claimed,
  progressPercent (number 0-100)
}>

LUỒNG:
1. today = new Date().toISOString().split('T')[0]
2. Gọi ensureDailyQuests(userId, today)
3. Query: UserQuest.find({ user: userId, date: today }).populate('quest')
4. Map kết quả, tính progressPercent = min(100, (progress/target)*100)
5. Return array
```

##### Method: `ensureDailyQuests(userId, date)` — Khởi tạo quest cho user

```
INPUT: userId, date (YYYY-MM-DD)
OUTPUT: void (side-effect: tạo records trong DB)

LUỒNG:
1. Check: UserQuest.find({ user: userId, date }) ≥ DAILY_QUESTS.length?
   → Nếu đủ rồi thì return (đã assign hôm nay rồi)
2. Với mỗi template trong DAILY_QUESTS:
   a. Quest.findOne({ title: template.title, type: 'daily' })
      → Nếu chưa có: Quest.create({ ...template, type: 'daily', expiresAt: date+'T23:59:59' })
   b. UserQuest.findOne({ user: userId, quest: quest._id, date })
      → Nếu chưa có: UserQuest.create({ user: userId, quest: quest._id, date, progress: 0 })
3. Kết quả: user có đúng 5 UserQuest cho ngày hôm nay
```

##### Method: `updateQuestProgress(userId, lessonId, score)` — Cập nhật progress

```
INPUT: userId, lessonId, score (number, 0-100)
OUTPUT: void

LUỒNG:
1. today = new Date().toISOString().split('T')[0]
2. Gọi incrementQuestProgress(userId, today, 'lessonsCompleted', 1)
3. Nếu score === 100 → incrementQuestProgress(userId, today, 'perfectLessons', 1)
```

##### Method: `incrementQuestProgress(userId, date, progressField, amount)` — Tăng progress

```
INPUT: userId, date, progressField (string), amount (number)
OUTPUT: void

LUỒNG:
1. Quest.find({ progressField, isActive: true })
2. Với mỗi quest:
   a. UserQuest.findOne({ user: userId, quest: quest._id, date })
   b. Nếu tìm thấy VÀ chưa claimed:
      - userQuest.progress += amount
      - Nếu progress >= target → userQuest.completed = true
      - userQuest.save()
```

##### Method: `claimQuestReward(userId, userQuestId)` — Nhận thưởng

```
INPUT: userId, userQuestId
OUTPUT: { xpAwarded: number }

LUỒNG:
1. UserQuest.findById(userQuestId).populate('quest')
2. Kiểm tra: !userQuest → throw 'Quest not found'
3. Kiểm tra: userQuest.user != userId → throw 'Unauthorized'
4. Kiểm tra: !userQuest.completed → throw 'Quest not completed'
5. Kiểm tra: userQuest.claimed → throw 'Already claimed'
6. UserProgress.findOneAndUpdate({ user: userId }, { $inc: { points: xpReward } })
7. userQuest.claimed = true; userQuest.claimedAt = now; userQuest.save()
8. Return { xpAwarded }
```

##### Method: `getDailyChallenge()` — Lấy challenge hôm nay

```
INPUT: void
OUTPUT: { date, lesson: {...}, xpReward, bonusMultiplier, participants }

LUỒNG:
1. today = new Date().toISOString().split('T')[0]
2. DailyChallenge.findOne({ date: today }).populate('lesson')
3. Nếu chưa có:
   a. Lesson.aggregate([{ $sample: { size: 1 } }])
   b. Nếu có lesson → DailyChallenge.create({ date, lesson, xpReward: 50, bonusMultiplier: 2 })
4. Return challenge (hoặc null nếu không có lesson nào)
```

##### Method: `joinDailyChallenge(userId, challengeId)` — User tham gia challenge

```
INPUT: userId, challengeId
OUTPUT: { challenge: {...} }

LUỒNG:
1. DailyChallenge.findByIdAndUpdate(challengeId, { $inc: { participants: 1 } })
2. DailyChallenge.findById(challengeId).populate('lesson')
3. Return
```

#### A.3.2. File: `server/src/modules/quest/quest.controller.js`

**Class: `QuestController`**

| Method | HTTP | Route | Mô tả |
|---|---|---|---|
| `getDailyQuests` | GET | `/api/quests/daily` | Lấy 5 quest hàng ngày |
| `claimReward` | POST | `/api/quests/:userQuestId/claim` | Nhận thưởng quest |
| `getDailyChallenge` | GET | `/api/quests/daily-challenge` | Lấy challenge hôm nay |
| `joinChallenge` | POST | `/api/quests/daily-challenge/:challengeId/join` | Tham gia challenge |

#### A.3.3. File: `server/src/modules/quest/quest.routes.js`

```javascript
// server/src/modules/quest/quest.routes.js

router.use(authMiddleware);  // Tất cả routes đều cần đăng nhập

router.get('/daily',        questController.getDailyQuests);
router.post('/:userQuestId/claim',   questController.claimReward);
router.get('/daily-challenge',       questController.getDailyChallenge);
router.post('/daily-challenge/:challengeId/join', questController.joinChallenge);
```

#### A.3.4. Cập nhật `server/src/app.js`

Thêm dòng mount routes:
```javascript
const questRoutes = require('./modules/quest/quest.routes');
app.use('/api/quests', questRoutes);
```

---

### A.4. Frontend Services

#### A.4.1. File: `client/src/services/questService.js`

```javascript
// client/src/services/questService.js

import api from './api';

export const questService = {
  getDailyQuests: () => api.get('/quests/daily'),

  claimReward: (userQuestId) => api.post(`/quests/${userQuestId}/claim`),

  getDailyChallenge: () => api.get('/quests/daily-challenge'),

  joinChallenge: (challengeId) => api.post(`/quests/daily-challenge/${challengeId}/join`),
};
```

---

### A.5. Frontend Components

#### A.5.1. File: `client/src/components/gamification/Quests/QuestsPanel.jsx`

**Purpose:** Panel hiển thị 5 daily quests với progress bar và nút Claim.

**Props:** none (tự load data khi mount)

**State:**
- `quests: Array` — danh sách quest
- `loading: boolean`
- `claimingId: string | null` — đang claim quest nào

**UI Structure:**
```
┌─ QuestsPanel ──────────────────────────────────┐
│ Header: "Daily Quests" + today's date           │
│                                                  │
│ ┌─ QuestCard (loop) ─────────────────────────┐  │
│ │ [Icon]  Title           +XP XP             │  │
│ │         Description                        │  │
│ │         ████████░░░░░░░░  2/3             │  │
│ │                             [Claim ✓]      │  │
│ └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**States của mỗi QuestCard:**
| Trạng thái | UI |
|---|---|
| Progress < target | Progress bar + text "2/3", không có button |
| Progress ≥ target, chưa claim | Button "Claim" màu vàng |
| Đã claim | Icon ✓ màu xanh, progress bar đầy |

**Behavior:**
1. `useEffect` → `questService.getDailyQuests()` → set quests
2. `handleClaim(userQuestId)` → `questService.claimReward()` → update local state
3. Optimistic update: ngay khi click claim → set claimed=true → gọi API

**CSS:** `client/src/components/gamification/Quests/QuestsPanel.css`

#### A.5.2. File: `client/src/components/gamification/DailyChallenge/DailyChallengeBanner.jsx`

**Purpose:** Banner nổi bật hiển thị Daily Challenge với 2x XP multiplier.

**State:**
- `challenge: Object | null`
- `loading: boolean`

**UI Structure:**
```
┌─ DailyChallengeBanner (clickable) ──────────────┐
│ [🎯] Daily Challenge          [2x] [+50 XP]   │
│          Lesson Title                         │
│          👥 123 people joined today            │
└────────────────────────────────────────────────┘
```

**Behavior:**
1. `useEffect` → `questService.getDailyChallenge()` → set challenge
2. Click → `questService.joinChallenge()` → `navigate(/duolingo/lesson/${lesson._id})`
3. Nếu `!challenge` → return null (không hiển thị gì)

**CSS:** `client/src/components/gamification/DailyChallenge/DailyChallengeBanner.css`

#### A.5.3. Nơi đặt components

```
Dashboard / DuolingoHomePage:
├── DailyChallengeBanner    ← ở trên cùng, nổi bật
├── QuestsPanel             ← bên dưới banner, panel 5 quest
```

**Gọi `updateQuestProgress` sau khi hoàn thành lesson:**
- Trong `LessonPage.jsx`, sau khi gọi `duolingoService.submitLesson()` thành công
- Gọi `questService.incrementProgress()` (cần thêm method này vào service)
- HOẶC: server tự động cập nhật khi user hoàn thành lesson (gọi trong `duolingo.service.js`)

---

### A.6. Tích hợp với code hiện tại

#### A.6.1. Hook gọi khi hoàn thành bài học

Trong `client/src/pages/Duolingo/LessonPage.jsx`, sau khi submit lesson thành công:

```javascript
// Sau khi gọi submitLesson thành công
if (result.data?.data?.completed) {
  // Cập nhật quest progress
  questService.updateProgress(result.data.data.score); // score để tính perfect
  // Hoặc gọi từ server side trong duolingo.service.js
}
```

#### A.6.2. Update UserProgress model

Thêm field `xpEarned` (number, default: 0) để tracking quest "XP Hunter" (kiếm 100 XP hôm nay). Field này cần được reset mỗi ngày.

---

### A.7. Deliverables — Day 2

| # | File | Mô tả |
|---|---|---|
| 1 | `server/src/models/quest.model.js` | Quest template model |
| 2 | `server/src/models/userQuest.model.js` | User-Quest tracking model |
| 3 | `server/src/models/dailyChallenge.model.js` | Daily challenge model |
| 4 | `server/src/modules/quest/quest.service.js` | Business logic |
| 5 | `server/src/modules/quest/quest.controller.js` | HTTP handlers |
| 6 | `server/src/modules/quest/quest.routes.js` | API routes |
| 7 | `server/src/app.js` | Mount routes |
| 8 | `client/src/services/questService.js` | API client service |
| 9 | `client/src/components/gamification/Quests/QuestsPanel.jsx` | Quest panel UI |
| 10 | `client/src/components/gamification/Quests/QuestsPanel.css` | Styles |
| 11 | `client/src/components/gamification/DailyChallenge/DailyChallengeBanner.jsx` | Challenge banner UI |
| 12 | `client/src/components/gamification/DailyChallenge/DailyChallengeBanner.css` | Styles |
| 13 | Tích hợp vào DuolingoHomePage | Gắn 2 component vào layout |
| 14 | Tích hợp progress update vào LessonPage | Gọi update khi hoàn thành bài |

---

## PHẦN B — NGÀY 6: Push Notifications + Email Notifications

### B.1. Tổng quan chức năng

```
USER STORY:
1. Lần đầu đăng nhập → popup hỏi "Bật thông báo?"
   → User đồng ý → notification được enable
2. Mỗi ngày 8h tối → cron job chạy
   → Nếu streak ≥ 2 và chưa học hôm nay → GỬI PUSH + EMAIL reminder
3. Mỗi Sunday 9h sáng → cron job chạy
   → Gửi email "Weekly Progress Report" cho tất cả user active
4. Push notification hiện trên trình duyệt ngay cả khi tab đóng
5. Email được gửi qua Mailgun API
```

---

### B.2. Database Models

#### B.2.1. File: `server/src/models/pushSubscription.model.js`

Lưu trữ subscription endpoint từ trình duyệt.

| Field | Type | Mô tả |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `user` | ObjectId (ref: User) | User sở hữu subscription |
| `endpoint` | String | Push subscription URL |
| `keys` | Object | `{ p256dh, auth }` — encryption keys |
| `createdAt` | Date | Thời điểm đăng ký |

**Index:** `{ user: 1 }` → unique (hoặc unique trên endpoint)

#### B.2.2. File: `server/src/models/notification.model.js`

Lưu trữ lịch sử notification đã gửi.

| Field | Type | Mô tả |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `user` | ObjectId (ref: User) | Người nhận |
| `type` | Enum | `'streak_reminder'` \| `'weekly_report'` \| `'quest_complete'` \| `'achievement'` |
| `title` | String | Tiêu đề notification |
| `body` | String | Nội dung notification |
| `sent` | Boolean | Đã gửi thành công chưa |
| `sentAt` | Date | Thời điểm gửi |
| `createdAt` | Date | Timestamps |

---

### B.3. Backend Services

#### B.3.1. File: `server/src/shared/services/mailer.service.js`

**Tech: nodemailer + Mailgun API**

```javascript
// Cài: npm install nodemailer nodemailer-mailgun-transport

const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');

const auth = {
  auth: {
    api_key: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  },
};

const transport = nodemailer.createTransport(mg(auth));
const FROM = 'SmartEnglish <noreply@smartenglish.app>';
```

**Templates:**

| Key | Subject | Trigger |
|---|---|---|
| `streakReminder` | `Don't lose your {streak}-day streak!` | Cron 8h tối, streak ≥ 2 |
| `weeklyProgress` | `Your weekly progress report` | Cron Sunday 9h |

**Class: `MailerService`**

| Method | Input | Mô tả |
|---|---|---|
| `sendEmail(to, subject, html)` | email, subject, HTML string | Gửi email thông qua Mailgun |
| `sendStreakReminder(user)` | User object | Gửi streak reminder |
| `sendWeeklyReport(user, stats)` | User object, stats object | Gửi weekly report |

**Stats object cho weekly report:**
```javascript
{
  xpEarnedThisWeek: number,
  lessonsCompletedThisWeek: number,
  currentStreak: number,
  totalXp: number,
  rank: number,
}
```

#### B.3.2. File: `server/src/shared/services/push.service.js`

**Tech: web-push library**

```javascript
// Cài: npm install web-push
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:noreply@smartenglish.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);
```

**Class: `PushService`**

| Method | Input | Mô tả |
|---|---|---|
| `sendToUser(userId, payload)` | userId, { title, body } | Gửi push tới 1 user |
| `sendToAll(payload)` | { title, body } | Gửi push tới tất cả subscribers |
| `saveSubscription(userId, subscription)` | userId, subscription object | Lưu subscription vào DB |

**Subscription object từ browser:**
```javascript
{
  endpoint: "https://fcm.googleapis.com/fcm/send/...",
  keys: {
    p256dh: "B...",
    auth: "..."
  }
}
```

#### B.3.3. File: `server/src/modules/notification/notification.service.js`

**Class: `NotificationService`**

| Method | Input | Mô tả |
|---|---|---|
| `subscribe(userId, subscription)` | userId, subscription | Lưu push subscription |
| `unsubscribe(userId)` | userId | Xóa subscription |
| `sendStreakReminders()` | void | Cron job: gửi reminder tới user streak ≥ 2 chưa học hôm nay |
| `sendWeeklyReports()` | void | Cron job: gửi weekly report |

**`sendStreakReminders()` logic:**
```
1. today = new Date().toISOString().split('T')[0]
2. users = User.find({ streak: { $gte: 2 }, lastActiveDate: { $ne: today } })
3. Với mỗi user:
   a. mailerService.sendStreakReminder(user)
   b. pushService.sendToUser(user._id, { title: "Don't lose your streak!", body: "..." })
   c. Notification.create({ user, type: 'streak_reminder', ... })
```

**`sendWeeklyReports()` logic:**
```
1. users = User.find({ lastActiveDate: { $gte: 7daysAgo } })
2. Với mỗi user:
   a. Tính stats: xp tuần này, lessons tuần này (từ UserProgress)
   b. mailerService.sendWeeklyReport(user, stats)
   c. Notification.create({ user, type: 'weekly_report', ... })
```

#### B.3.4. File: `server/src/modules/notification/notification.controller.js`

**Class: `NotificationController`**

| Method | HTTP | Route | Mô tả |
|---|---|---|---|
| `subscribe` | POST | `/api/notifications/subscribe` | Lưu push subscription |
| `unsubscribe` | DELETE | `/api/notifications/unsubscribe` | Xóa subscription |
| `getHistory` | GET | `/api/notifications` | Lấy lịch sử notification |

#### B.3.5. File: `server/src/modules/notification/notification.routes.js`

```javascript
// server/src/modules/notification/notification.routes.js

router.use(authMiddleware);  // Cần đăng nhập

router.post('/subscribe',   notificationController.subscribe);
router.delete('/unsubscribe', notificationController.unsubscribe);
router.get('/',             notificationController.getHistory);
```

#### B.3.6. Cron Jobs

**File: `server/src/jobs/notification.jobs.js`**

```javascript
// Dùng node-cron
const cron = require('node-cron');
// Cài: npm install node-cron

// Mỗi ngày lúc 8h tối (VN timezone: UTC+7 = 13:00 UTC)
cron.schedule('0 13 * * *', async () => {
  console.log('[CRON] Sending streak reminders...');
  await notificationService.sendStreakReminders();
});

// Mỗi Sunday lúc 9h sáng (VN: 2:00 UTC)
cron.schedule('0 2 * * 0', async () => {
  console.log('[CRON] Sending weekly reports...');
  await notificationService.sendWeeklyReports();
});
```

**Import trong `server/src/app.js`:**
```javascript
require('./jobs/notification.jobs');
```

---

### B.4. Frontend Services

#### B.4.1. File: `client/src/services/notificationService.js`

```javascript
// client/src/services/notificationService.js

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export const notificationService = {
  isSupported: () => 'Notification' in window && 'serviceWorker' in navigator,

  async requestPermission() {
    if (!this.isSupported()) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  async subscribe(userId) {
    if (!this.isSupported()) return null;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, userId }),
    });

    return subscription;
  },

  async unsubscribe(userId) {
    await fetch('/api/notifications/unsubscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  },

  async sendTestNotification() {
    if (Notification.permission === 'granted') {
      new Notification('SmartEnglish', {
        body: 'Notifications are working!',
        icon: '/icon-192.png',
      });
    }
  },

  urlBase64ToUint8Array(base64) {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b64);
    return new Uint8Array([...raw].map((char) => char.charCodeAt(0)));
  },
};
```

---

### B.5. Frontend Components

#### B.5.1. File: `client/src/components/common/NotificationPrompt.jsx`

**Purpose:** Banner popup hỏi user có muốn bật notifications không.

**Props:** none

**State:** `dismissed: boolean`

**UI:**
```
┌─ NotificationPrompt ───────────────────────────────┐
│ 🔔  Enable notifications to keep your streak!     │
│      [Enable]  [Not now]                           │
└────────────────────────────────────────────────────┘
```

**Behavior:**
1. Nếu `Notification.permission === 'granted'` → return null
2. Nếu `dismissed === true` → return null
3. Click "Enable" → `notificationService.requestPermission()` → subscribe
4. Click "Not now" → set `dismissed = true`

**Nơi đặt:** Trong `DuolingoHomePage.jsx` hoặc `App.js`, phía dưới header, chỉ hiện khi user đã login và chưa enable.

#### B.5.2. Service Worker — File: `client/public/sw.js`

**Purpose:** Nhận push notification từ server và hiển thị.

```javascript
// client/public/sw.js

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

**Đăng ký trong `client/src/main.js`:**
```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .catch((err) => console.log('SW registration failed:', err));
  });
}
```

---

### B.6. Environment Variables

**Server `.env`:**
```env
# Mailgun
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.smartenglish.app

# Web Push (VAPID)
VAPID_PUBLIC_KEY=Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Client `.env`:**
```env
VITE_VAPID_PUBLIC_KEY=Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Tạo VAPID keys:**
```bash
npx web-push generate-vapid-keys
```

---

### B.7. Deliverables — Day 6 (Notifications)

| # | File | Mô tả |
|---|---|---|
| 1 | `server/src/models/pushSubscription.model.js` | Push subscription model |
| 2 | `server/src/models/notification.model.js` | Notification history model |
| 3 | `server/src/shared/services/mailer.service.js` | Mailgun email service |
| 4 | `server/src/shared/services/push.service.js` | Web push service |
| 5 | `server/src/modules/notification/notification.service.js` | Business logic |
| 6 | `server/src/modules/notification/notification.controller.js` | HTTP handlers |
| 7 | `server/src/modules/notification/notification.routes.js` | API routes |
| 8 | `server/src/jobs/notification.jobs.js` | Cron jobs (streak reminder + weekly report) |
| 9 | `server/src/app.js` | Mount routes + start cron jobs |
| 10 | `client/public/sw.js` | Service worker cho push |
| 11 | `client/src/services/notificationService.js` | Browser notification API wrapper |
| 12 | `client/src/components/common/NotificationPrompt.jsx` | Enable notification UI |
| 13 | `client/src/main.js` | Đăng ký service worker |

---

## PHẦN C — Tổng hợp Architecture

### C.1. API Routes Map

```
SERVER — Express
│
├── /api/auth/*                    ← Auth module (đã có)
├── /api/payment/*                  ← Payment module (đã có)
├── /api/quizlet/*                  ← Quizlet module (đã có)
├── /api/duolingo/*                 ← Duolingo module (đã có)
│
├── /api/quests
│   ├── GET    /daily               → getDailyQuests
│   ├── POST   /:userQuestId/claim  → claimReward
│   ├── GET    /daily-challenge     → getDailyChallenge
│   └── POST   /daily-challenge/:challengeId/join → joinChallenge
│
└── /api/notifications
    ├── POST   /subscribe           → subscribe (lưu push subscription)
    ├── DELETE /unsubscribe         → unsubscribe
    └── GET    /                    → getHistory (lịch sử notification)
```

### C.2. Database Models (tất cả)

```
MONGODB
│
├── User                     (đã có)
├── Set / Card / Folder      (đã có - Quizlet)
├── Lesson / Challenge       (đã có - Duolingo)
├── UserProgress             (đã có)
├── Payment                  (đã có)
│
├── Quest                    (MỚI - template nhiệm vụ)
├── UserQuest                (MỚI - tiến độ user-quest)
├── DailyChallenge           (MỚI - challenge ngày)
├── PushSubscription          (MỚI - push endpoint)
└── Notification              (MỚI - lịch sử notification)
```

### C.3. Frontend Pages & Components

```
CLIENT — React/Vite
│
├── /duolingo
│   ├── /courses              (đã có)
│   ├── /learn                (đã có)
│   ├── /lesson/:id           (đã có → thêm gọi quest progress)
│   ├── /shop                 (đã có)
│   ├── /quests               (→ tích hợp QuestsPanel)
│   └── /leaderboard          (đã có)
│
├── COMPONENTS
│   ├── gamification/
│   │   ├── Quests/
│   │   │   ├── QuestsPanel.jsx         (MỚI)
│   │   │   └── QuestsPanel.css          (MỚI)
│   │   └── DailyChallenge/
│   │       ├── DailyChallengeBanner.jsx (MỚI)
│   │       └── DailyChallengeBanner.css (MỚI)
│   │
│   └── common/
│       └── NotificationPrompt.jsx       (MỚI)
│
├── SERVICES
│   ├── questService.js                  (MỚI)
│   └── notificationService.js          (MỚI)
│
└── PUBLIC
    └── sw.js                            (MỚI - service worker)
```

---

## PHẦU D — Implementation Order

### Ngày 2 — Quests System

```
Bước 1: Database
  └── Tạo 3 model files (quest, userQuest, dailyChallenge)

Bước 2: Backend
  ├── quest.service.js    (5 methods)
  ├── quest.controller.js (4 handlers)
  └── quest.routes.js     (4 routes)
  └── Cập nhật app.js

Bước 3: Frontend Service
  └── questService.js

Bước 4: Components
  ├── QuestsPanel.jsx + CSS
  └── DailyChallengeBanner.jsx + CSS

Bước 5: Tích hợp
  ├── Gắn vào DuolingoHomePage
  └── Gắn update progress vào LessonPage
```

### Ngày 6 — Notifications

```
Bước 1: Database
  └── Tạo 2 model files (pushSubscription, notification)

Bước 2: Backend Services
  ├── mailer.service.js (Mailgun)
  ├── push.service.js   (web-push)
  └── notification.service.js (business logic)

Bước 3: Backend Controller + Routes
  ├── notification.controller.js (3 handlers)
  ├── notification.routes.js (3 routes)
  └── Cập nhật app.js

Bước 4: Cron Jobs
  └── notification.jobs.js (2 cron jobs)

Bước 5: Frontend Service Worker
  └── sw.js (service worker)

Bước 6: Frontend Service
  └── notificationService.js

Bước 7: Component
  └── NotificationPrompt.jsx

Bước 8: Tích hợp
  └── Gắn NotificationPrompt vào app
```

---

## PHẦN E — So sánh với Source Tham Khảo

| Tính năng | `next14-duolingo-clone` (reference) | SmartEnglish (implement) |
|---|---|---|
| Auth | Clerk | JWT + Google OAuth (đã có) |
| Payments | Stripe ($20/month) | MoMo + PayOS (đã có từ Day 1) |
| Admin | react-admin | react-admin (đã có từ Day 3) |
| Database | PostgreSQL (Neon/Drizzle) | MongoDB |
| Quest UI | `components/quests.tsx` | `QuestsPanel.jsx` (tương tự) |
| Daily Challenge | Có trong quests panel | Separate `DailyChallengeBanner` |
| Quest logic | Trong component (React) | Trong service (Express) |
| Notifications | Không có | **Cần implement** |
| Hearts modal | Có | Đã có (giữ nguyên) |
| Exit modal | Có | Đã có (giữ nguyên) |
| Practice modal | Có | Đã có (giữ nguyên) |
| Email | Không có | **Cần implement (Mailgun)** |
| Push | Không có | **Cần implement (web-push)** |

**Điểm khác biệt chính:**
1. **Database:** PostgreSQL (ref) → MongoDB (implement). Cần viết Mongoose schema thay vì Drizzle.
2. **Notifications:** Ref không có gì, implement đầy đủ push + email + cron jobs.
3. **Quest logic:** Ref viết trong React component, implement viết trong Express service (tách biệt client-server rõ ràng hơn).
4. **Payments:** Stripe → MoMo + PayOS (đã implement Day 1).

---

## PHẦN F — Điểm cần lưu ý khi implement

### F.1. XP Hunter Quest — Reset hàng ngày

Quest "XP Hunter" yêu cầu user kiếm 100 XP trong ngày. Cần thêm field `dailyXpEarned` vào `UserProgress` model và reset về 0 mỗi ngày. Hoặc dùng `date` trong `UserQuest` để track riêng.

### F.2. Hearts System — Giữ nguyên

File `client/src/components/duolingo/AudioPlayer.css` và các hearts-related files đã tồn tại. Không cần thay đổi hearts system hiện tại.

### F.3. Challenge Type — Kiểm tra

Cần verify `challengeOption` model đã tồn tại và có field `type` (SELECT/ASSIST) như trong source reference. Nếu chưa có thì cần tạo.

### F.4. Service Worker Cache

Service worker cần được cached đúng cách trong Vite/React để hoạt động ổn định trên production.

### F.5. VAPID Keys Security

`VAPID_PRIVATE_KEY` phải được giữ secret ở server. Chỉ public key được expose cho client qua env variable.
