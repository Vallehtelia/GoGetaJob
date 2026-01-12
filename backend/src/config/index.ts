import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
// dotenv.config() looks for .env in the current working directory (backend/)
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Application
  GGJ_NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  GGJ_PORT: z.string().default('3000').transform(Number),
  GGJ_HOST: z.string().default('0.0.0.0'),

  // Database
  GGJ_DATABASE_URL: z.string().min(1, 'Database URL is required'),

  // JWT
  GGJ_JWT_ACCESS_SECRET: z.string().min(32, 'JWT access secret must be at least 32 characters'),
  GGJ_JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),
  GGJ_JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  GGJ_JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Security
  GGJ_BCRYPT_ROUNDS: z.string().default('12').transform(Number),
  GGJ_RATE_LIMIT_MAX: z.string().default('5').transform(Number),
  GGJ_RATE_LIMIT_WINDOW: z.string().default('60000').transform(Number),

  // CORS
  GGJ_CORS_ORIGINS: z.string().default('http://localhost:3000'),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
};

const env = parseEnv();

export const config = {
  app: {
    name: 'GoGetaJob',
    short: 'GGJ',
    env: env.GGJ_NODE_ENV,
    port: env.GGJ_PORT,
    host: env.GGJ_HOST,
    isDevelopment: env.GGJ_NODE_ENV === 'development',
    isProduction: env.GGJ_NODE_ENV === 'production',
    isTest: env.GGJ_NODE_ENV === 'test',
  },
  database: {
    url: env.GGJ_DATABASE_URL,
  },
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
} as const;


