# GoGetaJob (GGJ) - Full Stack Quick Start

Get the complete application running in under 5 minutes! 🚀

---

## 🎯 What You're Building

A production-ready job application tracker with:
- ✅ Secure authentication (JWT + refresh tokens)
- ✅ Full CRUD for job applications
- ✅ Search, filter, sort, and pagination
- ✅ Dark theme UI with pink gradient accents
- ✅ Real-time updates and notifications

---

## ⚡ Quick Start (Development)

### Step 1: Prerequisites
```bash
# Verify installations
node --version    # Should be v20+
docker --version  # Required for PostgreSQL
```

### Step 2: Start Database
```bash
cd /root/GoGetaJob
docker compose up -d
```

**Verify:**
```bash
docker compose ps
# ✅ ggj-postgres should show "healthy"
```

### Step 3: Setup Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

**Test Backend:**
```bash
curl http://localhost:3000/health
# ✅ Should return: {"ok":true,"app":"GoGetaJob","short":"GGJ",...}
```

### Step 4: Setup Frontend
Open a **new terminal**:

```bash
cd /root/GoGetaJob/frontend
npm install
npm run dev
```

**✅ Done!** Open http://localhost:3001 in your browser.

---

## 🧪 Test the Full Stack

### 1. Register & Login
1. Visit http://localhost:3001
2. Click "Sign up"
3. Email: `yourname@example.com`
4. Password: `TestPass123` (must have uppercase, lowercase, number)
5. Click "Create account"
6. ✅ You'll see a success toast and be redirected to dashboard

### 2. Create Your First Application
1. Click "Applications" in the sidebar
2. Click "New Application" (+ button)
3. Fill in the form:
   - **Company:** TechCorp
   - **Position:** Senior Developer
   - **Link:** https://techcorp.com/jobs/123
   - **Status:** APPLIED
   - **Applied Date:** Today's date
   - **Notes:** "Applied via LinkedIn. Looks promising!"
4. Click "Create Application"
5. ✅ Toast appears: "Application created successfully!"
6. ✅ Redirected to applications list

### 3. Try Advanced Features
- **Search:** Type "Tech" in the search box → filters to matching companies
- **Filter by Status:** Click "APPLIED" → shows only applied jobs
- **Sort:** Change "Last Updated" to "Date Created" → reorders list
- **View Notes:** Click the eye icon → modal shows full notes
- **Edit:** Click the pencil icon → update status to "INTERVIEW"
- **Delete:** Click trash icon → confirmation dialog → deletes application

### 4. Test Authentication
- Open a new private/incognito window
- Visit http://localhost:3001/applications
- ✅ You should be redirected to `/login` (route protection works!)

---

## 🔑 Environment Variables

### Backend (`.env`)
Located at `/root/GoGetaJob/.env` (already configured):

```env
GGJ_PORT=3000
GGJ_DATABASE_URL=postgresql://ggj_user:dev_password_change_in_prod@localhost:5432/gogetajob?schema=public
GGJ_JWT_ACCESS_SECRET=dev_access_secret_min_32_chars_long_change_me_in_production
GGJ_JWT_REFRESH_SECRET=dev_refresh_secret_min_32_chars_long_change_me_in_production
GGJ_CORS_ORIGINS=http://localhost:3001,http://localhost:3000
```

### Frontend (`.env.local`)
Located at `/root/GoGetaJob/frontend/.env.local`:

```env
NEXT_PUBLIC_GGJ_API_URL=http://localhost:3000
```

---

## 🛠️ Troubleshooting

### Backend won't start
```bash
# Check if database is running
docker compose ps

# Restart database
docker compose restart

# Check logs
docker compose logs ggj-postgres
```

### Frontend can't connect to backend
```bash
# 1. Verify backend is running
curl http://localhost:3000/health

# 2. Check CORS is configured
cat /root/GoGetaJob/.env | grep CORS
# Should include: http://localhost:3001

# 3. Hard refresh browser
# Press Ctrl+Shift+R (or Cmd+Shift+R on Mac)
```

