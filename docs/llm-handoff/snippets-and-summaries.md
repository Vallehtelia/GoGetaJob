# GGJ — Snippets & Summaries Extract (for LLM handoff)
Generated on: 2026-01-14

# 1) Backend: Response & Error Handling

## Summary
- **No single “success envelope” helper**: some routes return `{ data }`, others return `{ message, ... }`, and some return a raw model object.
- **Global error handler** is defined in `buildApp()` and returns `{ error, message }` (no `statusCode` field).
- **Global error handler status selection**: if `error.statusCode` exists, it uses that; otherwise defaults to `500`.
- **Prisma error handling** is a heuristic: checks `error.constructor.name.includes('Prisma')` and returns a generic 500 (dev mode leaks full message).
- **404 handler** returns `{ error: 'Not Found', message: 'Route METHOD:URL not found' }`.
- **Route-level Zod handling is inconsistent**: many routes catch Zod errors and return `{ error, message, details }` (sometimes includes `statusCode`, sometimes not).
- **Frontend expects `ApiError { statusCode, message }`** in many places; the backend global handler does **not** include `statusCode`, so parsing relies on fallback behavior client-side.

## Snippets

```21:93:/root/GoGetaJob/backend/src/app.ts
export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: config.app.isDevelopment ? 'info' : 'warn',
      transport: config.app.isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    },
  });

  // Register plugins
  await fastify.register(securityPlugin);
  await fastify.register(fileUploadPlugin);
  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(applicationsRoutes);
  await fastify.register(profileRoutes);
  await fastify.register(libraryRoutes);
  await fastify.register(cvRoutes);
  await fastify.register(snapshotRoutes);
  await fastify.register(openaiRoutes);
  await fastify.register(aiRoutes);

  // Global error handler
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);

    // Type guard for Error objects
    const isError = error instanceof Error;
    const statusCode = (error as any).statusCode;
    
    // Handle Fastify HTTP errors
    if (statusCode) {
      return reply.code(statusCode).send({
        error: isError ? error.name : 'Error',
        message: isError ? error.message : 'An error occurred',
      });
    }

    // Handle Prisma errors
    if (isError && error.constructor.name.includes('Prisma')) {
      return reply.code(500).send({
        error: 'Database Error',
        message: config.app.isDevelopment ? error.message : 'An error occurred with the database',
      });
    }

    // Generic error
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: config.app.isDevelopment && isError ? error.message : 'An unexpected error occurred',
    });
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`,
    });
  });

  return fastify;
}
```

# 2) Backend: Auth + Tokens

## Summary
- **Access token**: JWT via `@fastify/jwt`, signed with `config.jwt.accessSecret`, expiry `config.jwt.accessExpiresIn`.
- **Refresh token**: **random 64-byte hex string**, not a JWT.
- **DB storage**: refresh tokens are stored as **SHA-256 hash** (`tokenHash`) in `RefreshToken` table; plaintext refresh token is only returned to client once.
- **Rotation**: `/auth/refresh` verifies refresh token, **revokes old token** (`revokedAt`), then creates a **new refresh token row** + new access token.
- **Single-use enforcement** is implemented by checking `revokedAt` and setting it on refresh.
- **Multiple sessions**: logins create new refresh tokens without revoking existing ones (multiple valid refresh tokens per user until used/revoked/expired).
- **Config gotcha**: `GGJ_JWT_REFRESH_SECRET` exists in env/config but is **unused** (refresh tokens are not JWTs).
- **Config gotcha**: `GGJ_BCRYPT_ROUNDS` exists, but password hashing uses **Argon2id** (not bcrypt).
- **Route response shapes**: `/auth/register` and `/auth/login` return `{ message, user, accessToken, refreshToken }` (matches frontend `AuthResponse`). `/auth/refresh` returns `{ message, accessToken, refreshToken }` (missing `user`).

## Snippets

```1:200:/root/GoGetaJob/backend/src/modules/auth/routes.ts
import { FastifyPluginAsync } from 'fastify';
import { registerSchema, loginSchema, refreshTokenSchema } from './schemas.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { createTokens, verifyRefreshToken, revokeRefreshToken } from '../../utils/tokens.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register endpoint
  fastify.post('/auth/register', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes',
      },
    },
    handler: async (request, reply) => {
      try {
        // Validate input
        const body = registerSchema.parse(request.body);

        // Check if user already exists
        const existingUser = await fastify.prisma.user.findUnique({
          where: { email: body.email },
        });

        if (existingUser) {
          return reply.code(409).send({
            error: 'Conflict',
            message: 'User with this email already exists',
          });
        }

        // Hash password
        const passwordHash = await hashPassword(body.password);

        // Create user
        const user = await fastify.prisma.user.create({
          data: {
            email: body.email,
            passwordHash,
          },
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
        });

        // Create tokens
        const { accessToken, refreshToken } = await createTokens(fastify, user.id);

        return reply.code(201).send({
          message: 'User registered successfully',
          user,
          accessToken,
          refreshToken,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // Login endpoint
  fastify.post('/auth/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes',
      },
    },
    handler: async (request, reply) => {
      try {
        // Validate input
        const body = loginSchema.parse(request.body);

        // Find user
        const user = await fastify.prisma.user.findUnique({
          where: { email: body.email },
        });

        if (!user) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Invalid email or password',
          });
        }

        // Verify password
        const isValidPassword = await verifyPassword(user.passwordHash, body.password);

        if (!isValidPassword) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Invalid email or password',
          });
        }

        // Create tokens
        const { accessToken, refreshToken } = await createTokens(fastify, user.id);

        return reply.send({
          message: 'Login successful',
          user: {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
          },
          accessToken,
          refreshToken,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // Refresh token endpoint
  fastify.post('/auth/refresh', {
    handler: async (request, reply) => {
      try {
        // Validate input
        const body = refreshTokenSchema.parse(request.body);

        // Verify refresh token
        const userId = await verifyRefreshToken(fastify, body.refreshToken);

        if (!userId) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Invalid or expired refresh token',
          });
        }

        // Revoke old refresh token
        await revokeRefreshToken(fastify, body.refreshToken);

        // Create new tokens
        const { accessToken, refreshToken } = await createTokens(fastify, userId);

        return reply.send({
          message: 'Token refreshed successfully',
          accessToken,
          refreshToken,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // Get current user (protected)
  fastify.get('/me', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.userId;

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      return reply.send({ user });
    },
  });
};

export default authRoutes;
```

```1:31:/root/GoGetaJob/backend/src/modules/auth/schemas.ts
import { z } from 'zod';

// Registration schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
```

```1:121:/root/GoGetaJob/backend/src/utils/tokens.ts
import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import { config } from '../config/index.js';

/**
 * Generate a cryptographically secure random token
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Hash a refresh token for storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Parse JWT expiry string to Date
 */
export function parseExpiryToDate(expiresIn: string): Date {
  const units: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiry format: ${expiresIn}`);
  }

  const [, value, unit] = match;
  const ms = parseInt(value, 10) * units[unit];
  return new Date(Date.now() + ms);
}

/**
 * Create access and refresh tokens for a user
 */
export async function createTokens(fastify: FastifyInstance, userId: string) {
  // Create access token (JWT)
  const accessToken = fastify.jwt.sign({ userId });

  // Create refresh token (random string)
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = parseExpiryToDate(config.jwt.refreshExpiresIn);

  // Store refresh token in database
  await fastify.prisma.refreshToken.create({
    data: {
      tokenHash: refreshTokenHash,
      userId,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

/**
 * Verify and get user from refresh token
 */
export async function verifyRefreshToken(
  fastify: FastifyInstance,
  refreshToken: string
): Promise<string | null> {
  const tokenHash = hashToken(refreshToken);

  const storedToken = await fastify.prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!storedToken) {
    return null;
  }

  // Check if token is revoked
  if (storedToken.revokedAt) {
    return null;
  }

  // Check if token is expired
  if (storedToken.expiresAt < new Date()) {
    return null;
  }

  return storedToken.userId;
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(
  fastify: FastifyInstance,
  refreshToken: string
): Promise<void> {
  const tokenHash = hashToken(refreshToken);

  await fastify.prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserTokens(
  fastify: FastifyInstance,
  userId: string
): Promise<void> {
  await fastify.prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
```

```1:24:/root/GoGetaJob/backend/src/utils/password.ts
import argon2 from 'argon2';

/**
 * Hash a password using Argon2
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
```

```12:58:/root/GoGetaJob/backend/prisma/schema.prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  
  // Profile fields
  firstName         String?  @db.VarChar(100) @map("first_name")
  lastName          String?  @db.VarChar(100) @map("last_name")
  phone             String?  @db.VarChar(50)
  location          String?  @db.VarChar(120)
  headline          String?  @db.VarChar(160)
  summary           String?  @db.Text
  profilePictureUrl String?  @db.VarChar(500) @map("profile_picture_url")
  linkedinUrl       String?  @db.VarChar(300) @map("linkedin_url")
  githubUrl         String?  @db.VarChar(300) @map("github_url")
  websiteUrl        String?  @db.VarChar(300) @map("website_url")
  
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  refreshTokens     RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id        String    @id @default(uuid())
  tokenHash String    @unique @map("token_hash")
  userId    String    @map("user_id")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime  @default(now()) @map("created_at")
  expiresAt DateTime  @map("expires_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}
```

# 3) Backend: Security / Rate Limit / Body Size

## Summary
- **Helmet** is enabled via `@fastify/helmet`; CSP is disabled in non-production.
- **CORS** is enforced with a custom origin function: allows requests when `origin` is missing or is included in `config.cors.origins`; otherwise rejects with `Not allowed by CORS`.
- **Rate limiting** is registered via `@fastify/rate-limit` but **not global** (`global: false`): must be enabled per-route with route `config.rateLimit`.
- **Default rate limit config** comes from env (`GGJ_RATE_LIMIT_MAX`, `GGJ_RATE_LIMIT_WINDOW`), but some routes override window/max using strings like `'15 minutes'`.
- **Body size limits**: no global Fastify `bodyLimit` is configured in `Fastify()`; uploads are constrained by multipart plugin limits (see uploads section).
- **Auth plugin** returns `401` with `{ error, message }` for invalid/expired tokens (no `{ statusCode }`).

## Snippets

```1:38:/root/GoGetaJob/backend/src/plugins/security.ts
import { FastifyPluginAsync } from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import fp from 'fastify-plugin';
import { config } from '../config/index.js';

const securityPlugin: FastifyPluginAsync = async (fastify) => {
  // Helmet - secure headers
  await fastify.register(helmet, {
    contentSecurityPolicy: config.app.isProduction ? undefined : false,
  });

  // CORS
  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow requests from configured origins or no origin (same-origin)
      if (!origin || config.cors.origins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    global: false, // We'll apply it per-route
    max: config.security.rateLimit.max,
    timeWindow: config.security.rateLimit.timeWindow,
  });

  fastify.log.info('✅ Security plugins loaded');
};

export default fp(securityPlugin);
```

```19:38:/root/GoGetaJob/backend/src/plugins/auth.ts
const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Register JWT plugin
  fastify.register(fastifyJwt, {
    secret: config.jwt.accessSecret,
    sign: {
      expiresIn: config.jwt.accessExpiresIn,
    },
  });

  // Authentication decorator
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  });
};
```

```7:14:/root/GoGetaJob/backend/src/modules/auth/routes.ts
  fastify.post('/auth/register', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes',
      },
    },
    handler: async (request, reply) => {
```

```64:79:/root/GoGetaJob/backend/src/config/index.ts
  jwt: {
    accessSecret: env.GGJ_JWT_ACCESS_SECRET,
    refreshSecret: env.GGJ_JWT_REFRESH_SECRET,
    accessExpiresIn: env.GGJ_JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.GGJ_JWT_REFRESH_EXPIRES_IN,
  },
  security: {
    bcryptRounds: env.GGJ_BCRYPT_ROUNDS,
    rateLimit: {
      max: env.GGJ_RATE_LIMIT_MAX,
      timeWindow: env.GGJ_RATE_LIMIT_WINDOW,
    },
  },
  cors: {
    origins: env.GGJ_CORS_ORIGINS.split(',').map((o) => o.trim()),
  },
```

# 4) Frontend: API Client + Token Handling

## Summary
- **Single API client** (`ApiClient`) wraps `fetch` and attaches `Authorization: Bearer <accessToken>` when `requiresAuth !== false`.
- **Automatic refresh on 401**: if a request gets `401` and `requiresAuth`, it calls `handleTokenRefresh()`, then retries the original request once with the new access token.
- **Refresh de-dupe**: `isRefreshing` + `refreshPromise` ensures concurrent 401s wait on the same refresh request.
- **Refresh call**: POSTs to `/auth/refresh` with `{ refreshToken }`, then stores `{ accessToken, refreshToken }` via `setTokens`.
- **Type gotcha**: refresh response is cast to `AuthResponse` but backend refresh response has **no `user`**; the code only uses tokens, so it works at runtime but the type is misleading.
- **Error parsing**: on non-OK responses, tries `response.json()` and expects `{ statusCode, message }`; if JSON parsing fails, it falls back to `{ statusCode: response.status, message: response.statusText }`.
- **Upload profile picture bypasses refresh logic**: it uses raw `fetch` directly (not `this.request()`), so a `401` there will **not** auto-refresh and retry.
- **Token storage**: access/refresh tokens are stored in `localStorage` (client-side JS accessible).

## Snippets

```50:205:/root/GoGetaJob/frontend/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_GGJ_API_URL || 'http://localhost:3000';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Core request method with automatic token refresh on 401
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { requiresAuth = true, ...fetchOptions } = options;

    // Prepare headers
    const headers: Record<string, string> = {
      ...(fetchOptions.headers as Record<string, string>),
    };

    // Only set Content-Type for requests with body
    if (fetchOptions.method !== 'GET' && fetchOptions.method !== 'DELETE') {
      headers['Content-Type'] = 'application/json';
    }

    // Attach access token if required
    if (requiresAuth) {
      const token = getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Handle 401 - try to refresh token
      if (response.status === 401 && requiresAuth) {
        const newToken = await this.handleTokenRefresh();
        if (newToken) {
          // Retry request with new token
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(url, {
            ...fetchOptions,
            headers,
          });
          return this.handleResponse<T>(retryResponse);
        } else {
          // Refresh failed, logout
          logout();
          throw new Error('Session expired. Please login again.');
        }
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  /**
   * Handle token refresh with request deduplication
   */
  private async handleTokenRefresh(): Promise<string | null> {
    // If already refreshing, wait for that promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performRefresh(): Promise<string | null> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return null;
      }

      const data: AuthResponse = await response.json();
      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    }
  }

  /**
   * Parse and handle response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: ApiError;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          statusCode: response.status,
          message: response.statusText || 'An error occurred',
        };
      }
      throw new ApiClientError(
        errorData.message || 'Request failed',
        errorData.statusCode,
        errorData
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }
```

```255:290:/root/GoGetaJob/frontend/lib/api.ts
  async uploadProfilePicture(file: File): Promise<UserProfile> {
    const formData = new FormData();
    formData.append('file', file);

    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('No access token found');
    }

    const response = await fetch(`${this.baseUrl}/profile/picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiClientError(
        error.message || 'Failed to upload profile picture',
        response.status,
        error
      );
    }

    const data = await response.json();
    return data.profile;
  }

  async deleteProfilePicture(): Promise<UserProfile> {
    const response = await this.request<{ profile: UserProfile }>('/profile/picture', {
      method: 'DELETE',
    });
    return response.profile;
  }
```

```1:60:/root/GoGetaJob/frontend/lib/auth.ts
const ACCESS_TOKEN_KEY = 'ggj_access_token';
const REFRESH_TOKEN_KEY = 'ggj_refresh_token';
const USER_KEY = 'ggj_user';

// Token management
export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function logout(): void {
  clearTokens();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
```

# 5) Backend: Uploads / Profile Picture

## Summary
- **Multipart upload support** is enabled globally via `@fastify/multipart` with limits: **5MB**, **1 file**.
- **Static serving**: `@fastify/static` serves files from `process.cwd()/uploads` under URL prefix `/uploads/`.
- **CORS-ish headers for images**: static responses set `Cross-Origin-Resource-Policy: cross-origin` and `Access-Control-Allow-Origin: *`.
- **Profile picture upload**: accepts a single multipart file via `request.file()`, validates mimetype, writes to `uploads/profile-pictures/<userId>-<uuid>.<ext>`.
- **DB storage**: stores only a **relative URL** like `/uploads/profile-pictures/<filename>` in `User.profilePictureUrl`.
- **Delete behavior**: sets `profilePictureUrl` to `null` but does **not delete** the file from disk.
- **Directory existence gotcha**: upload route does **not** create `uploads/profile-pictures` if missing; `createWriteStream(filepath)` will fail if directory doesn’t exist.
- **No cleanup/rotation**: uploading multiple times can orphan old files; delete also orphans files.

## Snippets

```1:30:/root/GoGetaJob/backend/src/plugins/fileUpload.ts
import fp from 'fastify-plugin';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { FastifyInstance } from 'fastify';
import path from 'path';

export default fp(async (fastify: FastifyInstance) => {
  // Register multipart plugin for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
      files: 1, // Max 1 file per request
    },
  });

  // Serve static files from uploads directory
  const uploadsPath = path.join(process.cwd(), 'uploads');
  await fastify.register(fastifyStatic, {
    root: uploadsPath,
    prefix: '/uploads/',
    decorateReply: false,
    // Allow cross-origin requests for images
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  });

  fastify.log.info('File upload plugin registered');
});
```

```98:215:/root/GoGetaJob/backend/src/modules/profile/routes.ts
  // Upload profile picture
  fastify.post('/profile/picture', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        
        // Get the uploaded file
        const data = await request.file();
        
        if (!data) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'No file uploaded',
          });
        }

        // Validate file type
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(data.mimetype)) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
          });
        }

        // Generate unique filename
        const ext = data.filename.split('.').pop() || 'jpg';
        const filename = `${userId}-${randomUUID()}.${ext}`;
        const uploadsDir = path.join(process.cwd(), 'uploads', 'profile-pictures');
        const filepath = path.join(uploadsDir, filename);

        // Save file
        await pipeline(data.file, createWriteStream(filepath));

        // Update user's profile picture URL
        const profilePictureUrl = `/uploads/profile-pictures/${filename}`;
        const updatedUser = await fastify.prisma.user.update({
          where: { id: userId },
          data: { profilePictureUrl },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            location: true,
            headline: true,
            summary: true,
            profilePictureUrl: true,
            linkedinUrl: true,
            githubUrl: true,
            websiteUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return reply.send({
          message: 'Profile picture uploaded successfully',
          profile: updatedUser,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to upload profile picture',
        });
      }
    },
  });

  // Delete profile picture
  fastify.delete('/profile/picture', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;

        // Update user's profile picture URL to null
        const updatedUser = await fastify.prisma.user.update({
          where: { id: userId },
          data: { profilePictureUrl: null },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            location: true,
            headline: true,
            summary: true,
            profilePictureUrl: true,
            linkedinUrl: true,
            githubUrl: true,
            websiteUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return reply.send({
          message: 'Profile picture deleted successfully',
          profile: updatedUser,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to delete profile picture',
        });
      }
    },
  });
