# Environment Variables Setup Guide

Complete reference for all environment variables used in GoGetaJob (GGJ).

---

## 📋 Backend Environment Variables

### Location
`/root/GoGetaJob/.env`

### Required Variables

```env
# Application
GGJ_NODE_ENV=development
GGJ_PORT=3000
GGJ_HOST=0.0.0.0

# Database
GGJ_DB_NAME=gogetajob
GGJ_DB_USER=ggj_user
GGJ_DB_PASSWORD=dev_password_change_in_prod
GGJ_DB_HOST=localhost
GGJ_DB_PORT=5432
GGJ_DATABASE_URL=postgresql://ggj_user:dev_password_change_in_prod@localhost:5432/gogetajob?schema=public

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
GGJ_JWT_ACCESS_SECRET=dev_access_secret_min_32_chars_long_change_me_in_production
GGJ_JWT_REFRESH_SECRET=dev_refresh_secret_min_32_chars_long_change_me_in_production
GGJ_JWT_ACCESS_EXPIRES_IN=15m
GGJ_JWT_REFRESH_EXPIRES_IN=7d

# Security
GGJ_BCRYPT_ROUNDS=12
GGJ_RATE_LIMIT_MAX=5
GGJ_RATE_LIMIT_WINDOW=60000

# CORS (comma-separated origins)
GGJ_CORS_ORIGINS=http://localhost:3001,http://localhost:3000,http://localhost:5173
```

---

## 🎨 Frontend Environment Variables

### Location
`/root/GoGetaJob/frontend/.env.local`

### Required Variables

```env
# Backend API URL
NEXT_PUBLIC_GGJ_API_URL=http://localhost:3000
```

---

## 🔐 Security Best Practices

### Development
- ✅ Use the provided default values for quick setup
- ✅ Secrets are in `.env` (already gitignored)
- ⚠️ Never commit `.env` files to version control

### Production
**CRITICAL:** Change these before deploying:

1. **JWT Secrets** - Generate strong, random secrets:
   ```bash
   openssl rand -base64 48
   ```

2. **Database Password** - Use a strong, unique password:
   ```bash
   openssl rand -base64 32
   ```

3. **CORS Origins** - Update to match your domains:
   ```env
   GGJ_CORS_ORIGINS=https://app.yourdomain.com,https://yourdomain.com
   ```

4. **API URL (Frontend)** - Point to production backend:
   ```env
   NEXT_PUBLIC_GGJ_API_URL=https://api.yourdomain.com
   ```

---

## 🌍 Environment-Specific Configs

### Development
```env
GGJ_NODE_ENV=development
GGJ_HOST=0.0.0.0
GGJ_CORS_ORIGINS=http://localhost:3001,http://localhost:3000
NEXT_PUBLIC_GGJ_API_URL=http://localhost:3000
```

### Staging
```env
GGJ_NODE_ENV=staging
GGJ_HOST=0.0.0.0
GGJ_CORS_ORIGINS=https://staging.yourdomain.com
NEXT_PUBLIC_GGJ_API_URL=https://api-staging.yourdomain.com
```

### Production
```env
GGJ_NODE_ENV=production
GGJ_HOST=0.0.0.0
GGJ_CORS_ORIGINS=https://app.yourdomain.com,https://yourdomain.com
NEXT_PUBLIC_GGJ_API_URL=https://api.yourdomain.com
```

---

## 🔧 Variable Descriptions

### Backend

#### Application
- **GGJ_NODE_ENV** - Environment: `development`, `staging`, or `production`
- **GGJ_PORT** - Port for backend server (default: 3000)
- **GGJ_HOST** - Host to bind to (0.0.0.0 for all interfaces)

#### Database
- **GGJ_DB_NAME** - PostgreSQL database name
- **GGJ_DB_USER** - PostgreSQL username
- **GGJ_DB_PASSWORD** - PostgreSQL password
- **GGJ_DB_HOST** - PostgreSQL host (localhost for Docker)
- **GGJ_DB_PORT** - PostgreSQL port (default: 5432)
- **GGJ_DATABASE_URL** - Full connection string (used by Prisma)

#### JWT
- **GGJ_JWT_ACCESS_SECRET** - Secret for signing access tokens (min 32 chars)
- **GGJ_JWT_REFRESH_SECRET** - Secret for signing refresh tokens (min 32 chars, different from access)
- **GGJ_JWT_ACCESS_EXPIRES_IN** - Access token lifespan (e.g., `15m`, `1h`)
- **GGJ_JWT_REFRESH_EXPIRES_IN** - Refresh token lifespan (e.g., `7d`, `30d`)

#### Security
- **GGJ_BCRYPT_ROUNDS** - Argon2 hashing rounds (10-12 for dev, 12-14 for prod)
- **GGJ_RATE_LIMIT_MAX** - Max requests per window for rate limiting
- **GGJ_RATE_LIMIT_WINDOW** - Time window in milliseconds (60000 = 1 minute)

#### CORS
- **GGJ_CORS_ORIGINS** - Comma-separated list of allowed origins
  - Must include frontend URL
  - No trailing slashes
  - Include protocol (http:// or https://)

### Frontend

#### API
- **NEXT_PUBLIC_GGJ_API_URL** - Backend API base URL
  - Must be prefixed with `NEXT_PUBLIC_` to be accessible in browser
  - No trailing slash
  - Include protocol (http:// or https://)

---

## 🚨 Common Issues

### 1. CORS Errors
**Problem:** "CORS Missing Allow Origin"

**Solution:** Ensure frontend URL is in `GGJ_CORS_ORIGINS`:
```env
GGJ_CORS_ORIGINS=http://localhost:3001
```

### 2. Database Connection Failed
**Problem:** "Can't reach database server"

**Solution:** 
1. Verify Docker is running: `docker compose ps`
2. Check `GGJ_DATABASE_URL` matches Docker config
3. Restart database: `docker compose restart`

### 3. JWT Errors
**Problem:** "Invalid token" or "Token expired"

**Solution:**
1. Ensure `GGJ_JWT_ACCESS_SECRET` is at least 32 characters
2. Clear browser localStorage and login again
3. Check token expiry times are reasonable

### 4. Frontend Can't Connect
**Problem:** "Could not connect to server"

**Solution:**
1. Verify `NEXT_PUBLIC_GGJ_API_URL` matches backend URL
2. Test backend: `curl http://localhost:3000/health`
3. Hard refresh browser (Ctrl+Shift+R)

---

## ✅ Validation Checklist

Before deploying, verify:

- [ ] All `GGJ_*` variables are set in backend `.env`
- [ ] JWT secrets are strong and unique (min 32 chars)
- [ ] Database password is secure
- [ ] `GGJ_CORS_ORIGINS` includes your frontend domain
- [ ] `NEXT_PUBLIC_GGJ_API_URL` points to correct backend
- [ ] `GGJ_NODE_ENV` is set correctly for environment
- [ ] No secrets are committed to version control
- [ ] `.env.example` is up to date with all variables

---

## 🔄 Updating Environment Variables

### Development
1. Edit `.env` or `.env.local`
2. Restart the service:
   ```bash
   # Backend
   cd backend && npm run dev

   # Frontend
   cd frontend && npm run dev
   ```

### Production
1. Update `.env` on server
2. Rebuild and restart:
   ```bash
   # Backend
   npm run build
   npm start

   # Frontend
   npm run build
   npm start
   ```

3. Or restart Docker containers:
   ```bash
   docker compose down
   docker compose up -d
   ```

---

**Security Note:** Never share your `.env` files publicly. Always use separate secrets for each environment!
