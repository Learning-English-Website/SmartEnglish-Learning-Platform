# SmartEnglish Learning Platform

Full-stack English learning app with Web (React), Backend (Node.js/Express), and Android (Kotlin) clients.

## Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend Web** | React 18 + Vite + Bootstrap 5 |
| **Backend** | Node.js + Express + MongoDB + Redis |
| **Database** | MongoDB Atlas (cloud) + Redis Cloud |
| **Auth** | JWT + Google OAuth |
| **Hosting** | Vercel (web) + Render (API) |

## Quick Start

### Backend
```bash
cd server
cp .env.development .env
npm install
npm run seed
npm run dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```

## Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@gmail.com | Memoris123 |
| Student | student@gmail.com | Memoris123 |

## Week 1 — Completed ✅

- [x] Backend: Express + MongoDB + Redis + JWT auth
- [x] 19 Mongoose models
- [x] Auth APIs: Register, Login, ForgotPassword, EditProfile
- [x] Frontend: React + Vite + Bootstrap 5
- [x] Auth pages: Login, Register, ForgotPassword
- [x] Home + Profile + EditProfile pages
- [x] Dark/Light mode
- [x] CI/CD: GitHub Actions → Render (backend) + Vercel (frontend)
- [x] Seeders: users, courses, achievements, flashcards
- [x] Reusable components: Modal, SearchBar, Card, Badge

## Documentation

- [DEPLOY.md](./DEPLOY.md) — CI/CD & deployment guide
- [design.md](./design.md) — Design system
- [week1_web_plan.md](./week1_web_plan.md) — Week 1 plan
- [server/README.md](./server/README.md) — Backend docs
