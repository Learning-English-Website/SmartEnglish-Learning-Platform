# 🌐 WEEK 1: BACKEND + WEB — Plan Chi Tiết (7 Ngày)

> **Backend:** Node.js + Express + MongoDB (Mongoose) + Redis (ioredis) + JWT + Docker
> **Frontend:** React 18 + Vite + Bootstrap 5 + Axios + React Router v6
> **Database:** MongoDB Atlas (cloud) + Redis Cloud (cloud)
> **Mục tiêu:** Auth API đầy đủ (Register, Login, ForgotPassword, EditProfile), 19 Mongoose models, deploy staging. Web auth flow + layout + Home/Profile hoàn chỉnh.

---

## 📆 NGÀY 1 — Project Setup

### ⚙️ Backend

- [ ] Khởi tạo project:
  ```bash
  mkdir server && cd server
  npm init -y
  npm install express mongoose cors helmet dotenv joi bcryptjs jsonwebtoken
  npm install express-rate-limit express-mongo-sanitize xss-clean morgan ioredis multer nodemailer
  npm install -D nodemon
  ```
- [ ] Tạo `package.json` scripts:
  ```json
  "scripts": { "dev": "nodemon src/server.js", "start": "node src/server.js", "seed": "node src/seeders/index.js" }
  ```
- [ ] Tạo `.env.example` + `.env.development`:
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
- [ ] Tạo `src/config/env.js` — validate env bằng Joi:
  ```javascript
  const Joi = require('joi');
  const envSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(5000),
    MONGODB_URI: Joi.string().required(),
    REDIS_URL: Joi.string().required(),
    JWT_ACCESS_SECRET: Joi.string().required(),
    JWT_REFRESH_SECRET: Joi.string().required(),
  }).unknown();
  const { value: env, error } = envSchema.validate(process.env);
  if (error) throw new Error(`Config validation error: ${error.message}`);
  module.exports = env;
  ```
- [ ] Tạo `src/config/database.js`:
  ```javascript
  const mongoose = require('mongoose');
  const connectDB = async () => {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI);
      console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
      console.error(`MongoDB connection error: ${error.message}`);
      process.exit(1);
    }
  };
  module.exports = connectDB;
  ```
- [ ] Tạo `src/config/redis.js`:
  ```javascript
  const Redis = require('ioredis');
  const redis = new Redis(process.env.REDIS_URL);
  redis.on('connect', () => console.log('Redis connected'));
  redis.on('error', (err) => console.error('Redis error:', err));
  module.exports = redis;
  ```
- [ ] Tạo `src/app.js`:
  ```javascript
  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  const morgan = require('morgan');
  const mongoSanitize = require('express-mongo-sanitize');
  const { errorHandler } = require('./middleware/error.middleware');

  const app = express();
  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(mongoSanitize());

  app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
  app.use('/api/auth', require('./modules/auth/auth.routes'));
  app.use('/api/users', require('./modules/user/user.routes'));

  app.use(errorHandler);
  module.exports = app;
  ```
- [ ] Tạo `src/server.js`:
  ```javascript
  require('dotenv').config();
  const app = require('./app');
  const connectDB = require('./config/database');
  require('./config/redis');
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  });
  ```
- [ ] Tạo `docker-compose.yml` cho local dev:
  ```yaml
  version: '3.8'
  services:
    mongodb:
      image: mongo:7
      ports: ['27017:27017']
      volumes: [mongo_data:/data/db]
    redis:
      image: redis:7-alpine
      ports: ['6379:6379']
  volumes:
    mongo_data:
  ```
- [ ] Verify: `docker compose up -d` → `npm run dev` → "MongoDB connected", "Redis connected"
- [ ] Test: `curl http://localhost:5000/api/health` → `{ "status": "ok" }`

### 🌐 Web Frontend

- [ ] Khởi tạo React project:
  ```bash
  npx -y create-vite@latest ./ -- --template react
  npm install react-router-dom axios bootstrap react-bootstrap react-icons react-hot-toast
  ```
- [ ] Setup folder structure:
  ```
  src/
  ├── api/axiosClient.js
  ├── components/common/
  ├── context/
  ├── hooks/
  ├── pages/
  ├── styles/
  ├── utils/
  ├── App.jsx
  ├── routes.jsx
  └── main.jsx
  ```
