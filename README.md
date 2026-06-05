# SmartEnglish Learning Platform

> A full-stack English learning platform that blends **Quizlet-style flashcards**, **Duolingo-inspired lesson flows**, **gamification**, **real-time notifications**, and **premium subscription monetization** into one polished product.

![Status](https://img.shields.io/badge/status-active-2563eb?style=for-the-badge)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-7c3aed?style=for-the-badge)
![Backend](https://img.shields.io/badge/backend-Node.js%20%2B%20Express-16a34a?style=for-the-badge)
![Database](https://img.shields.io/badge/database-MongoDB%20%2B%20Redis-f59e0b?style=for-the-badge)
![Deployment](https://img.shields.io/badge/deploy-Vercel%20%2B%20Render-111827?style=for-the-badge)

---

## Why this project stands out

SmartEnglish is not just a CRUD learning app. It is a **product-oriented full-stack system** designed to simulate the kind of thinking companies expect from engineers building real digital learning platforms:

- **Multi-experience learning architecture**: one platform, multiple study modes.
- **Two major pedagogical experiences in a single product**:
  - a **Quizlet-inspired flashcard ecosystem**
  - a **Duolingo-inspired guided lesson journey**
- **Gamification loop** with XP, streaks, achievements, leaderboards, quests, and rewards.
- **Premium monetization flow** with **MoMo** and **PayOS/VietQR** integrations.
- **Admin CMS** for managing courses, units, lessons, challenges, users, folders, and flashcard content.
- **Production-minded backend** with auth, security middleware, rate limiting, Redis, Socket.IO, scheduler jobs, and webhook handling.
- **Modern frontend experience** with route-based code splitting, reusable UI components, responsive layouts, and PWA preparation.

This repository demonstrates my ability to think across **product, architecture, UX, backend design, and deployment**, not just write isolated features.

---

## Product overview

SmartEnglish is a web platform that helps learners improve English through two complementary learning paths:

### 1. Flashcard learning system
Users can:
- create and manage personal flashcard sets
- organize sets into folders
- browse public sets
- study with multiple modes such as flashcards, learn, test, and match
- track progress and trigger gamified rewards

### 2. Guided lesson journey
Users can:
- select a course
- move through units and lessons in sequence
- practice with hearts/lives mechanics
- earn XP and streaks
- interact with a Duolingo-like roadmap and lesson progression

### 3. Platform features beyond learning
The product also includes:
- Google OAuth and JWT-based authentication
- profile management
- notifications and unread counters
- premium subscription checkout
- daily quests and daily challenge leaderboard
- real-time and scheduled engagement flows
- admin operations for educational content and user management

---

## Core feature highlights

### Learner-facing features
- Email/password authentication
- Google OAuth login
- OTP-based verification and password reset flows
- Dashboard with progress-oriented UX
- Flashcard set creation, editing, learning, and sharing
- Public/community flashcard exploration
- Folder-based content organization
- Study sessions and progress persistence
- Duolingo-style courses, units, lessons, quiz answers, and practice mode
- Hearts, streak, XP, achievements, quests, and leaderboard systems
- Premium membership page and payment checkout
- Notification center with read/unread management
- Dark mode and polished UI details

### Admin-facing features
- Admin-only route protection
- Dashboard stats overview
- CRUD management for:
  - courses
  - units
  - lessons
  - challenges
  - challenge options
  - flashcard sets
  - folders
  - community sets
  - users

### Engineering-focused features
- RESTful modular backend structure
- MongoDB for primary persistence
- Redis for infrastructure/cache-related support
- Socket.IO integration for real-time capability
- Scheduled streak reminders via cron-like jobs
- Upload handling for media assets
- Security middleware: Helmet, CORS, sanitization, cookies
- Rate limiting for sensitive auth/OTP flows
- Jest + Supertest backend tests
- Playwright end-to-end frontend tests
- Docker Compose for MongoDB and Redis local services
- Vercel SPA rewrite config for frontend deployment
- PWA registration support in the frontend bootstrap

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, React Router, Redux Toolkit, Bootstrap, Framer Motion |
| UI/UX | Geist fonts, Lucide icons, React Hot Toast, responsive custom styling |
| Backend | Node.js, Express 5, modular service/controller architecture |
| Database | MongoDB + Mongoose |
| Infra / Realtime | Redis, Socket.IO, Cron jobs |
| Authentication | JWT, HttpOnly cookies, Google OAuth |
| Payments | MoMo SDK, PayOS / VietQR |
| Testing | Jest, Supertest, Playwright |
| Deployment | Vercel (client), Render-ready backend patterns |
| DevOps | Docker Compose for MongoDB and Redis |

---

## Repository structure

```text
SmartEnglish-Learning-Platform/
├── client/                 # React + Vite web app
├── server/                 # Node.js + Express API
├── DEPLOY.md               # deployment guide
├── design.md               # design-related notes
└── README.md               # project overview
```

### Frontend structure snapshot

```text
client/
├── public/
├── src/
│   ├── api/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── pages/
│   ├── routes.jsx
│   ├── services/
│   ├── store/
│   └── utils/
├── e2e/
└── package.json
```

### Backend structure snapshot

```text
server/
├── src/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── modules/
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── bookmarks/
│   │   ├── duolingo/
│   │   ├── flashcard-sets/
│   │   ├── folders/
│   │   ├── gamification/
│   │   ├── media/
│   │   ├── notes/
│   │   ├── notification/
│   │   ├── payment/
│   │   ├── progress/
│   │   ├── quest/
│   │   ├── shares/
│   │   ├── study-sessions/
│   │   ├── tags/
│   │   └── user/
│   ├── seeders/
│   ├── shared/
│   ├── app.js
│   └── server.js
├── tests/
├── docker-compose.yml
└── package.json
```

---

## Architecture summary

### Frontend
The client is a **single-page application** built with React and Vite, using:
- **lazy-loaded routes** for performance
- **Redux Toolkit** for global state
- **Context providers** for dark mode, socket lifecycle, and gamification UX
- **feature-based pages and reusable components** for scalability
- **PWA service worker registration** for installability/offline-readiness direction

### Backend
The server follows a **modular Express architecture**:
- each domain is grouped by `routes -> controller -> service`
- MongoDB models represent educational, user, progress, and monetization entities
- middleware layers handle auth, validation, errors, rate limiting, and security
- Redis and event-driven services support broader platform behavior
- webhook endpoints support payment confirmation flows
- scheduler jobs support habit-forming engagement features

### Product system thinking
This project is especially valuable because it connects:
- **content creation**
- **learning delivery**
- **progress tracking**
- **engagement mechanics**
- **real-time interaction**
- **monetization**
- **admin governance**

That is the kind of end-to-end systems thinking recruiters and engineering managers often look for in strong full-stack candidates.

---

## Notable implemented modules

### Frontend modules
- Auth pages: login, register, forgot password, OAuth callback
- Dashboard and profile flows
- Flashcard flows: my sets, create set, edit set, browse, set detail, community set detail
- Study flows: flashcards, learn, test, match
- Duolingo flows: course selection, learning roadmap, lessons, practice
- Premium pages: upgrade, success, cancel
- Admin pages: dashboard and content management areas

### Backend modules
- `auth`: register, login, refresh, logout, OTP flows, Google auth
- `user`: user profile management
- `flashcard-sets` and `flashcards`: learner content lifecycle
- `folders`, `shares`, `bookmarks`, `notes`, `tags`: content organization and social utility
- `study-sessions` and `progress`: session tracking and learning analytics foundation
- `duolingo`: course, unit, lesson, quiz, hearts, practice, leaderboard
- `gamification`: stats, achievements, match score, completion rewards
- `quest`: daily quests and daily challenge flows
- `payment`: checkout, subscription status, verification, webhooks
- `notification`: inbox and unread state handling
- `admin`: privileged educational content and user management

---

## API surface at a glance

Representative API groups exposed by the backend:

- `/api/auth`
- `/api/users`
- `/api/flashcard-sets`
- `/api/flashcards`
- `/api/folders`
- `/api/shares`
- `/api/bookmarks`
- `/api/study-sessions`
- `/api/progress`
- `/api/notes`
- `/api/gamification`
- `/api/media`
- `/api/duolingo`
- `/api/payment`
- `/api/quests`
- `/api/notifications`
- `/api/admin`
- `/api/health`

This breadth reflects a platform built around **multiple user journeys**, not a single narrow feature.

---

## Local development setup

## 1) Start infrastructure

From `server/`, Docker Compose can provide MongoDB and Redis locally:

```bash
cd server
docker compose up -d
```

## 2) Start the backend

```bash
cd server
npm install
npm run dev
```

Backend runs by default at:

```text
http://localhost:5000
```

## 3) Start the frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs by default at:

```text
http://localhost:5173
```

---

## Environment variables

The backend validates environment configuration before startup. Typical variables include:


Depending on enabled integrations, you may also need additional credentials for:
- Google OAuth
- MoMo payment integration
- PayOS / VietQR integration
- cloud deployment environment variables

---

## Available scripts

### Client

```bash
npm run dev
npm run build
npm run lint
npm run preview
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:headed
```

### Server

```bash
npm run dev
npm start
npm run seed
npm test
npm run test:watch
npm run test:coverage
```

---

## Testing

### Backend tests
The server uses **Jest + Supertest** for API-level validation.

```bash
cd server
npm test
```

### Frontend tests
The client includes **Playwright** end-to-end coverage for key flows.

```bash
cd client
npm run test:e2e
```

---

## Deployment notes

### Frontend
The web client includes Vercel SPA rewrites so nested routes resolve correctly in production.

### Backend
The backend is structured for cloud deployment with:
- environment-based configuration
- secure cookie-aware auth flows
- health endpoint support
- externalized MongoDB/Redis services
- webhook endpoints for payment providers

For more deployment detail, see `DEPLOY.md`.

---

## Demo accounts

After seeding the database, the project provides test accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@gmail.com` | `Memoris123` |
| Student | `student@gmail.com` | `Memoris123` |

---

## What recruiters should notice here

If you are reviewing this project from a hiring perspective, the strongest signals are:

- I can build a **full-stack product**, not just isolated pages or endpoints.
- I understand **modular backend design** and feature decomposition.
- I can combine **UX thinking** with engineering execution.
- I can implement **authentication, payments, gamification, admin tooling, and real-time features** in the same system.
- I can design software that is closer to a **startup-ready product** than a classroom demo.
- I am comfortable working across **frontend, backend, infrastructure, testing, and deployment concerns**.

---

## Future improvements

Potential next steps for the platform:

- analytics dashboard for learner retention and completion trends
- AI-assisted vocabulary generation or pronunciation feedback
- richer spaced-repetition optimization
- team/classroom mode for teachers
- mobile app parity
- stronger observability and production metrics
- CI quality gates for lint, test, and preview deployments

---

## Documentation

- `DEPLOY.md` — deployment and CI/CD notes
- `design.md` — design-related notes
- `server/README.md` — backend-specific reference

---

## Author note

This project reflects a deliberate attempt to build something more ambitious than a standard portfolio app: a learning product with meaningful domain complexity, multiple personas, operational concerns, and monetization flows.

If you are a recruiter, hiring manager, or engineer reviewing this repository, I would be happy to walk through:
- architecture decisions
- feature prioritization
- trade-offs in auth and payment design
- how I structured the app for maintainability and scale

---

## License

This project is currently for educational and portfolio purposes.