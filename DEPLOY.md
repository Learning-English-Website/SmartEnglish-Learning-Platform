# CI/CD Deployment Guide

## Overview

This project uses GitHub Actions for continuous deployment:
- **Backend**: Automatically deploys to Render when changes are pushed to `server/`
- **Frontend**: Automatically deploys to Vercel when changes are pushed to `client/`

## Prerequisites

### For Render (Backend)
1. Create account at [render.com](https://render.com)
2. Get Render API Key from Account Settings

### For Vercel (Frontend)
1. Get Vercel token from [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Create a new Vercel project and get Org ID and Project ID

## Setup GitHub Secrets

Go to your GitHub repo → Settings → Secrets and add these secrets:

### Render Secrets
| Secret Name | Value |
|-------------|-------|
| `RENDER_API_KEY` | Your Render API key from Account Settings |

### Backend Environment Variables (set in Render Dashboard)
| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `REDIS_URL` | Your Redis Cloud URL |
| `JWT_ACCESS_SECRET` | Your JWT access token secret |
| `JWT_REFRESH_SECRET` | Your JWT refresh token secret |
| `JWT_ACCESS_EXPIRY` | `15m` |
| `JWT_REFRESH_EXPIRY` | `7d` |
| `SMTP_HOST` | Your SMTP server host |
| `SMTP_PORT` | Your SMTP server port |
| `SMTP_USER` | Your SMTP username |
| `SMTP_PASS` | Your SMTP password |
| `CLIENT_URL` | Frontend URL (e.g., https://your-app.vercel.app) |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | `https://your-backend.onrender.com/api/auth/google/callback` |

### Vercel Secrets
| Secret Name | Value |
|-------------|-------|
| `VERCEL_TOKEN` | Your Vercel API token |
| `VERCEL_ORG_ID` | Your Vercel organization ID |
| `VERCEL_PROJECT_ID` | Your Vercel project ID |
| `VERCEL_PROJECT_NAME` | Your Vercel project name |
| `VITE_API_URL` | Backend API URL (e.g., https://smartenglish-api.onrender.com/api) |

## Manual Deployment

### Deploy Backend Only
```bash
# Push changes to server/
git add server/
git commit -m "Update backend"
git push origin main
```

### Deploy Frontend Only
```bash
# Push changes to client/
git add client/
git commit -m "Update frontend"
git push origin main
```

### Manual Trigger (via GitHub UI)
1. Go to Actions tab in your GitHub repo
2. Select "Deploy Backend" or "Deploy Frontend"
3. Click "Run workflow"
4. Select branch and click "Run workflow"

## Workflows

### backend.yml
- Runs on push to `server/**` or manual trigger
- Steps: checkout → install → test → lint → deploy to Render

### frontend.yml
- Runs on push to `client/**` or manual trigger
- Steps: checkout → install → test → lint → build → deploy to Vercel

## Render Free Tier Notes

- Web service sleeps after 15 minutes of inactivity
- First deploy takes 30-60 seconds
- After sleep, cold start takes ~30 seconds
- 512MB RAM, 0.5 CPU

## URLs

- **Production Backend**: https://smartenglish-api.onrender.com
- **Production Frontend**: https://smartenglish-learning-platform.vercel.app