- [ ] Tạo `api/axiosClient.js`:
  ```javascript
  import axios from 'axios';
  const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
  });

  // Request interceptor — attach token
  axiosClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Response interceptor — handle 401 + auto refresh
  axiosClient.interceptors.response.use(
    (response) => response.data,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return axiosClient(originalRequest);
        } catch (refreshError) { localStorage.clear(); window.location.href = '/login'; }
      }
      return Promise.reject(error);
    }
  );
  export default axiosClient;
  ```
- [ ] Tạo `.env.development`:
  ```
  VITE_API_URL=http://localhost:5000/api
  VITE_APP_NAME=Memoris
  ```
- [ ] Import Bootstrap trong `main.jsx`: `import 'bootstrap/dist/css/bootstrap.min.css';`
- [ ] Tạo `App.jsx` + `routes.jsx` skeleton
- [ ] Verify: `npm run dev` → trang hiện "Hello Memoris"

### ✅ Deliverable
Backend: Server `localhost:5000`, MongoDB + Redis connected. Web: Vite dev server `localhost:5173`, Axios client sẵn sàng.

---

## 📆 NGÀY 2 — Middleware + Layout

### ⚙️ Backend — Middleware + Shared Utilities

- [ ] Tạo `shared/errors/AppError.js`:
  ```javascript
  class AppError extends Error {
    constructor(message, statusCode) {
      super(message); this.statusCode = statusCode; this.isOperational = true;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  module.exports = { AppError };
  ```
- [ ] Tạo `shared/utils/apiResponse.js`:
  ```javascript
  class ApiResponse {
    static success(data, message = 'Success', meta = null) {
      return { success: true, message, data, ...(meta && { meta }) };
    }
    static error(message, code = 'ERROR', details = null) {
      return { success: false, error: { code, message, ...(details && { details }) } };
    }
  }
  module.exports = { ApiResponse };
  ```
- [ ] Tạo `shared/utils/asyncHandler.js`
- [ ] Tạo `shared/utils/jwt.js`:
  ```javascript
  const jwt = require('jsonwebtoken');
  const generateAccessToken = (user) => jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRY });
  const generateRefreshToken = (user) => jwt.sign({ sub: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRY });
  const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };
  ```
- [ ] Tạo `middleware/auth.middleware.js` — JWT verify, attach `req.user`
- [ ] Tạo `middleware/error.middleware.js` — global error handler
- [ ] Tạo `middleware/validation.middleware.js` — Joi runner
- [ ] Tạo `middleware/rateLimiter.middleware.js` — 5 req / 15min cho login
- [ ] Tạo `shared/events/eventBus.js` — EventEmitter singleton
- [ ] Tạo `shared/services/BaseService.js` — CRUD base (plan Section 1.0.4)
- [ ] Verify: `GET /api/health` → 200 OK

### 🌐 Web — Layout Components + Routing

- [ ] Tạo `Navbar/Navbar.jsx` — logo, nav links, auth buttons, user dropdown, responsive
- [ ] Tạo `Sidebar/Sidebar.jsx` — dashboard navigation, collapsible
- [ ] Tạo `Footer/Footer.jsx`
- [ ] Tạo `LoadingSpinner/LoadingSpinner.jsx`
- [ ] Setup `react-hot-toast` trong `App.jsx`
- [ ] Tạo `routes.jsx`:
  ```jsx
  const routes = [
    { path: '/', element: <HomePage /> },
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },
    { path: '/forgot-password', element: <ForgotPasswordPage /> },
    { path: '/dashboard', element: <ProtectedRoute><DashboardPage /></ProtectedRoute> },
    { path: '/quizlet', element: <ProtectedRoute><QuizletHomePage /></ProtectedRoute> },
    { path: '/duolingo', element: <ProtectedRoute><DuolingoHomePage /></ProtectedRoute> },
    { path: '/profile', element: <ProtectedRoute><ProfilePage /></ProtectedRoute> },
    { path: '/profile/edit', element: <ProtectedRoute><EditProfilePage /></ProtectedRoute> },
  ];
  ```
- [ ] Tạo `ProtectedRoute/ProtectedRoute.jsx` — check auth, redirect `/login`
- [ ] Tạo placeholder pages
- [ ] Verify: navigate giữa routes, Navbar đúng, Protected routes redirect

### ✅ Deliverable
Backend: Middleware sẵn sàng, JWT hoạt động. Web: Layout hoàn chỉnh, routes hoạt động.

