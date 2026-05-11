# SmartEnglish API — Backend

Node.js + Express + MongoDB + Redis REST API.

## Quick Start

```bash
cd server
cp .env.development .env
npm install
npm run seed   # seed users + content
npm run dev     # http://localhost:5000
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (runs seed first) |
| `npm start` | Start production server |
| `npm run seed` | Seed DB with users, courses, achievements, flashcards |

## Environment Variables

Copy `.env.development` and fill in your values:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/memoris
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
CLIENT_URL=http://localhost:5173
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh tokens |
| POST | `/api/auth/logout` | Logout (protected) |
| POST | `/api/auth/forgot-password` | Send reset email |
| GET  | `/api/auth/google` | Google OAuth |
| GET  | `/api/auth/google/callback` | Google OAuth callback |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get profile |
| PUT | `/api/users/me` | Update profile |
| DELETE | `/api/users/me` | Delete account |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |

## Project Structure

```
src/
├── config/          # env, database, redis, passport
├── middleware/       # auth, error, validation, rate limiter
├── models/          # 19 Mongoose models
├── modules/
│   ├── auth/        # auth routes, controller, service, validation
│   └── user/        # user routes, controller, service, validation, model
├── seeders/         # DB seeders
├── server.js        # Entry point
├── app.js           # Express app setup
└── shared/
    ├── errors/      # AppError class
    ├── events/      # EventBus
    └── utils/       # apiResponse, asyncHandler, jwt
```

## Test Accounts

After `npm run seed`:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@gmail.com | Memoris123 |
| Student | student@gmail.com | Memoris123 |

## Production Deploy

See [DEPLOY.md](../DEPLOY.md) for CI/CD setup with Render + Vercel.