### Database connection errors
```bash
# Reset database
cd /root/GoGetaJob/backend
npx prisma db push --force-reset

# This will:
# - Drop all tables
# - Recreate schema
# - You'll need to register a new user
```

### Port conflicts
```bash
# Backend port 3000 in use
lsof -ti:3000 | xargs kill -9

# Frontend port 3001 in use
lsof -ti:3001 | xargs kill -9
```

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                    │
│              http://localhost:3001                      │
│  ┌────────────────────────────────────────────────┐    │
│  │  Next.js 15 Frontend (React 19)                │    │
│  │  - Login/Register pages                        │    │
│  │  - Applications list with filters              │    │
│  │  - Create/Edit forms                           │    │
│  │  - Toast notifications                         │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                         ↓ HTTP/REST
┌─────────────────────────────────────────────────────────┐
│                  Backend API Server                     │
│              http://localhost:3000                      │
│  ┌────────────────────────────────────────────────┐    │
│  │  Fastify + TypeScript                          │    │
│  │  - JWT Authentication (access + refresh)       │    │
│  │  - /auth/* endpoints (register, login, me)     │    │
│  │  - /applications/* (CRUD with filters)         │    │
│  │  - Zod validation                              │    │
│  │  - Rate limiting                               │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                         ↓ SQL
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL 16 (Docker)                     │
│              localhost:5432                             │
│  ┌────────────────────────────────────────────────┐    │
│  │  Tables:                                       │    │
│  │  - users (id, email, passwordHash)             │    │
│  │  - refresh_tokens (id, tokenHash, userId)      │    │
│  │  - job_applications (company, position, ...)   │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Tech Stack

### Backend
- **Runtime:** Node.js 20
- **Framework:** Fastify (fast, low overhead)
- **Language:** TypeScript
- **Database:** PostgreSQL 16
- **ORM:** Prisma
- **Auth:** JWT (access + refresh tokens)
- **Validation:** Zod
- **Password Hashing:** Argon2
- **Testing:** Vitest

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **UI Components:** Custom (Button, Card, Badge, Modal, Toast)
- **Icons:** Lucide React
- **State:** React hooks (useState, useEffect)
- **Routing:** Next.js App Router with client-side protection

---

## 📚 API Endpoints

### Authentication (Public)
- `POST /auth/register` - Create new account
- `POST /auth/login` - Login and get tokens
- `POST /auth/refresh` - Refresh access token

### User (Protected)
- `GET /me` - Get current user info

### Applications (Protected)
- `GET /applications` - List with filters/search/sort/pagination
- `POST /applications` - Create new application
- `GET /applications/:id` - Get single application
- `PATCH /applications/:id` - Update application
- `DELETE /applications/:id` - Delete application

### Health Check
- `GET /health` - Server health status

---

## 🚀 Next Steps

Now that you have a working full-stack app, consider:

1. **Deploy to Production**
   - Set up a VPS (DigitalOcean, AWS, etc.)
   - Configure Nginx as reverse proxy
   - Use environment-specific configs
   - Set up SSL with Let's Encrypt

2. **Add More Features**
   - User profile management
   - Email verification
   - Password reset
   - Dashboard analytics with charts
   - Application reminders

3. **Enhance Security**
   - Move tokens to httpOnly cookies
   - Add CSRF protection
   - Implement rate limiting per user
   - Add session management

4. **Improve UX**
   - Add loading skeletons
   - Implement optimistic updates
   - Add keyboard shortcuts
   - Dark/light theme toggle

---

## 📖 Documentation

- **README.md** - Main project documentation
- **PROJECT_STATUS.md** - Phase completion tracking
- **INTEGRATION_COMPLETE.md** - Detailed integration guide
- **QUICKSTART.md** - Backend-only quick start (Phase 0-1)
- **PHASE_2A_COMPLETE.md** - Job applications API guide

---

**Happy coding!** 🎉

Built with ❤️ as a production-ready foundation for job application tracking.
