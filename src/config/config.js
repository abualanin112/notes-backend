const dotenv = require('dotenv');
const path = require('path');
const { z } = require('zod');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = z
  .object({
    NODE_ENV: z.enum(['production', 'development', 'test']),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().describe('PostgreSQL connection URL'),
    CORS_ORIGINS: z
      .string()
      .transform((str) => str.split(',').map((s) => s.trim()))
      .describe('Comma-separated list of allowed CORS origins'),
    ENABLE_BACKGROUND_WORKERS: z
      .string()
      .transform((str) => str === 'true')
      .default('false')
      .describe('Whether this node should boot background cron workers'),
    JWT_SECRET: z.string().describe('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: z.coerce.number().default(30).describe('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: z.coerce.number().default(30).describe('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: z.coerce
      .number()
      .default(10)
      .describe('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: z.coerce
      .number()
      .default(10)
      .describe('minutes after which verify email token expires'),
    SMTP_HOST: z.string().optional().describe('server that will send the emails'),
    SMTP_PORT: z.coerce.number().optional().describe('port to connect to the email server'),
    SMTP_USERNAME: z.string().optional().describe('username for email server'),
    SMTP_PASSWORD: z.string().optional().describe('password for email server'),
    EMAIL_FROM: z.string().optional().describe('the from field in the emails sent by the app'),
    REDIS_URL: z.string().optional().describe('Redis connection URL for RBAC permission caching'),
  })
  .passthrough();

const result = envVarsSchema.safeParse(process.env);

if (!result.success) {
  throw new Error(
    `Config validation error: ${result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
  );
}

const envVars = result.data;

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  enableBackgroundWorkers: envVars.ENABLE_BACKGROUND_WORKERS,
  prisma: {
    url: envVars.DATABASE_URL,
  },
  cors: {
    origins: envVars.CORS_ORIGINS,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  redis: {
    url: envVars.REDIS_URL,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
};
