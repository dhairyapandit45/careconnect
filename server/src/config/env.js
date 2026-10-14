/**
 * Centralized Environment Configuration & Validation
 * Validates runtime environment against a Zod schema on boot.
 */

const dotenv = require('dotenv');
const path = require('path');
const { z } = require('zod');

// Load .env from server directory or root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(5000),
    MONGODB_URI: z.string().default('mongodb://localhost:27017/careconnect'),
    JWT_SECRET: z
      .string()
      .min(16, 'JWT_SECRET must be at least 16 characters long')
      .default('careconnect_default_development_jwt_secret_must_be_changed'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    CLIENT_URL: z.string().default('http://localhost:5173'),
    DEMO_MODE: z
      .preprocess((val) => val === 'true' || val === true || val === '1', z.boolean())
      .default(false),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().optional(),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().optional(),
    OPENAI_API_KEY: z.string().optional().default(''),
    GEMINI_API_KEY: z.string().optional().default(''),
    ADMIN_PROVISIONING_KEY: z.string().optional().default(''),
  })
  .transform((data) => {
    const isDemo = data.DEMO_MODE === true;
    return {
      ...data,
      RATE_LIMIT_MAX:
        data.RATE_LIMIT_MAX !== undefined ? data.RATE_LIMIT_MAX : isDemo ? 1500 : 100,
      AUTH_RATE_LIMIT_MAX:
        data.AUTH_RATE_LIMIT_MAX !== undefined ? data.AUTH_RATE_LIMIT_MAX : isDemo ? 100 : 20,
    };
  });

const validateEnv = (rawEnv = process.env) => {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    console.error('❌ Environment validation failed:');
    parsed.error.issues.forEach((issue) => {
      console.error(` - ${issue.path.join('.')}: ${issue.message}`);
    });
    if (rawEnv.NODE_ENV === 'production') {
      process.exit(1);
    }
    return envSchema.parse({});
  }
  return parsed.data;
};

const env = validateEnv(process.env);

module.exports = {
  env,
  envSchema,
  validateEnv,
};

