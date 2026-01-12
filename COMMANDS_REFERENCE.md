# GoGetaJob (GGJ) - Commands Reference

Quick reference for all common commands used in GoGetaJob development.

---

## 🐳 Docker Commands

### Start Database
```bash
cd /root/GoGetaJob
docker compose up -d
```

### Check Database Status
```bash
docker compose ps
```

### View Database Logs
```bash
docker compose logs -f postgres
```

### Stop Database
```bash
docker compose down
```

### Stop and Remove All Data (⚠️ Destructive)
```bash
docker compose down -v
```

---

## 📦 Backend Setup

### Install Dependencies
```bash
cd /root/GoGetaJob/backend
npm install
```

### Generate Prisma Client
```bash
cd /root/GoGetaJob/backend
export GGJ_DATABASE_URL="postgresql://ggj_user:dev_password_change_in_prod@localhost:5432/gogetajob?schema=public"
npx prisma generate
```

### Push Database Schema
```bash
cd /root/GoGetaJob/backend
export GGJ_DATABASE_URL="postgresql://ggj_user:dev_password_change_in_prod@localhost:5432/gogetajob?schema=public"
npx prisma db push
```

### Open Prisma Studio (Database GUI)
```bash
cd /root/GoGetaJob/backend
export GGJ_DATABASE_URL="postgresql://ggj_user:dev_password_change_in_prod@localhost:5432/gogetajob?schema=public"
npx prisma studio
```

---

## 🏃 Running the Server

### Development Mode (with hot reload)
```bash
cd /root/GoGetaJob/backend
source ../.env
npm run dev
```

### Build for Production
```bash
cd /root/GoGetaJob/backend
npm run build
```

### Run Production Build
```bash
cd /root/GoGetaJob/backend
source ../.env
npm start
```

---

## 🧪 Testing

### Run All Tests
```bash
cd /root/GoGetaJob/backend
export GGJ_DATABASE_URL="postgresql://ggj_user:dev_password_change_in_prod@localhost:5432/gogetajob?schema=public"
npm test
```

### Run Tests in Watch Mode
```bash
cd /root/GoGetaJob/backend
export GGJ_DATABASE_URL="postgresql://ggj_user:dev_password_change_in_prod@localhost:5432/gogetajob?schema=public"
npm run test:watch
```

---

## 🔧 Environment Setup

### Create .env File
```bash
cd /root/GoGetaJob
cp .env.example .env
# Then edit .env with your values
```

### Generate Secure JWT Secrets
```bash
# Using OpenSSL
openssl rand -base64 48

# Using Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

---

## 🌐 API Testing (curl commands)

### Health Check
```bash
curl http://localhost:3000/health
```

### Register User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

### Get Current User
```bash
# Replace TOKEN with your access token
curl http://localhost:3000/me \
  -H "Authorization: Bearer TOKEN"
```

### Create Job Application
```bash
curl -X POST http://localhost:3000/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "company": "TechCorp",
    "position": "Backend Developer",
    "link": "https://techcorp.com/jobs/123",
    "status": "APPLIED",
    "notes": "Great opportunity"
  }'
```

### List Applications
```bash
# All applications
curl http://localhost:3000/applications \
  -H "Authorization: Bearer TOKEN"

# With filters
curl "http://localhost:3000/applications?status=APPLIED&q=Tech&page=1&pageSize=10" \
  -H "Authorization: Bearer TOKEN"
```

### Get Single Application
```bash
curl http://localhost:3000/applications/APPLICATION_ID \
  -H "Authorization: Bearer TOKEN"
```

### Update Application
```bash
curl -X PATCH http://localhost:3000/applications/APPLICATION_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "status": "INTERVIEW",
    "notes": "Phone screen scheduled"
  }'
```

### Delete Application
```bash
curl -X DELETE http://localhost:3000/applications/APPLICATION_ID \
  -H "Authorization: Bearer TOKEN"
```

---

## 🛠️ Troubleshooting

### Kill All Node/TSX Processes
```bash
pkill -9 node
pkill -9 tsx
```

### Check What's Running on Port 3000
```bash
lsof -i :3000
```

### Kill Process on Port 3000
```bash
lsof -ti:3000 | xargs kill -9
```

### Reset Database (⚠️ Destructive)
```bash
docker compose down -v
docker compose up -d
sleep 5
cd backend
export GGJ_DATABASE_URL="postgresql://ggj_user:dev_password_change_in_prod@localhost:5432/gogetajob?schema=public"
npx prisma db push
```

---

## 📊 Useful Commands

### Count Lines of Code
```bash
cd /root/GoGetaJob/backend/src
find . -name "*.ts" | xargs wc -l
```

### View Server Logs (if running in background)
```bash
tail -f /tmp/ggj-dev.log
```

### Check Database Tables
```bash
docker exec -it ggj-postgres psql -U ggj_user -d gogetajob -c "\dt"
```

### View Table Schema
```bash
docker exec -it ggj-postgres psql -U ggj_user -d gogetajob -c "\d job_applications"
```

### Count Records in Tables
```bash
docker exec -it ggj-postgres psql -U ggj_user -d gogetajob -c "SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM job_applications) as applications,
  (SELECT COUNT(*) FROM refresh_tokens) as tokens;"
```

---

## 🚀 Complete Startup Sequence

From a fresh state to running server:

```bash
# 1. Start database
cd /root/GoGetaJob
docker compose up -d

# 2. Install dependencies (if not already done)
cd backend
npm install

# 3. Setup database
export GGJ_DATABASE_URL="postgresql://ggj_user:dev_password_change_in_prod@localhost:5432/gogetajob?schema=public"
npx prisma generate
npx prisma db push

# 4. Start server
source ../.env
npm run dev
```

**Server will be running at:** `http://localhost:3000`

---

## 📝 Git Commands (for version control)

### Initial Commit
```bash
cd /root/GoGetaJob
git init
git add .
git commit -m "feat: Phase 0-1 and 2A complete - Auth + Job Applications"
```

### Create .gitignore
Already created with:
- .env files
- node_modules
- dist/build folders
- logs
- IDE configs

---

**GoGetaJob (GGJ)** - Quick Command Reference
