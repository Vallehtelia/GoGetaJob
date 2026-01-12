# GoGetaJob (GGJ)

A modern, production-ready job application tracking system with a secure TypeScript backend and sleek dark-themed frontend.

## 🚀 Features (Phases 0-1, 2A, 2B, 3, 3C & 4A - Master Library)

### Backend
- ✅ **Secure Authentication** - JWT access + refresh token flow with Argon2 password hashing
- ✅ **User Profile** - Complete profile management with LinkedIn, GitHub, website links
- ✅ **Job Applications** - Full CRUD with search, filters, and pagination
- ✅ **Experience Library** - Master library for work, education, skills, and projects
- ✅ **CV Management** - Reusable CV builder with selection-based UI
- ✅ **Database** - PostgreSQL with Prisma ORM (12 tables, 20+ indexes)
- ✅ **Type Safety** - Full TypeScript implementation
- ✅ **Security** - Rate limiting, secure headers, input validation with Zod
- ✅ **User Isolation** - All data properly scoped to authenticated users
- ✅ **Dockerized** - Docker Compose for easy local development
- ✅ **Testing** - Comprehensive test suite (77 tests passing)
- ✅ **Environment-Driven** - All config from `.env` with `GGJ_` prefix

### Frontend
- ✅ **Modern UI** - Next.js 15 with App Router and React 19
- ✅ **Dark Theme** - Sleek navy blue theme with pink gradient accents
- ✅ **Responsive Design** - Mobile-first, works on all devices
- ✅ **Collapsible Sidebar** - Smooth animations and active state highlighting
- ✅ **Component Library** - Custom UI components (Button, Card, Badge, Modal, Toast, Textarea)
- ✅ **Full Auth Flow** - Login, Register with token management
- ✅ **Route Protection** - Auto-redirect to login for protected pages
- ✅ **API Integration** - Complete backend connectivity with auto token refresh
- ✅ **Real-time CRUD** - Create, Read, Update, Delete job applications
- ✅ **Advanced Filtering** - Search, multi-status filter, sorting, pagination
- ✅ **Profile Settings** - Edit personal info, headline, summary, social links
- ✅ **Experience Library** - Master library for reusable work, education, skills, projects
- ✅ **CV Builder** - Selection-based CV editor with live preview (Template v1: Clean Navy)
- ✅ **Smart CV Creation** - Add experiences once, reuse in multiple CVs
- ✅ **Toast Notifications** - Success/error feedback for all actions

## 📋 Prerequisites

- Node.js 20+ (LTS recommended)
- Docker & Docker Compose
- npm or yarn

## 🏗️ Setup Instructions

### Backend Setup

#### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

**IMPORTANT:** Edit `.env` and update the following:
- `GGJ_JWT_ACCESS_SECRET` - At least 32 random characters
- `GGJ_JWT_REFRESH_SECRET` - At least 32 random characters (different from access)
- `GGJ_DB_PASSWORD` - Strong database password

**Generate secure secrets:**
```bash
# On Linux/Mac:
openssl rand -base64 48

# Or use Node:
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### 3. Start Database

From the project root:

```bash
docker compose up -d
```

Verify Postgres is running:
```bash
docker compose ps
```

### 4. Initialize Database

From the `backend` directory:

```bash
cd backend
npx prisma generate
npx prisma db push
```

### 5. Start Backend Development Server

```bash
npm run dev
```

You should see:
```
╔═══════════════════════════════════════════════════╗
║         🚀 GoGetaJob (GGJ) Backend API           ║
║  Environment: development                         ║
║  Server:      http://0.0.0.0:3000                ║
╚═══════════════════════════════════════════════════╝
```

### Frontend Setup

#### 1. Install Frontend Dependencies

```bash
cd /root/GoGetaJob/frontend
npm install
```

#### 2. Configure Frontend Environment

Create `.env.local`:

```bash
cp .env.local.example .env.local
```

The default configuration points to `http://localhost:3000` for the backend API:

```env
NEXT_PUBLIC_GGJ_API_URL=http://localhost:3000
```

#### 3. Start Frontend Development Server

```bash
npm run dev
```

The frontend will be available at: **http://localhost:3001**

**✅ Frontend is now fully connected to the backend!** You can register, login, and manage job applications end-to-end.

You should see:
```
✓ Ready in 1655ms
  ▲ Next.js 15.5.9
  - Local:        http://localhost:3001
```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

## 📡 API Endpoints

### Health Check (Public)
```http
GET /health
```

**Response:**
```json
{
  "ok": true,
  "app": "GoGetaJob",
  "short": "GGJ",
  "timestamp": "2026-01-12T..."
}
```

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2026-01-12T..."
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "abc123..."
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": { ... },
  "accessToken": "eyJhbGc...",
  "refreshToken": "abc123..."
}
```

### Get Current User (Protected)
```http
GET /me
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2026-01-12T...",
    "updatedAt": "2026-01-12T..."
  }
}
```

### Refresh Tokens
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "abc123..."
}
```

