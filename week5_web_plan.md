# WEEK 5: WEB APP — Advanced Gamification + Admin Panel + Payments

> **Tech Stack:** React + Vite + Express + MongoDB + Stripe + React Admin
> **Reference:** `duolingo-clone` (Next.js + Stripe + React Admin)
> **Mục tiêu:** Stripe Payments (Pro Tier), Admin Dashboard (React Admin), Quests System, Daily Challenges, Push Notifications, Polish & Optimization

---

## PHÂN TÍCH SO SÁNH

### SmartEnglish hiện tại có:
| Tính năng | Trạng thái |
|---|---|
| ✅ XP System | Hoàn thành |
| ✅ Level System | Hoàn thành |
| ✅ Streak System | Hoàn thành |
| ✅ Leaderboard | Hoàn thành |
| ✅ Achievements System | Hoàn thành |
| ✅ Basic Leaderboard UI | Hoàn thành |
| ✅ Dark Mode | Hoàn thia |

### Duolingo-clone có mà SmartEnglish THIẾU:
| Tính năng | Mô tả |
|---|---|
| ❌ **Quests System** | Nhiệm vụ hàng ngày/tuần với XP milestones |
| ❌ **Daily Challenge** | Thử thách đặc biệt mỗi ngày |
| ❌ **Stripe Payments** | Thanh toán Pro subscription ($20/tháng) |
| ❌ **Unlimited Hearts** | Người dùng Pro không mất hearts |
| ❌ **Admin Dashboard** | CRUD cho courses, units, lessons, challenges |
| ❌ **React Admin** | Dashboard quản trị chuyên nghiệp |
| ❌ **Hearts Shop** | Mua hearts bằng XP hoặc tiền |
| ❌ **Refill Animation** | Hiệu ứng khi refill hearts |
| ❌ **Streak Shield** | Bảo vệ streak khi miss 1 ngày |
| ❌ **Boosters** | Double XP, streak freeze |

---

## MỤC TIÊU WEEK 5

```
TUẦN 5 — Advanced Gamification + Admin + Payments (7 ngày)

📅 Ngày 1: Stripe Payments + Pro Subscription
📅 Ngày 2: Quests System + Daily Challenges
📅 Ngày 3: Admin Dashboard (React Admin)
📅 Ngày 4: Admin - CRUD cho Content (Courses, Units, Lessons, Challenges)
📅 Ngày 5: Boosters & Power-ups (Streak Shield, Double XP)
📅 Ngày 6: Push Notifications + Email
📅 Ngày 7: Polish + Final Testing + Documentation
```

---

## 📆 NGÀY 1 — Stripe Payments + Pro Subscription

### 1. Stripe Setup

#### Tạo `server/src/config/stripe.js`
```javascript
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

module.exports = stripe;
```

#### Tạo `server/src/modules/payment/payment.service.js`
```javascript
const stripe = require('../../config/stripe');
const UserProgress = require('../../models/userProgress.model');
const User = require('../../models/user.model');

const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID; // $20/month
const PRO_PRICE_CENTS = 2000;

class PaymentService {
  // Tạo Stripe Checkout Session cho Pro subscription
  async createCheckoutSession(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Kiểm tra đã có subscription chưa
    const existingSub = await this.getUserSubscription(userId);
    if (existingSub?.status === 'active') {
      throw new Error('Already subscribed');
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/pro/cancel`,
      customer_email: user.email,
      metadata: {
        userId: user._id.toString(),
      },
      subscription_data: {
        metadata: {
          userId: user._id.toString(),
        },
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  // Tạo Billing Portal Session
  async createPortalSession(userId) {
    const progress = await UserProgress.findOne({ user: userId });
    if (!progress?.stripeCustomerId) {
      throw new Error('No subscription found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: progress.stripeCustomerId,
      return_url: `${process.env.CLIENT_URL}/profile`,
    });

    return { url: session.url };
  }

  // Xử lý Stripe Webhook
  async handleWebhook(event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await this.handleCheckoutComplete(session);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await this.handlePaymentSuccess(invoice);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await this.handleSubscriptionCanceled(subscription);
        break;
      }
    }
  }

  async handleCheckoutComplete(session) {
    const userId = session.metadata.userId;
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Update user progress
    await UserProgress.findOneAndUpdate(
      { user: userId },
      {
        isPro: true,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
      { upsert: true }
    );
  }

  async handlePaymentSuccess(invoice) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    await UserProgress.findOneAndUpdate(
      { stripeCustomerId: invoice.customer },
      {
        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      }
    );
  }

  async handleSubscriptionCanceled(subscription) {
    await UserProgress.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        isPro: false,
        stripeSubscriptionId: null,
      }
    );
  }

  async getUserSubscription(userId) {
    const progress = await UserProgress.findOne({ user: userId });
    if (!progress?.stripeCustomerId) return null;

    if (progress.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(progress.stripeSubscriptionId);
        return {
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          isActive: subscription.status === 'active',
        };
      } catch (err) {
        return { status: 'canceled', isActive: false };
      }
    }
    return null;
  }
}