---

## 📆 NGÀY 3 — Auth APIs + Auth State

### ⚙️ Backend — User Model + Auth APIs + ForgotPassword

- [ ] Tạo `modules/user/user.model.js`:
  ```javascript
  const UserSchema = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, minlength: 3, maxlength: 30 },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'student', 'teacher'], default: 'student' },
    avatar: { type: String, default: null },
    premium: { type: String, enum: ['free', 'trial', 'premium'], default: 'free' },
    oauth: { googleId: String, facebookId: String },
    isVerified: { type: Boolean, default: false },
    lastLoginAt: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  }, { timestamps: true });

  UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
  });
  UserSchema.methods.comparePassword = async function (candidate) { return bcrypt.compare(candidate, this.password); };
  UserSchema.statics.findByEmail = function (email) { return this.findOne({ email }).select('+password'); };
  ```
- [ ] Tạo `modules/auth/auth.service.js`:
  - `register({ email, username, password })` — create user + tokens + Redis
  - `login(email, password)` — verify + tokens
  - `refreshToken(token)` — rotate tokens
  - `logout(userId)` — delete Redis key
  - `forgotPassword(email)` — generate reset token + (TODO: send email)
- [ ] Tạo `modules/auth/auth.controller.js` — wrap service calls
- [ ] Tạo `modules/auth/auth.validation.js` — Joi schemas (register, login, forgotPassword)
- [ ] Tạo `modules/auth/auth.routes.js`:
  ```
  POST /api/auth/register
  POST /api/auth/login        (rate limited)
  POST /api/auth/refresh
  POST /api/auth/logout       (protected)
  POST /api/auth/forgot-password
  ```
- [ ] **Test bằng Postman** — register, login, refresh, logout, forgot-password
- [ ] **Export Postman collection** → share cho Dev C (Android)

### 🌐 Web — Auth Context + Token Logic

- [ ] Tạo `context/AuthContext.jsx`:
  ```jsx
  const initialState = { user: null, isAuthenticated: false, loading: true, error: null };
  function authReducer(state, action) {
    switch (action.type) {
      case 'LOGIN_START': return { ...state, loading: true, error: null };
      case 'LOGIN_SUCCESS': return { ...state, user: action.payload, isAuthenticated: true, loading: false };
      case 'LOGIN_FAILURE': return { ...state, error: action.payload, loading: false };
      case 'LOGOUT': return { ...initialState, loading: false };
      case 'SET_USER': return { ...state, user: action.payload, isAuthenticated: true, loading: false };
      default: return state;
    }
  }
  ```
- [ ] Tạo `hooks/useAuth.js` — login(), register(), logout(), loadUser()
- [ ] Tạo `api/auth.api.js`:
  ```javascript
  export const authAPI = {
    login: (data) => axiosClient.post('/auth/login', data),
    register: (data) => axiosClient.post('/auth/register', data),
    refresh: (data) => axiosClient.post('/auth/refresh', data),
    forgotPassword: (data) => axiosClient.post('/auth/forgot-password', data),
    getMe: () => axiosClient.get('/users/me'),
    updateProfile: (data) => axiosClient.put('/users/me', data),
  };
  ```
- [ ] Wrap `<App>` với `<AuthProvider>`
- [ ] Implement `loadUser()` on mount — check token, GET /users/me
- [ ] Verify: login state persist sau refresh page

> [!IMPORTANT]
> **SYNC POINT:** Share Postman collection cho Dev C ngay khi Auth API chạy!

### ✅ Deliverable
Backend: Auth API hoàn chỉnh. Web: Auth state management sẵn sàng.

---

## 📆 NGÀY 4 — Auth UI + User APIs + All Models

### ⚙️ Backend — User APIs + 19 Mongoose Models

- [ ] Tạo `modules/user/user.service.js`:
  ```javascript
  class UserService {
    async getProfile(userId) { /* findById */ }
    async updateProfile(userId, data) {
      const allowed = ['username', 'avatar'];
      const updateData = {};
      allowed.forEach(f => { if (data[f] !== undefined) updateData[f] = data[f]; });
      return User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
    }
    async deleteAccount(userId) { /* findByIdAndDelete */ }
  }
  ```
- [ ] Tạo `user.controller.js`, `user.routes.js`, `user.validation.js`:
  ```
  GET    /api/users/me     → getProfile (protected)
  PUT    /api/users/me     → updateProfile (protected)
  DELETE /api/users/me     → deleteAccount (protected)
  ```