**Response (200):**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGc...",
  "refreshToken": "xyz789..."
}
```

**Note:** Refresh tokens are **single-use**. After refreshing, the old token is revoked and a new one is issued.

---

## 📋 Job Applications API

All job application endpoints require authentication. Include the access token in the `Authorization` header.

### Create Application
```http
POST /applications
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "company": "TechCorp",
  "position": "Software Engineer",
  "link": "https://techcorp.com/jobs/123",
  "status": "APPLIED",
  "appliedAt": "2026-01-12T10:00:00Z",
  "notes": "Great opportunity with good benefits"
}
```

**Field Details:**
- `company` (required): Company name (max 200 chars)
- `position` (required): Job position (max 200 chars)
- `link` (optional): URL to job posting (must be valid URL)
- `status` (optional): `DRAFT`, `APPLIED`, `INTERVIEW`, `OFFER`, `REJECTED` (default: `APPLIED`)
- `appliedAt` (optional): ISO 8601 datetime
- `lastContactAt` (optional): ISO 8601 datetime
- `notes` (optional): Additional notes (max 10,000 chars)

**Response (201):**
```json
{
  "message": "Application created successfully",
  "application": {
    "id": "uuid",
    "userId": "uuid",
    "company": "TechCorp",
    "position": "Software Engineer",
    "link": "https://techcorp.com/jobs/123",
    "status": "APPLIED",
    "appliedAt": "2026-01-12T10:00:00.000Z",
    "lastContactAt": null,
    "notes": "Great opportunity with good benefits",
    "createdAt": "2026-01-12T10:00:00.000Z",
    "updatedAt": "2026-01-12T10:00:00.000Z"
  }
}
```

### List Applications (with filters & pagination)
```http
GET /applications?status=APPLIED,INTERVIEW&q=Tech&sort=createdAt&order=desc&page=1&pageSize=20
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `status` (optional): Filter by status (comma-separated for multiple)
- `q` (optional): Search company or position (case-insensitive)
- `sort` (optional): Sort by `createdAt`, `updatedAt`, or `appliedAt` (default: `createdAt`)
- `order` (optional): `asc` or `desc` (default: `desc`)
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20, max: 100)

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
      "company": "TechCorp",
      "position": "Software Engineer",
      "status": "APPLIED",
      ...
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 42,
  "totalPages": 3
}
```

### Get Application by ID
```http
GET /applications/:id
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "application": {
    "id": "uuid",
    "userId": "uuid",
    "company": "TechCorp",
    ...
  }
}
```

### Update Application
```http
PATCH /applications/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "status": "INTERVIEW",
  "lastContactAt": "2026-01-15T14:30:00Z",
  "notes": "Phone screen scheduled for next week"
}
```

All fields are optional. Only provided fields will be updated.

**Response (200):**
```json
{
  "message": "Application updated successfully",
  "application": {
    ...updated application...
  }
}
```

### Delete Application
```http
DELETE /applications/:id
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Application deleted successfully"
}
```

## 🔐 Security Notes

### Token Flow
1. **Access Token** - Short-lived (15 minutes default), used for API requests
2. **Refresh Token** - Long-lived (7 days default), stored hashed in database
3. Refresh tokens are single-use and revoked after creating new tokens
4. All refresh tokens can be revoked per-user for security

### Token Storage
- **Refresh tokens** are returned in the response body (consider httpOnly cookies for production frontend)
- Store refresh tokens securely on the client (httpOnly cookies recommended)
- Never log or expose tokens in error messages

### Rate Limiting
- Auth endpoints (`/auth/*`) are rate-limited to 5 requests per 15 minutes per IP
- Adjust `GGJ_RATE_LIMIT_MAX` and `GGJ_RATE_LIMIT_WINDOW` in `.env` as needed

---

## 📚 Experience Library API

All library endpoints require authentication. The library is where you store your master data (work experiences, education, skills, projects) that can be reused across multiple CVs.

### Work Experience Library

**List Work Experiences:**
```http
GET /profile/library/work
Authorization: Bearer <accessToken>
```

**Create Work Experience:**
```http
POST /profile/library/work
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "company": "TechCorp",
  "role": "Senior Software Engineer",
  "location": "San Francisco, CA",
  "startDate": "2020-01-01",
  "endDate": "2023-12-31",
  "isCurrent": false,
  "description": "Led development of cloud infrastructure"
}
```

**Update/Delete Work Experience:**
```http
PATCH /profile/library/work/:id
DELETE /profile/library/work/:id
```

**Same pattern applies to:**
- `/profile/library/education` - School, degree, field, dates, description
- `/profile/library/skills` - Name, level (BEGINNER|INTERMEDIATE|ADVANCED|EXPERT), category
- `/profile/library/projects` - Name, description, link, tech array

---

## 📄 CV Management API

All CV endpoints require authentication. CVs select which library items to include.

### List CVs
```http
GET /cv
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Software Engineer CV",
      "isDefault": true,
      "template": "CLEAN_NAVY",
      "updatedAt": "2026-01-12T10:00:00.000Z"
    }
  ]
}
```

### Create CV
```http
POST /cv
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "title": "My CV",
  "template": "CLEAN_NAVY"
}
```

**Response (201):**
```json
{
  "message": "CV created successfully",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "My CV",
    "isDefault": false,
    "template": "CLEAN_NAVY",
    "createdAt": "2026-01-12T10:00:00.000Z",
    "updatedAt": "2026-01-12T10:00:00.000Z"
  }
}
```

### Get CV with All Included Items
```http
GET /cv/:id
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "title": "My CV",
    "isDefault": true,
    "template": "CLEAN_NAVY",
    "workExperiences": [
      {
        "id": "work-uuid",
        "inclusionId": "inclusion-uuid",
        "company": "TechCorp",
        "role": "Engineer",
        "order": 0,
        ...
      }
    ],
    "educations": [...],
    "skills": [...],
    "projects": [...]
  }
}
```
Note: Items include `inclusionId` and `order` when part of a CV.

### Update CV
```http
PATCH /cv/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "title": "Updated Title",
  "isDefault": true
}
```

### Delete CV
```http
DELETE /cv/:id
Authorization: Bearer <accessToken>
```

### CV Inclusion Endpoints

Add library items to a CV by selecting them:

**Add Work Experience to CV:**
```http
POST /cv/:id/work
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "itemId": "work-experience-uuid",
  "order": 0
}
```

**Remove from CV:**
```http
DELETE /cv/:id/work/:itemId
```

**Update Order in CV:**
```http
PATCH /cv/:id/work/:itemId
Content-Type: application/json

{
  "order": 1
}
```

**Same pattern for:**
- `/cv/:id/education/:itemId?` - Add/remove/reorder education
- `/cv/:id/skills/:itemId?` - Add/remove/reorder skills
- `/cv/:id/projects/:itemId?` - Add/remove/reorder projects

**Key Features:**
- ✅ Add library items to CV by ID
- ✅ Each CV has independent ordering
- ✅ Cannot add same item twice to same CV
- ✅ Removing from CV doesn't delete from library
- ✅ Deleting library item removes from all CVs (cascade)

---

## 🐳 Docker Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f postgres

# Restart database
docker compose restart postgres

# Remove volumes (⚠️ deletes all data)
docker compose down -v
```

## 🛠️ Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm start            # Start production server
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run prisma:generate   # Generate Prisma Client
npm run prisma:migrate    # Run migrations (dev)
npm run prisma:push       # Push schema to DB (no migration)
npm run prisma:studio     # Open Prisma Studio
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── app.ts              # Fastify app setup
│   ├── server.ts           # Server entry point
│   ├── config/
│   │   └── index.ts        # Environment config & validation
│   ├── plugins/
│   │   ├── auth.ts         # JWT authentication plugin
│   │   ├── prisma.ts       # Database plugin
│   │   └── security.ts     # Security plugins (helmet, cors, rate-limit)
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── routes.ts   # Auth endpoints
│   │   │   └── schemas.ts  # Zod validation schemas
│   │   └── health/
│   │       └── routes.ts   # Health check
│   └── utils/
│       ├── password.ts     # Argon2 password hashing
│       └── tokens.ts       # JWT & refresh token utilities
├── prisma/
│   └── schema.prisma       # Database schema
├── tests/
│   └── auth.test.ts        # Auth flow integration tests
├── package.json
├── tsconfig.json
└── Dockerfile
```

## 🌐 Production Deployment

### Environment Variables for Production

Update `.env` with production values:
- Set `GGJ_NODE_ENV=production`
- Use strong, unique secrets (at least 48 characters)
- Update `GGJ_DB_HOST` to your production database host
- Configure `GGJ_CORS_ORIGINS` with your frontend domains
- Update `GGJ_HOST` to `0.0.0.0` or specific IP

### Build & Run

```bash
npm run build
npm start
```

### Docker Production

```bash
docker build -t ggj-backend .
docker run -p 3000:3000 --env-file .env ggj-backend
```

### Behind Nginx

Configure Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔮 Next Steps (Roadmap)

See [PROJECT_STATUS.md](../PROJECT_STATUS.md) for the current status and upcoming features.

## 📄 License

MIT

---

**GoGetaJob (GGJ)** - Built with ❤️ using TypeScript, Fastify, and Prisma