module.exports = new PaymentService();
```

#### Tạo `server/src/modules/payment/payment.controller.js`
```javascript
const paymentService = require('./payment.service');
const { asyncHandler } = require('../../shared/utils/asyncHandler');
const { ApiResponse } = require('../../shared/utils/apiResponse');

class PaymentController {
  createCheckout = asyncHandler(async (req, res) => {
    const { url } = await paymentService.createCheckoutSession(req.userId);
    res.json(ApiResponse.success({ url }));
  });

  createPortal = asyncHandler(async (req, res) => {
    const { url } = await paymentService.createPortalSession(req.userId);
    res.json(ApiResponse.success({ url }));
  });

  getSubscription = asyncHandler(async (req, res) => {
    const subscription = await paymentService.getUserSubscription(req.userId);
    res.json(ApiResponse.success(subscription));
  });

  handleWebhook = asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    await paymentService.handleWebhook(event);
    res.json({ received: true });
  });
}

module.exports = new PaymentController();
```

#### Tạo `server/src/modules/payment/payment.routes.js`
```javascript
const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

// Protected routes
router.post('/checkout', authMiddleware, paymentController.createCheckout);
router.post('/portal', authMiddleware, paymentController.createPortal);
router.get('/subscription', authMiddleware, paymentController.getSubscription);

// Webhook (raw body needed)
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;
```

#### Cập nhật `server/src/app.js`
```javascript
// Webhook cần raw body
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }), require('./modules/payment/payment.routes'));
app.use('/api/payment', require('./modules/payment/payment.routes'));
```

### 2. Frontend: Pro Upgrade Page

#### Tạo `client/src/pages/Pro/ProPage.jsx`
```javascript
import { useState } from 'react';
import { paymentService } from '../../services/paymentService';
import './ProPage.css';

export default function ProPage() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data } = await paymentService.createCheckout();
      window.location.href = data.data.url;
    } catch (err) {
      console.error('Checkout failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pro-page">
      <div className="pro-hero">
        <h1>Upgrade to Pro</h1>
        <p>Unlock unlimited learning power</p>
      </div>

      <div className="pro-features">
        <div className="feature-card">
          <span className="icon">❤️</span>
          <h3>Unlimited Hearts</h3>
          <p>Never run out of hearts. Learn without limits.</p>
        </div>
        <div className="feature-card">
          <span className="icon">📊</span>
          <h3>Progress Insights</h3>
          <p>Detailed analytics and learning statistics.</p>
        </div>
        <div className="feature-card">
          <span className="icon">🎯</span>
          <h3>Offline Mode</h3>
          <p>Download lessons for offline study.</p>
        </div>
        <div className="feature-card">
          <span className="icon">🏆</span>
          <h3>Exclusive Achievements</h3>
          <p>Unlock special Pro-only achievements.</p>
        </div>
      </div>

      <div className="pro-pricing">
        <div className="price-tag">
          <span className="amount">$20</span>
          <span className="period">/ month</span>
        </div>
        <button 
          className="btn-pro-upgrade" 
          onClick={handleUpgrade}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Upgrade Now'}
        </button>
        <p className="cancel-note">Cancel anytime. No commitment.</p>
      </div>
    </div>
  );
}
```

#### Tạo `client/src/services/paymentService.js`
```javascript
import api from '../api/axiosClient';

export const paymentService = {
  createCheckout: () => api.post('/payment/checkout'),
  createPortal: () => api.post('/payment/portal'),
  getSubscription: () => api.get('/payment/subscription'),
};
```

### ✅ Deliverable
Stripe integration hoàn chỉnh: Checkout Session, Billing Portal, Webhook Handler, Pro subscription activation.

---

## 📆 NGÀY 2 — Quests System + Daily Challenges

### 1. Database Models

#### Tạo `server/src/models/quest.model.js`
```javascript
const mongoose = require('mongoose');

const questSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['daily', 'weekly', 'achievement'],
    default: 'daily'
  },
  xpReward: { type: Number, default: 100 },
  icon: { type: String, default: '🎯' },
  // Target: số lượng cần hoàn thành
  target: { type: Number, default: 1 },
  // Progress field names to track
  progressField: { type: String, required: true }, // e.g., 'lessonsCompleted', 'perfectLessons'
  // Thời gian hết hạn
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Quest', questSchema);
```

#### Tạo `server/src/models/userQuest.model.js`
```javascript
const mongoose = require('mongoose');

const userQuestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quest: { type: mongoose.Schema.Types.ObjectId, ref: 'Quest', required: true },
  progress: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  claimed: { type: Boolean, default: false },
  claimedAt: { type: Date, default: null },
  // Cho daily quests
  date: { type: String, default: null }, // '2026-05-24'
}, { timestamps: true });

// Index cho fast lookups
userQuestSchema.index({ user: 1, quest: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('UserQuest', userQuestSchema);
```

#### Tạo `server/src/models/dailyChallenge.model.js`
```javascript
const mongoose = require('mongoose');

const dailyChallengeSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // '2026-05-24'
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  xpReward: { type: Number, default: 50 },
  bonusMultiplier: { type: Number, default: 2 }, // Double XP
  participants: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('DailyChallenge', dailyChallengeSchema);
```

### 2. Backend Services

#### Tạo `server/src/modules/quest/quest.service.js`
```javascript
const Quest = require('../../models/quest.model');
const UserQuest = require('../../models/userQuest.model');
const UserProgress = require('../../models/userProgress.model');
const DailyChallenge = require('../../models/dailyChallenge.model');
const Lesson = require('../../models/lesson.model');

const DAILY_QUESTS = [
  { title: 'First Steps', description: 'Complete 1 lesson', xpReward: 20, target: 1, progressField: 'lessonsCompleted' },
  { title: 'Quick Learner', description: 'Complete 3 lessons', xpReward: 50, target: 3, progressField: 'lessonsCompleted' },
  { title: 'Perfect Score', description: 'Get 100% on 1 lesson', xpReward: 30, target: 1, progressField: 'perfectLessons' },
  { title: 'XP Hunter', description: 'Earn 100 XP today', xpReward: 40, target: 100, progressField: 'xpEarned' },
  { title: 'Streak Keeper', description: 'Maintain your streak', xpReward: 25, target: 1, progressField: 'streakDays' },
];

class QuestService {
  // Lấy quests cho user hôm nay
  async getDailyQuests(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    // Tạo quests nếu chưa có
    await this.ensureDailyQuests(userId, today);
    
    const userQuests = await UserQuest.find({ 
      user: userId, 
      date: today 
    }).populate('quest');

    return userQuests.map(uq => ({
      id: uq._id,
      title: uq.quest.title,
      description: uq.quest.description,
      xpReward: uq.quest.xpReward,
      icon: uq.quest.icon,
      progress: uq.progress,
      target: uq.quest.target,
      completed: uq.completed,
      claimed: uq.claimed,
      progressPercent: Math.min(100, (uq.progress / uq.quest.target) * 100),
    }));
  }

  // Đảm bảo user có đủ daily quests
  async ensureDailyQuests(userId, date) {
    const existingQuests = await UserQuest.find({ user: userId, date });
    
    if (existingQuests.length >= DAILY_QUESTS.length) return;

    // Lấy hoặc tạo quests từ template
    for (const questTemplate of DAILY_QUESTS) {
      let quest = await Quest.findOne({ title: questTemplate.title, type: 'daily' });
      if (!quest) {
        quest = await Quest.create({ ...questTemplate, date, expiresAt: new Date(date + 'T23:59:59') });
      }

      const exists = await UserQuest.findOne({ user: userId, quest: quest._id, date });
      if (!exists) {
        await UserQuest.create({ user: userId, quest: quest._id, date });
      }
    }
  }

  // Cập nhật progress khi user hoàn thành lesson
  async updateQuestProgress(userId, lessonId) {
    const today = new Date().toISOString().split('T')[0];
    const userProgress = await UserProgress.findOne({ user: userId });
    
    // Update lessonsCompleted
    await this.incrementQuestProgress(userId, today, 'lessonsCompleted', 1);
    
    // Update perfectLessons (if 100% score)
    // await this.incrementQuestProgress(userId, today, 'perfectLessons', 1);
    
    // Update xpEarned
    // await this.incrementQuestProgress(userId, today, 'xpEarned', xpEarned);
    
    // Update streakDays
    await this.incrementQuestProgress(userId, today, 'streakDays', 1);
  }

  async incrementQuestProgress(userId, date, progressField, amount) {
    const quests = await Quest.find({ progressField });
    
    for (const quest of quests) {
      const userQuest = await UserQuest.findOne({ 
        user: userId, 
        quest: quest._id,
        date: date || new Date().toISOString().split('T')[0]
      });
      
      if (userQuest && !userQuest.claimed) {
        userQuest.progress += amount;
        if (userQuest.progress >= quest.target) {
          userQuest.completed = true;
        }
        await userQuest.save();
      }
    }
  }

  // Claim XP reward
  async claimQuestReward(userId, userQuestId) {
    const userQuest = await UserQuest.findById(userQuestId)
      .populate('quest');
    
    if (!userQuest) throw new Error('Quest not found');
    if (userQuest.user.toString() !== userId) throw new Error('Unauthorized');
    if (!userQuest.completed) throw new Error('Quest not completed');
    if (userQuest.claimed) throw new Error('Already claimed');

    // Award XP
    await UserProgress.findOneAndUpdate(
      { user: userId },
      { $inc: { points: userQuest.quest.xpReward } }
    );

    userQuest.claimed = true;
    userQuest.claimedAt = new Date();
    await userQuest.save();

    return { xpAwarded: userQuest.quest.xpReward };
  }

  // Daily Challenge
  async getDailyChallenge() {
    const today = new Date().toISOString().split('T')[0];
    let challenge = await DailyChallenge.findOne({ date: today })
      .populate('lesson');

    if (!challenge) {
      // Random lesson for today
      const randomLesson = await Lesson.aggregate([{ $sample: { size: 1 } }]);
      if (randomLesson.length > 0) {
        challenge = await DailyChallenge.create({
          date: today,
          lesson: randomLesson[0]._id,
          xpReward: 50,
          bonusMultiplier: 2,
        }).populate('lesson');
      }
    }

    return challenge;
  }

  async joinDailyChallenge(userId, challengeId) {
    await DailyChallenge.findByIdAndUpdate(challengeId, {
      $inc: { participants: 1 }
    });
    
    // Return lesson details for the challenge
    const challenge = await DailyChallenge.findById(challengeId)
      .populate('lesson');
    return challenge;
  }
}

module.exports = new QuestService();
```

#### Tạo `server/src/modules/quest/quest.controller.js`
```javascript
const questService = require('./quest.service');
const { asyncHandler } = require('../../shared/utils/asyncHandler');
const { ApiResponse } = require('../../shared/utils/apiResponse');

class QuestController {
  getDailyQuests = asyncHandler(async (req, res) => {
    const quests = await questService.getDailyQuests(req.userId);
    res.json(ApiResponse.success(quests));
  });

  claimReward = asyncHandler(async (req, res) => {
    const { userQuestId } = req.params;
    const result = await questService.claimQuestReward(req.userId, userQuestId);
    res.json(ApiResponse.success(result, 'Reward claimed!'));
  });

  getDailyChallenge = asyncHandler(async (req, res) => {
    const challenge = await questService.getDailyChallenge();
    res.json(ApiResponse.success(challenge));
  });

  joinChallenge = asyncHandler(async (req, res) => {
    const { challengeId } = req.params;
    const result = await questService.joinDailyChallenge(req.userId, challengeId);
    res.json(ApiResponse.success(result));
  });
}

module.exports = new QuestController();
```

#### Tạo `server/src/modules/quest/quest.routes.js`
```javascript
const express = require('express');
const router = express.Router();
const questController = require('./quest.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/daily', questController.getDailyQuests);
router.post('/:userQuestId/claim', questController.claimReward);
router.get('/daily-challenge', questController.getDailyChallenge);
router.post('/daily-challenge/:challengeId/join', questController.joinChallenge);

module.exports = router;
```

### 3. Frontend Components

#### Tạo `client/src/components/gamification/Quests/QuestsPanel.jsx`
```javascript
import { useState, useEffect } from 'react';
import { questService } from '../../services/questService';
import './QuestsPanel.css';

export default function QuestsPanel() {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuests();
  }, []);

  const loadQuests = async () => {
    try {
      const { data } = await questService.getDailyQuests();
      setQuests(data.data);
    } catch (err) {
      console.error('Failed to load quests', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (userQuestId) => {
    try {
      const { data } = await questService.claimReward(userQuestId);
      setQuests(quests.map(q => 
        q.id === userQuestId ? { ...q, claimed: true } : q
      ));
      // Show reward animation
    } catch (err) {
      console.error('Claim failed', err);
    }
  };

  if (loading) return <div className="quests-loading">Loading...</div>;

  return (
    <div className="quests-panel">
      <h3>Daily Quests</h3>
      <div className="quests-list">
        {quests.map((quest) => (
          <div key={quest.id} className={`quest-card ${quest.completed ? 'completed' : ''}`}>
            <div className="quest-icon">{quest.icon}</div>
            <div className="quest-info">
              <h4>{quest.title}</h4>
              <p>{quest.description}</p>
              <div className="quest-progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${quest.progressPercent}%` }}
                />
              </div>
              <span className="progress-text">
                {quest.progress}/{quest.target}
              </span>
            </div>
            <div className="quest-reward">
              <span className="xp">+{quest.xpReward} XP</span>
              {quest.completed && !quest.claimed && (
                <button className="claim-btn" onClick={() => handleClaim(quest.id)}>
                  Claim
                </button>
              )}
              {quest.claimed && <span className="claimed">✓</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Tạo `client/src/components/gamification/DailyChallenge/DailyChallengeBanner.jsx`
```javascript
import { useState, useEffect } from 'react';
import { questService } from '../../services/questService';
import { useNavigate } from 'react-router-dom';

export default function DailyChallengeBanner() {
  const [challenge, setChallenge] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadChallenge();
  }, []);

  const loadChallenge = async () => {
    try {
      const { data } = await questService.getDailyChallenge();
      setChallenge(data.data);
    } catch (err) {
      console.error('Failed to load daily challenge', err);
    }
  };

  const handleJoin = async () => {
    if (!challenge) return;
    try {
      await questService.joinChallenge(challenge._id);
      navigate(`/duolingo/lesson/${challenge.lesson._id}`);
    } catch (err) {
      console.error('Join failed', err);
    }
  };

  if (!challenge) return null;

  return (
    <div className="daily-challenge-banner" onClick={handleJoin}>
      <div className="challenge-badge">
        <span className="icon">🎯</span>
        <span>Daily Challenge</span>
      </div>
      <div className="challenge-info">
        <h4>{challenge.lesson?.title || 'Special Challenge'}</h4>
        <p>{challenge.participants} people joined today</p>
      </div>
      <div className="challenge-reward">
        <span className="xp-multiplier">2x</span>
        <span className="xp">+{challenge.xpReward} XP</span>
      </div>
    </div>
  );
}
```

### ✅ Deliverable
Quests System hoàn chỉnh với 5 daily quests, progress tracking, XP rewards, và Daily Challenge với 2x multiplier.

---

## 📆 NGÀY 3 — Admin Dashboard (React Admin)

### 1. Setup React Admin

#### Cài đặt dependencies
```bash
npm install react-admin ra-data-simple-rest
```

#### Tạo `client/src/pages/Admin/AdminPage.jsx`
```javascript
import { Admin, Resource, ListGuesser, EditGuesser } from 'react-admin';
import simpleRestProvider from 'ra-data-simple-rest';
import { CourseList, CourseEdit, CourseCreate } from './courses';
import { UnitList, UnitEdit, UnitCreate } from './units';
import { LessonList, LessonEdit, LessonCreate } from './lessons';
import { ChallengeList, ChallengeEdit, ChallengeCreate } from './challenges';

const dataProvider = simpleRestProvider('/api/admin');

export default function AdminPage() {
  return (
    <Admin dataProvider={dataProvider}>
      <Resource 
        name="courses" 
        list={CourseList}
        edit={CourseEdit}
        create={CourseCreate}
      />
      <Resource 
        name="units" 
        list={UnitList}
        edit={UnitEdit}
        create={UnitCreate}
      />
      <Resource 
        name="lessons" 
        list={LessonList}
        edit={LessonEdit}
        create={LessonCreate}
      />
      <Resource 
        name="challenges" 
        list={ChallengeList}
        edit={ChallengeEdit}
        create={ChallengeCreate}
      />
      <Resource 
        name="challengeOptions" 
        list={ChallengeList}
        edit={ChallengeEdit}
        create={ChallengeCreate}
      />
    </Admin>
  );
}
```

### 2. Backend Admin Routes

#### Tạo `server/src/modules/admin/admin.controller.js`
```javascript
const Course = require('../../models/course.model');
const Unit = require('../../models/unit.model');
const Lesson = require('../../models/lesson.model');
const Challenge = require('../../models/challenge.model');
const ChallengeOption = require('../../models/challengeOption.model');
const { asyncHandler } = require('../../shared/utils/asyncHandler');

// Course CRUD
const getCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find().sort({ order: 1 });
  res.json(courses);
});

const createCourse = asyncHandler(async (req, res) => {
  const course = await Course.create(req.body);
  res.status(201).json(course);
});

const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(course);
});

const deleteCourse = asyncHandler(async (req, res) => {
  await Course.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Unit CRUD
const getUnits = asyncHandler(async (req, res) => {
  const units = await Unit.find().populate('course');
  res.json(units);
});

const createUnit = asyncHandler(async (req, res) => {
  const unit = await Unit.create(req.body);
  res.status(201).json(unit);
});

const updateUnit = asyncHandler(async (req, res) => {
  const unit = await Unit.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(unit);
});

const deleteUnit = asyncHandler(async (req, res) => {
  await Unit.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Lesson CRUD
const getLessons = asyncHandler(async (req, res) => {
  const lessons = await Lesson.find().populate('unit');
  res.json(lessons);
});

const createLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.create(req.body);
  res.status(201).json(lesson);
});

const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(lesson);
});

const deleteLesson = asyncHandler(async (req, res) => {
  await Lesson.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Challenge CRUD
const getChallenges = asyncHandler(async (req, res) => {
  const challenges = await Challenge.find().populate('lesson');
  res.json(challenges);
});

const createChallenge = asyncHandler(async (req, res) => {
  const challenge = await Challenge.create(req.body);
  res.status(201).json(challenge);
});

const updateChallenge = asyncHandler(async (req, res) => {
  const challenge = await Challenge.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(challenge);
});

const deleteChallenge = asyncHandler(async (req, res) => {
  await Challenge.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Challenge Options CRUD
const getChallengeOptions = asyncHandler(async (req, res) => {
  const options = await ChallengeOption.find().populate('challenge');
  res.json(options);
});

const createChallengeOption = asyncHandler(async (req, res) => {
  const option = await ChallengeOption.create(req.body);
  res.status(201).json(option);
});

const updateChallengeOption = asyncHandler(async (req, res) => {
  const option = await ChallengeOption.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(option);
});

const deleteChallengeOption = asyncHandler(async (req, res) => {
  await ChallengeOption.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = {
  getCourses, createCourse, updateCourse, deleteCourse,
  getUnits, createUnit, updateUnit, deleteUnit,
  getLessons, createLesson, updateLesson, deleteLesson,
  getChallenges, createChallenge, updateChallenge, deleteChallenge,
  getChallengeOptions, createChallengeOption, updateChallengeOption, deleteChallengeOption,
};
```

#### Tạo `server/src/modules/admin/admin.routes.js`
```javascript
const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const User = require('../../models/user.model');

// Admin check middleware
const adminOnly = async (req, res, next) => {
  const user = await User.findById(req.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Apply auth + admin to all routes
router.use(authMiddleware, adminOnly);

// Courses
router.get('/courses', adminController.getCourses);
router.post('/courses', adminController.createCourse);
router.put('/courses/:id', adminController.updateCourse);
router.delete('/courses/:id', adminController.deleteCourse);

// Units
router.get('/units', adminController.getUnits);
router.post('/units', adminController.createUnit);
router.put('/units/:id', adminController.updateUnit);
router.delete('/units/:id', adminController.deleteUnit);

// Lessons
router.get('/lessons', adminController.getLessons);
router.post('/lessons', adminController.createLesson);
router.put('/lessons/:id', adminController.updateLesson);
router.delete('/lessons/:id', adminController.deleteLesson);

// Challenges
router.get('/challenges', adminController.getChallenges);
router.post('/challenges', adminController.createChallenge);
router.put('/challenges/:id', adminController.updateChallenge);
router.delete('/challenges/:id', adminController.deleteChallenge);

// Challenge Options
router.get('/challengeOptions', adminController.getChallengeOptions);
router.post('/challengeOptions', adminController.createChallengeOption);
router.put('/challengeOptions/:id', adminController.updateChallengeOption);
router.delete('/challengeOptions/:id', adminController.deleteChallengeOption);

module.exports = router;
```

### 3. Admin Components

#### Tạo `client/src/pages/Admin/courses.jsx`
```javascript
import { List, Datagrid, TextField, EditButton, NumberField } from 'react-admin';

export const CourseList = () => (
  <List>
    <Datagrid rowClick="edit">
      <TextField source="title" />
      <TextField source="language" />
      <TextField source="difficulty" />
      <NumberField source="order" />
      <TextField source="imageSrc" />
      <EditButton />
    </Datagrid>
  </List>
);

export const CourseEdit = () => (
  // Edit form with all fields
);

export const CourseCreate = () => (
  // Create form with all fields
);
```

### ✅ Deliverable
React Admin Dashboard với CRUD hoàn chỉnh cho Courses, Units, Lessons, Challenges, và ChallengeOptions.

---

## 📆 NGÀY 4 — Boosters & Power-ups

### 1. Database Models

#### Tạo `server/src/models/booster.model.js`
```javascript
const mongoose = require('mongoose');

const boosterSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['streak_freeze', 'double_xp', 'heart_refill'],
    required: true 
  },
  quantity: { type: Number, default: 1 },
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Booster', boosterSchema);
```

### 2. Hearts Shop UI

#### Tạo `client/src/pages/Shop/ShopPage.jsx`
```javascript
import { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import './ShopPage.css';

export default function ShopPage() {
  const [hearts, setHearts] = useState(5);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserProgress();
  }, []);

  const loadUserProgress = async () => {
    try {
      const { data } = await userService.getProgress();
      setHearts(data.data.hearts);
      setPoints(data.data.points);
    } catch (err) {
      console.error('Failed to load progress', err);
    }
  };

  const handleRefillHearts = async () => {
    if (points < 10) {
      alert('Not enough points! Need 10 XP to refill.');
      return;
    }
    setLoading(true);
    try {
      await duolingoService.refillHearts();
      setPoints(p => p - 10);
      setHearts(5);
    } catch (err) {
      console.error('Refill failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shop-page">
      <h1>Shop</h1>
      
      <div className="hearts-shop">
        <h2>Hearts</h2>
        <div className="current-hearts">
          <span className="heart-icon">❤️</span>
          <span className="count">{hearts}/5</span>
        </div>
        <button 
          className="refill-btn"
          onClick={handleRefillHearts}
          disabled={loading || points < 10}
        >
          🩷 Refill Hearts (10 XP)
        </button>
      </div>

      <div className="boosters-shop">
        <h2>Boosters</h2>
        <div className="booster-card">
          <span className="icon">❄️</span>
          <h3>Streak Freeze</h3>
          <p>Protect your streak for one missed day</p>
          <button>Coming Soon</button>
        </div>
        <div className="booster-card">
          <span className="icon">⚡</span>
          <h3>Double XP</h3>
          <p>2x XP for the next hour</p>
          <button>Coming Soon</button>
        </div>
      </div>

      <div className="pro-shop">
        <h2>Pro Membership</h2>
        <div className="pro-card">
          <span className="icon">⭐</span>
          <h3>Unlimited Hearts</h3>
          <p>Never run out of hearts again</p>
          <button onClick={() => navigate('/pro')}>
            Upgrade to Pro ($20/month)
          </button>
        </div>
      </div>
    </div>
  );
}
```

### ✅ Deliverable
Shop page với Hearts Refill, Boosters (coming soon), và Pro upgrade link.

---

## 📆 NGÀY 5 — Push Notifications + Email

### 1. Push Notifications (Web Push API)

#### Tạo `client/src/services/notificationService.js`
```javascript
const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY;

export const notificationService = {
  // Check if notifications are supported
  isSupported: () => 'Notification' in window,

  // Request permission
  async requestPermission() {
    if (!this.isSupported()) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  // Subscribe to push
  async subscribe(userId) {
    if (!this.isSupported()) return null;
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Send subscription to server
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription, userId }),
      headers: { 'Content-Type': 'application/json' },
    });

    return subscription;
  },

  // Send test notification
  async sendTestNotification(title, body) {
    if (!this.isSupported()) return;
    
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
    });
  },

  urlBase64ToUint8Array(base64String) {
    // Implementation
  },
};
```

#### Tạo `client/src/components/common/NotificationPrompt.jsx`
```javascript
import { notificationService } from '../../services/notificationService';
import { useState } from 'react';

export default function NotificationPrompt() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || Notification.permission === 'granted') return null;

  return (
    <div className="notification-prompt">
      <p>Enable notifications to never miss your daily streak!</p>
      <div className="actions">
        <button onClick={async () => {
          const granted = await notificationService.requestPermission();
          if (granted) setDismissed(true);
        }}>
          Enable
        </button>
        <button onClick={() => setDismissed(true)}>
          Not now
        </button>
      </div>
    </div>
  );
}
```

### 2. Email Notifications

#### Tạo `server/src/shared/services/mailer.service.js`
```javascript
const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');

const auth = {
  auth: {
    api_key: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  },
};

const nodemailerTransport = nodemailer.createTransport(mg(auth));

const FROM_EMAIL = 'SmartEnglish <noreply@smartenglish.app>';

const templates = {
  streakReminder: (streak) => ({
    subject: `Don't lose your ${streak}-day streak!`,
    html: `
      <h1>Keep your streak alive!</h1>
      <p>You have a ${streak}-day streak. Don't break it!</p>
      <a href="https://smartenglish.app/learn">Start learning now</a>
    `,
  }),
  weeklyProgress: (stats) => ({
    subject: 'Your weekly progress report',
    html: `
      <h1>Weekly Report</h1>
      <p>XP earned: ${stats.xp}</p>
      <p>Lessons completed: ${stats.lessons}</p>
      <p>Current streak: ${stats.streak} days</p>
    `,
  }),
};

class MailerService {
  async sendEmail(to, template, data) {
    const { subject, html } = templates[template](data);
    
    await nodemailerTransport.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
  }

  async sendStreakReminder(email, streak) {
    await this.sendEmail(email, 'streakReminder', { streak });
  }

  async sendWeeklyReport(email, stats) {
    await this.sendEmail(email, 'weeklyProgress', stats);
  }
}

module.exports = new MailerService();
```

### ✅ Deliverable
Push notifications với Web Push API và email notifications với Mailgun.

---

## 📆 NGÀY 6-7 — Polish + Final Testing

### Tasks
- [ ] Tích hợp tất cả components vào app
- [ ] Responsive design cho tất cả pages
- [ ] Error handling + loading states
- [ ] Performance optimization
- [ ] Final E2E tests
- [ ] Update README.md

### Final Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SMARTENGLISH APP                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────────┐      ┌──────────────────────┐       │
│   │    QUIZLET MODE      │      │   DUOLINGO MODE      │       │
│   │    (Tuần 2-3)        │      │   (Tuần 4)           │       │
│   ├──────────────────────┤      ├──────────────────────┤       │
│   │ 📚 Sets & Cards      │      │ 🌍 Courses           │       │
│   │ 🔄 4 Study Modes     │      │ 📖 Units & Lessons   │       │
│   │ 📁 Folders & Tags    │      │ 🎯 Challenges         │       │
│   │ 🤝 Shared Sets       │      │ ❤️ Hearts System      │       │
│   │ 🔍 Explore           │      │ ⚡ XP & Leaderboard   │       │
│   │                      │      │ 🎯 Quests             │       │
│   │                      │      │ 🛒 Shop               │       │
│   └──────────────────────┘      └──────────────────────┘       │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │                    SHARED FEATURES                        │ │
│   ├──────────────────────────────────────────────────────────┤ │
│   │ 🔐 Auth (JWT + Google OAuth)                             │ │
│   │ ⭐ Pro Subscription (Stripe)                             │ │
│   │ 🏆 Gamification (XP, Levels, Achievements, Streaks)     │ │
│   │ 📊 Admin Dashboard (React Admin)                        │ │
│   │ 🔔 Notifications (Push + Email)                          │ │
│   │ 🌙 Dark Mode                                             │ │
│   │ 📱 Mobile Responsive                                     │ │
│   │ 🎨 Modern UI (Tailwind + Framer Motion)                 │ │
│   └──────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Routes Map
```javascript
// Main Routes
/                          → Landing page
/login                     → Login
/register                  → Register

// Quizlet Mode
/dashboard                 → Dashboard (My Sets)
/sets                      → My Sets list
/sets/:id                  → Set detail
/sets/:id/learn            → Flashcard study
/create                    → Create new set
/folders                   → Folders
/explore                   → Browse community sets

// Duolingo Mode
/duolingo/courses          → Language courses
/duolingo/learn            → Learn page (units/lessons)
/duolingo/lesson/:id       → Quiz lesson
/duolingo/shop             → Hearts shop
/duolingo/quests           → Daily quests

// Gamification
/leaderboard               → Leaderboard
/profile                   → User profile
/achievements              → Achievements page

// Payment & Pro
/pro                       → Pro upgrade page
/pro/success               → Payment success
/pro/cancel                → Payment cancel

// Admin
/admin                     → Admin dashboard
```

### Environment Variables
```env
# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_PRICE_ID=price_xxx

# Mailgun
MAILGUN_API_KEY=key-xxx
MAILGUN_DOMAIN=mg.smartenglish.app

# Web Push
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx
```

### ✅ Deliverable
Week 5 hoàn chỉnh. SmartEnglish sẵn sàng production với:
- Stripe Payments (Pro tier)
- Quests System
- Admin Dashboard
- Boosters (planned)
- Push + Email Notifications

---

## 📋 Week 5 Checklist

| # | Checkpoint | Status |
|---|---|---|
| 1 | Stripe Checkout + Webhook | ⬜ |
| 2 | Pro subscription activation | ⬜ |
| 3 | Billing Portal | ⬜ |
| 4 | Quests database models | ⬜ |
| 5 | Quests backend service | ⬜ |
| 6 | Quests frontend panel | ⬜ |
| 7 | Daily Challenge system | ⬜ |
| 8 | React Admin setup | ⬜ |
| 9 | Admin CRUD: Courses | ⬜ |
| 10 | Admin CRUD: Units | ⬜ |
| 11 | Admin CRUD: Lessons | ⬜ |
| 12 | Admin CRUD: Challenges | ⬜ |
| 13 | Shop page (hearts refill) | ⬜ |
| 14 | Boosters models (planned) | ⬜ |
| 15 | Web Push notifications | ⬜ |
| 16 | Email notifications (Mailgun) | ⬜ |
| 17 | Pro upgrade page | ⬜ |
| 18 | Integration + Polish | ⬜ |
| 19 | Final testing | ⬜ |

---

## 🎯 Reference Code Locations

| Feature | Source in duolingo-clone |
|---|---|
| Stripe Checkout | `actions/user-subscription.ts` |
| Pro subscription | `app/(main)/shop/page.tsx`, `items.tsx` |
| Quests panel | `components/quests.tsx` |
| Leaderboard | `app/(main)/leaderboard/page.tsx` |
| Admin setup | `app/admin/page.tsx`, `app/admin/app.tsx` |

---

## ✅ Week 5 Deliverables

### Payments
- Stripe Checkout Session
- Webhook handler
- Billing Portal
- Pro subscription ($20/month)

### Gamification
- Quests System (5 daily quests)
- Progress tracking
- XP rewards
- Daily Challenge (2x XP)
- Hearts Shop
- Boosters (Streak Freeze, Double XP - planned)

### Admin
- React Admin Dashboard
- CRUD: Courses, Units, Lessons, Challenges
- Role-based access (admin only)

### Notifications
- Web Push API
- Mailgun email service
- Streak reminders
- Weekly progress reports

### Polish
- Responsive design
- Error handling
- Loading states
- Performance optimization