```

# 6) Quick Endpoint Shape Audit (non-exhaustive)

## Summary
- **Frontend is inconsistent** about response shapes: sometimes it expects `{ data: ... }`, sometimes raw objects, sometimes `{ profile: ... }`.
- **Backend is also inconsistent**: some routes return `{ data }`, others return `{ message, data }`, others return `{ message, application }`, and at least one returns a raw Prisma model.
- **Obvious mismatches where the frontend likely breaks**:
  - `GET /me` returns `{ user }`, but frontend `getMe()` calls `request<User>('/me')` (expects a raw `User` object).
  - `POST /applications` and `PATCH /applications/:id` return `{ message, application }`, but frontend `createApplication()` / `updateApplication()` call `request<JobApplication>(...)` (expects a raw `JobApplication`).
- **Obvious “raw shape” endpoint**: `GET /applications/:id` returns the raw application model (not wrapped), and frontend expects raw `JobApplication` there—so that one matches, but it violates the `{ data }` convention.

## Snippets

```172:196:/root/GoGetaJob/backend/src/modules/auth/routes.ts
  // Get current user (protected)
  fastify.get('/me', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.userId;

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      return reply.send({ user });
    },
  });
```

```11:36:/root/GoGetaJob/backend/src/modules/applications/routes.ts
  // Create application
  fastify.post('/applications', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const body = createApplicationSchema.parse(request.body);

        const application = await fastify.prisma.jobApplication.create({
          data: {
            userId,
            company: body.company,
            position: body.position,
            link: body.link,
            status: body.status,
            appliedAt: body.appliedAt ? new Date(body.appliedAt) : null,
            lastContactAt: body.lastContactAt ? new Date(body.lastContactAt) : null,
            notes: body.notes,
          },
        });

        return reply.code(201).send({
          message: 'Application created successfully',
          application,
        });
      } catch (error: any) {
        // ...
      }
    },
  });
```

```119:142:/root/GoGetaJob/backend/src/modules/applications/routes.ts
  // Get single application by ID
  fastify.get('/applications/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = applicationIdParamSchema.parse(request.params);

        const application = await fastify.prisma.jobApplication.findFirst({
          where: {
            id: params.id,
            userId, // Ensure user owns this application
          },
        });

        if (!application) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Application not found',
          });
        }

        return reply.send(application);
      } catch (error: any) {
        // ...
      }
    },
  });
```

```226:230:/root/GoGetaJob/frontend/lib/api.ts
  async getMe(): Promise<User> {
    return this.request<User>('/me', {
      method: 'GET',
    });
  }
```

```332:349:/root/GoGetaJob/frontend/lib/api.ts
  async createApplication(
    data: CreateApplicationInput
  ): Promise<JobApplication> {
    return this.request<JobApplication>('/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateApplication(
    id: string,
    data: UpdateApplicationInput
  ): Promise<JobApplication> {
    return this.request<JobApplication>(`/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
```

