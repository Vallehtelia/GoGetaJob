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