- [ ] **Tạo 19 Mongoose models** (schema only, theo plan Section 7):
  - `flashcardSet.model.js`, `flashcard.model.js`, `tag.model.js`, `folder.model.js`, `note.model.js`
  - `studySession.model.js`, `mistakeLog.model.js`
  - `course.model.js`, `unit.model.js`, `lesson.model.js`, `exercise.model.js`
  - `userProgress.model.js`, `dailyQuest.model.js`, `leaderboardEntry.model.js`
  - `learningPreferences.model.js`, `learningHistory.model.js`
  - `achievement.model.js`, `userAchievement.model.js`, `notification.model.js`
- [ ] Verify: restart server, MongoDB Compass hiện tất cả collections

### 🌐 Web — Login + Register + ForgotPassword Pages

- [ ] Tạo `pages/Auth/LoginPage.jsx`:
  - Form: email + password, validation, error, loading
  - "Forgot Password?" → `/forgot-password`
  - "Sign in with Google" (placeholder)
  - Submit → `login()` → redirect `/dashboard`
- [ ] Tạo `pages/Auth/RegisterPage.jsx`:
  - Form: email + username + password + confirm
  - Validation: email, username 3-30, password 8+ (upper+lower+digit)
  - Submit → `register()` → redirect `/dashboard`
- [ ] Tạo `pages/Auth/ForgotPasswordPage.jsx`:
  - Form: email
  - Button: "Send Reset Link" → `POST /api/auth/forgot-password`
  - Success: "Check your email for reset instructions"
  - Link: "Back to Login"
- [ ] **Test end-to-end:**
  - [ ] Register → user trong MongoDB → dashboard
  - [ ] Login → redirect dashboard, Navbar hiện username
  - [ ] Refresh → vẫn logged in
  - [ ] Logout → redirect login
  - [ ] Sai password → error
  - [ ] Trùng email → error
  - [ ] Forgot Password → success message

### ✅ Deliverable
Backend: User APIs + 19 models. Web: Login + Register + ForgotPassword hoạt động e2e.

---

## 📆 NGÀY 5 — Home + Profile + EditProfile + Deploy

### ⚙️ Backend — Deploy Staging (MongoDB + Redis Cloud)

> **Lưu ý:** MongoDB và Redis đã chạy trên cloud (MongoDB Atlas + Redis Cloud), không cần Docker cho database.

**Bước 1: Cập nhật `.env.production` với cloud URLs:**

```env
NODE_ENV=production
PORT=5000
# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/memoris?retryWrites=true&w=majority
# Redis Cloud Connection String  
REDIS_URL=rediss://<username>:<password>@<redis-host>:<port>
JWT_ACCESS_SECRET=your_production_access_secret_here
JWT_REFRESH_SECRET=your_production_refresh_secret_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
CLIENT_URL=https://your-web-staging.vercel.app
```

**Bước 2: Tạo `Dockerfile` cho API (chỉ cần container hóa Node.js app):**

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build  # nếu có build step

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY . .
EXPOSE 5000
CMD ["node", "src/server.js"]
```

**Bước 3: Tạo `docker-compose.prod.yml` (chỉ API, không có mongo/redis):**

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - '5000:5000'
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - REDIS_URL=${REDIS_URL}
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
      - CLIENT_URL=${CLIENT_URL}
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://localhost:5000/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
```

**Bước 4: Deploy lên VPS hoặc Cloud Platform:**

<details>

<details>
<summary><b>T Deploy lên Railway (Khuyến nghị - dễ nhất)</b></summary>

```bash
# Cài Railway CLI
npm install -g @railway/cli

# Login
railway login

# Init project trong thư mục server
cd server
railway init
railway add --variable MONGODB_URI
railway add --variable REDIS_URL
railway add --variable JWT_ACCESS_SECRET
railway add --variable JWT_REFRESH_SECRET
# ... các biến khác

# Deploy
railway up

# Get URL
railway domain
```
</details>

**Bước 5: Cập nhật Web Frontend `VITE_API_URL`:**

```bash
# Tạo .env.production cho web
echo "VITE_API_URL=https://api.your-staging-domain.com/api" > .env.production
echo "VITE_APP_NAME=Memoris" >> .env.production
```

**Bước 6: Verify deployment:**

