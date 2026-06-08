import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, "MongoDB URI is required"),
  JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLIENT_URL: z.string().default("http://localhost:19000"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

  // Activity logging configs (optional with defaults)
  ACTIVITY_RETENTION_DAYS: z.coerce.number().default(90),
  ACTIVITY_CLEANUP_INTERVAL_HOURS: z.coerce.number().default(24),

  // Redis Configuration
  REDIS_ENABLED: z.preprocess((val) => {
    if (typeof val === "string") {
      return val === "true" || val === "1";
    }
    return val === true;
  }, z.boolean().default(false)),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  REDIS_PASSWORD: z.string().optional().default(""),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_RETRY_INTERVAL: z.coerce.number().default(10), // minutes
  REDIS_MAX_RETRIES: z.coerce.number().default(3),
  REDIS_CONNECT_TIMEOUT: z.coerce.number().default(5000), // milliseconds
});

export type EnvType = z.infer<typeof envSchema>;

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables:", parsedEnv.error.issues);
  process.exit(1);
}

export const env = parsedEnv.data;
