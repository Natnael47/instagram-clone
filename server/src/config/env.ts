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
});

export type EnvType = z.infer<typeof envSchema>;

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables:", parsedEnv.error.issues);
  process.exit(1);
}

export const env = parsedEnv.data;