```bash
# Health check API
curl https://api.yourdomain.com/api/health
# → {"status":"ok","timestamp":"2026-..."}

# Test register (Postman)
POST https://api.yourdomain.com/api/auth/register
# → 201 Created

# Test login
POST https://api.yourdomain.com/api/auth/login
# → 200 + tokens
```

> [!IMPORTANT]
> **Dev C (Android):** Cung cấp staging API URL và Postman collection ngay sau bước này!

> [!TIP]
> **MongoDB Atlas Tips:**
> - Whitelist IP: `0.0.0.0/0` (hoặc IP của VPS/Railway)
> - Dùng username/password trong connection string
> - Bật "Connect your application" để lấy driver connection string chuẩn
>
> **Redis Cloud Tips:**
> - Public endpoint: `redis-xxxxx.cNNN.uswN-1-1.ec2.cloud.redislabs.com:xxxxx`
> - Hoặc dùng TLS: `rediss://` prefix
> - Database password trong connection string

### 🌐 Web — Home + Profile + EditProfile + Deploy Vercel

**Bước 1: Cập nhật `VITE_API_URL` sang staging:**

```bash
# Tạo .env.staging cho web
VITE_API_URL=https://api.your-staging-domain.com/api
VITE_APP_NAME=Memoris
```

**Bước 2: Deploy lên Vercel:**

```bash
# Cài Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy từ thư mục gốc (không phải server/)
vercel

# Sau khi deploy xong, set production environment variables:
vercel env add VITE_API_URL
vercel env add VITE_APP_NAME

# Deploy lại với env vars
vercel --prod
```

**Hoặc qua GitHub + Vercel Dashboard:**

