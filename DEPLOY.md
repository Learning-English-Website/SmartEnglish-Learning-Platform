# CI/CD Deployment Guide

## Overview

This project uses GitHub Actions for automatic CI/CD deployment.

### Frontend
- Deploy platform: Vercel
- Source folder: `client/`
- Auto deploys whenever code is pushed to:
  ```bash
  client/**
  ```

### Backend
- Deploy platform: Render
- Source folder: `server/`
- Auto deploys whenever code is pushed to:
  ```bash
  server/**
  ```

---

# Project Architecture

```text
root/
├── client/                 # Frontend (React + Vite)
├── server/                 # Backend (Node.js + Express)
├── .github/
│   └── workflows/
│       ├── frontend.yml
│       └── backend.yml
```

---

# Prerequisites

## Required Accounts

### Frontend
- GitHub account
- Vercel account

### Backend
- Render account
- MongoDB Atlas account
- Redis Cloud account

---

# 1. Setup Frontend (Vercel)

## Step 1 — Import GitHub Repository

Go to:

```text
https://vercel.com
```

Then:

```text
Add New
→ Project
→ Import Git Repository
```

Select repository:

```text
SmartEnglish-Learning-Platform
```

---

## Step 2 — Configure Project

### Framework Preset

```text
Vite
```

### Root Directory

```text
client
```

### Build Command

```bash
npm run build
```

### Output Directory

```text
dist
```

---

## Step 3 — Add Environment Variables

Inside Vercel:

```text
Project
→ Settings
→ Environment Variables
```

Add:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://smartenglish-api-1iby.onrender.com/api` |

---

## Step 4 — Deploy

Click:

```text
Deploy
```

After deployment, frontend URL will look like:

```text
https://smart-english-learning-platform.vercel.app
```

---

# 2. Setup Backend (Render)

## Step 1 — Create Blueprint Deployment

Go to:

```text
https://dashboard.render.com
```

Then:

```text
New +
→ Blueprint
```

Select repository:

```text
SmartEnglish-Learning-Platform
```

---

## Step 2 — Configure Blueprint

### Blueprint Name

```text
smartenglish-api
```

### Branch

```text
dev
```

(or `main` for production)

### Blueprint Path

```text
server/render.yaml
```

---

## Step 3 — Create New Service

Select:

```text
Create all as new services
```

Then click:

```text
Deploy Blueprint
```

---

## Step 4 — Configure Environment Variables

Inside Render:

```text
Service
→ Environment
```

Add:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `REDIS_URL` | Redis Cloud URL |
| `JWT_ACCESS_SECRET` | `dev_access_secret_memoris_2024` |
| `JWT_REFRESH_SECRET` | `dev_refresh_secret_memoris_2024` |
| `CLIENT_URL` | `https://smart-english-learning-platform.vercel.app` |

---

## Optional Variables

### Google OAuth

| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |

### SMTP

| Variable | Value |
|---|---|
| `SMTP_HOST` | smtp.gmail.com |
| `SMTP_PORT` | 587 |
| `SMTP_USER` | Your Gmail |
| `SMTP_PASS` | Gmail App Password |

---

# 3. MongoDB Atlas Configuration

## Fix Atlas IP Whitelist

Render servers must be allowed to access MongoDB Atlas.

Go to:

```text
MongoDB Atlas
→ Security
→ Network Access
```

Click:

```text
Add IP Address
```

Add:

```text
0.0.0.0/0
```

This allows Render cloud servers to connect.

---

# 4. Setup GitHub Secrets

Go to:

```text
GitHub Repository
→ Settings
→ Secrets and variables
→ Actions
```

---

## Render Secret

| Secret | Value |
|---|---|
| `RENDER_API_KEY` | Render API Key |

Create API key at:

```text
Render
→ Account Settings
→ API Keys
```

---

## Vercel Secrets

| Secret | Value |
|---|---|
| `VERCEL_TOKEN` | Vercel token |
| `VERCEL_ORG_ID` | Team ID |
| `VERCEL_PROJECT_ID` | Project ID |
| `VERCEL_PROJECT_NAME` | Vercel project name |
| `VITE_API_URL` | `https://smartenglish-api-1iby.onrender.com/api` |

---

# 5. GitHub Actions Workflows

## frontend.yml

Location:

```text
.github/workflows/frontend.yml
```

### Features
- Runs automatically on frontend changes
- Installs dependencies
- Runs tests
- Builds Vite project
- Deploys to Vercel

Triggered when:

```text
client/**
```

changes are pushed.

---

## backend.yml

Location:

```text
.github/workflows/backend.yml
```

### Features
- Runs automatically on backend changes
- Installs dependencies
- Runs tests
- Deploys backend to Render

Triggered when:

```text
server/**
```

changes are pushed.

---

# 6. Manual Deployment

## Deploy Frontend

```bash
git add client/
git commit -m "update frontend"
git push
```

---

## Deploy Backend

```bash
git add server/
git commit -m "update backend"
git push
```

---

# 7. Check Deployment Status

## GitHub Actions

Go to:

```text
GitHub Repository
→ Actions
```

You should see:

```text
Deploy Frontend
Deploy Backend
```

with green success status.

---

# 8. Production URLs

## Frontend

```text
https://smart-english-learning-platform.vercel.app
```

## Backend

```text
https://smartenglish-api-1iby.onrender.com
```

## Health Check

```text
https://smartenglish-api-1iby.onrender.com/api/health
```

---

# 9. Render Free Tier Notes

- Render free services sleep after inactivity
- First request after sleeping may take 30–60 seconds
- Free plan resources:
  - 512MB RAM
  - 0.5 CPU

---

# 10. Final CI/CD Flow

```text
git push
    ↓
GitHub Actions
    ↓
Frontend → Vercel Deploy
Backend → Render Deploy
    ↓
Production Updated Automatically
```
