# OJT Daily Time Record v2.0

A full-stack Next.js 15 + TypeScript + MongoDB DTR system for OJT interns.

## Stack
- **Framework**: Next.js 15 (App Router, Server Actions)
- **Auth**: NextAuth.js v5 (JWT, Credentials)
- **Database**: MongoDB + Mongoose
- **UI**: Tailwind CSS + shadcn/ui components
- **Hosting**: Vercel-ready

## Features
- ✅ Per-account login & registration
- ✅ Time In / Time Out logging with live PH clock
- ✅ Auto-detects late (> 8:00 AM) and early out (< 5:00 PM)
- ✅ Dashboard with progress bar, stats, recent records
- ✅ 15-day DTR form generation (auto-calculated periods)
- ✅ Override DTR — edit any past record
- ✅ Printable DTR forms with signature fields
- ✅ Dark / light mode
- ✅ Mobile responsive sidebar

## Setup

### 1. Install
```bash
npm install
```

### 2. Environment variables
```bash
cp .env.local.example .env.local
```
Fill in:
```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/ojt-dtr
NEXTAUTH_SECRET=run: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

### 3. (Optional) Seed a demo user
```bash
npm run seed
# Creates: juan@test.com / password123
```

### 4. Run
```bash
npm run dev
# Open http://localhost:3000
```

## Deploy to Vercel
1. Push to GitHub
2. Import in Vercel → New Project
3. Add env vars: `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (your vercel URL)
4. Deploy ✓

## Time Rules
| Event | On Time | Flagged |
|-------|---------|---------|
| Time In | ≤ 8:00 AM | Late if after 8:00 AM |
| Time Out | ≥ 5:00 PM | Early Out if before 5:00 PM |

Hours = (Time Out − Time In) − 1 hour lunch break