1. Push code lên GitHub
2. Import project trên [vercel.com/dashboard](https://vercel.com/dashboard)
3. Set Environment Variables trong Settings → Environment Variables
4. Deploy

**Bước 3: Implement các pages:**

- [ ] Tạo `pages/Home/HomePage.jsx`:
  - Welcome + user name
  - 2 hero cards: Quizlet Mode + Duolingo Mode
  - Stats placeholder (streak, XP, cards)
- [ ] Tạo `pages/Profile/ProfilePage.jsx`:
  - User info từ `GET /api/users/me`
  - Avatar, username, email, role, premium, member since
  - Button "Edit Profile" → `/profile/edit`
- [ ] Tạo `pages/Profile/EditProfilePage.jsx`:
  - Form pre-filled: Username (editable), Avatar URL, Email (read-only)
  - "Save Changes" → `PUT /api/users/me` → success toast
  - "Cancel" → back to `/profile`
- [ ] Tạo `ErrorBoundary/ErrorBoundary.jsx`

**Bước 4: Test end-to-end với staging:**

- [ ] Register → user trong MongoDB Atlas → dashboard
- [ ] Login → redirect dashboard, Navbar hiện username
- [ ] EditProfile → save → Profile hiện username mới
- [ ] Responsive test: mobile, tablet, desktop

**Bước 5: Verify URLs:**

```bash
# Web staging URL
echo https://memoris-staging.vercel.app

# API staging URL  
echo https://api.your-staging-domain.com/api
```

> [!IMPORTANT]
> **SYNC POINT:** Share cả Web staging URL và API staging URL cho Dev C (Android)!

### ✅ Deliverable
Backend: Staging deployed. Web: Home + Profile + EditProfile hoạt động với real data.

---

## 🔄 CI/CD Pipeline

GitHub Actions tự động deploy khi push lên `main`:

### Backend (Render)
- Trigger: push vào `server/**`
- File: `.github/workflows/backend.yml`
- Secrets cần thiết: `RENDER_API_KEY`
- Env vars set trong Render Dashboard (xem DEPLOY.md)

### Frontend (Vercel)
- Trigger: push vào `client/**`
- File: `.github/workflows/frontend.yml`
- Secrets cần thiết: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

### Setup
1. Thêm GitHub Secrets trong repo Settings → Secrets
2. Tạo Render service + set env vars trong Render Dashboard
3. Push code → CI/CD tự chạy

Chi tiết: [DEPLOY.md](./DEPLOY.md)

---

## 📆 NGÀY 6 — Polish + Seeders

### ⚙️ Backend — Seeders + Docs

- [ ] Tạo `seeders/achievements.seeder.js` — 10 achievements mẫu
- [ ] Tạo `seeders/sampleFlashcards.seeder.js` — 1 set với 10 cards
- [ ] Setup `npm run seed` script
- [ ] Tạo `shared/events/eventHandlers.js` — event listeners skeleton
- [ ] Viết `README.md`: how to run, API docs, env vars, project structure
- [ ] Review + fix bugs từ Dev C feedback

### 🌐 Web — UI Polish + Dark Mode

- [ ] Polish auth pages: transitions, focus effects, password toggle, animations
- [ ] Implement dark/light mode:
  ```css
  :root { --bg-primary: #ffffff; --text-primary: #212529; --accent: #6366f1; }
  [data-theme="dark"] { --bg-primary: #1a1a2e; --text-primary: #e2e8f0; --accent: #818cf8; }
  ```
  - Toggle trong Navbar, persist localStorage
- [ ] Tạo reusable components: Modal, SearchBar, Card, Badge
- [ ] Cross-browser test: Chrome, Firefox, Edge
- [ ] Fix responsive issues + console warnings

### ✅ Deliverable
Backend: Seeders + README done. Web: UI polished, dark mode, cross-browser OK.

---

## 📆 NGÀY 7 — Integration Test + Sprint Review

### Tasks
- [ ] **Backend:** Monitor staging logs, verify MongoDB indexes, setup logging
- [ ] **Web E2E test:**
  - [ ] Register → Login → Home hiện username
  - [ ] Refresh → vẫn logged in
  - [ ] Profile + EditProfile → save → data cập nhật
  - [ ] Logout → redirect login
  - [ ] ForgotPassword → success message
  - [ ] Token expired → auto refresh
  - [ ] Mobile responsive OK
- [ ] **Cross-platform test:**
  - [ ] Cùng account login Web + Android → đúng data
  - [ ] EditProfile Web → refresh Android → data mới
- [ ] Performance: bundle size < 500KB, first load < 2s
- [ ] Fix bugs
- [ ] **Sprint Review (30 phút):** demo, list issues, plan tuần 2

### ✅ Deliverable
Backend + Web stable. Auth flow hoàn chỉnh. Sẵn sàng Week 2.

---

## ✅ MILESTONE CHECKLIST

> **Progress:** Ngày 4 ✅ hoàn thành. Còn lại: Ngày 5 → 7

| # | Checkpoint | Type | Status |
|---|---|---|---|
| 1 | Server chạy, MongoDB Atlas + Redis Cloud connected | ⚙️ | ✅ |
| 2 | `POST /api/auth/register` → 201 | ⚙️ | ✅ |
| 3 | `POST /api/auth/login` → 200 | ⚙️ | ✅ |
| 4 | `POST /api/auth/refresh` → 200 | ⚙️ | ✅ |
| 5 | `POST /api/auth/forgot-password` → 200 | ⚙️ | ✅ |
| 6 | `GET /api/users/me` → 200 | ⚙️ | ✅ |
| 7 | `PUT /api/users/me` → 200 | ⚙️ | ✅ |
| 8 | 19 Mongoose models tạo xong | ⚙️ | ✅ |
| 9 | Staging API deployed (VPS/Railway) | ⚙️ | ⬜ |
| 10 | Web: Login → API → dashboard | 🌐 | ✅ |
| 11 | Web: Register → API → dashboard | 🌐 | ✅ |
| 12 | Web: ForgotPassword → send email | 🌐 | ⬜ |
| 13 | Web: EditProfile → save → updated | 🌐 | ⬜ |
| 14 | Web: Token persist sau refresh | 🌐 | ✅ |
| 15 | Web: Home + Profile với real data | 🌐 | ⬜ |
| 16 | Web: Dark/light mode | 🌐 | ⬜ |
| 17 | Web: Responsive + cross-browser | 🌐 | ⬜ |
| 18 | Cross-platform test passed | ALL | ⬜ |

---

## 🔗 API Endpoints (Production/Staging)

```
Base URL: https://api.your-staging-domain.com/api

POST   /auth/register          { email, username, password }
POST   /auth/login             { email, password }
POST   /auth/refresh           { refreshToken }
POST   /auth/logout            (Bearer token)
POST   /auth/forgot-password   { email }
GET    /users/me               (Bearer token)
PUT    /users/me               (Bearer token) + { username?, avatar? }
DELETE /users/me               (Bearer token)
GET    /health
```

**Development (local):**
```
Base URL: http://localhost:5000/api
```
