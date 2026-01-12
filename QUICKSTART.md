# GoGetaJob (GGJ) - Quick Start Guide

This guide provides the **exact commands** to get your GoGetaJob backend up and running.

---

## 🚀 From Zero to Running (5 minutes)

### Step 1: Start the Database (2 minutes)

```bash
# Navigate to project root
cd /root/GoGetaJob

# Start PostgreSQL in Docker
docker compose up -d

# Verify database is running (should show "healthy")
docker compose ps
```

**Expected output:**
```
NAME           IMAGE                COMMAND                  SERVICE    CREATED         STATUS                   PORTS
ggj-postgres   postgres:16-alpine   "docker-entrypoint.s…"   postgres   X minutes ago   Up X minutes (healthy)   0.0.0.0:5432->5432/tcp
```

---

### Step 2: Setup Backend (2 minutes)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Push database schema
npx prisma db push
```

**Expected output for db push:**
```
✔ Generated Prisma Client to ./node_modules/@prisma/client
🚀 Your database is now in sync with your Prisma schema. Done in XXXms
```

---

### Step 3: Start Development Server (30 seconds)

```bash
# Make sure you're in the backend directory
cd /root/GoGetaJob/backend

# Start the development server
npm run dev
```

**Expected output:**
```
[INFO]: ✅ Security plugins loaded
[INFO]: ✅ Database connected
[INFO]: Server listening at http://127.0.0.1:3000
[INFO]: Server listening at http://172.26.70.0:3000
[INFO]: 
╔═══════════════════════════════════════════════════╗
║                                                   ║
║         🚀 GoGetaJob (GGJ) Backend API           ║
║                                                   ║
║  Environment: development                         ║
║  Server:      http://0.0.0.0:3000                        ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
```

---

### Step 4: Test It's Working (30 seconds)

Open a **new terminal** and run:

```bash
# Health check
curl http://localhost:3000/health
```

**Expected output:**
```json
{"ok":true,"app":"GoGetaJob","short":"GGJ","timestamp":"2026-01-12T10:19:45.123Z"}
```

**🎉 Success! Your backend is now running.**

---

## 🧪 Run Tests

```bash
cd /root/GoGetaJob/backend
npm test
```

**Expected output:**
```
✓ tests/auth.test.ts (9 tests) 376ms

Test Files  1 passed (1)
     Tests  9 passed (9)
```

---

## 📡 Try the API

### Register a User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "SecurePass123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "SecurePass123"
  }'
```

**Response includes:**
- `accessToken` - Use this for authenticated requests
- `refreshToken` - Use this to get new access tokens

### Get Current User (Protected Endpoint)

```bash
# Replace YOUR_ACCESS_TOKEN with the token from login/register
curl http://localhost:3000/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🛑 Stop Everything

```bash
# Stop backend server (Ctrl+C in the terminal running npm run dev)

# Stop database
cd /root/GoGetaJob
docker compose down

# (Optional) Remove database data
docker compose down -v
```

---

## 🔧 Troubleshooting

### Database connection error

**Problem:** `Error: P1001: Can't reach database server`

**Solution:**
```bash
# Check if Postgres is running
docker compose ps

# If not running, start it
docker compose up -d

# Wait for healthy status
docker compose ps
```

### Port 3000 already in use

**Problem:** `Error: listen EADDRINUSE: address already in use 0.0.0.0:3000`

**Solution:**
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or change the port in .env
# Edit GGJ_PORT=3001
```

### Missing environment variables

**Problem:** `Environment variable not found: GGJ_DATABASE_URL`

**Solution:**
```bash
# Make sure .env exists in project root
cd /root/GoGetaJob
ls -la .env

# If missing, copy from example
cp .env.example .env
```

---

## 📚 Next Steps

1. Read the full [README.md](README.md) for API documentation
2. Check [PROJECT_STATUS.md](PROJECT_STATUS.md) for roadmap
3. Explore the codebase structure
4. Start building your frontend or additional features!

---

**GoGetaJob (GGJ)** - Your job tracking journey starts here! 🚀

