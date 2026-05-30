import { env } from "@config/env";
import fs from "fs";
import path from "path";
import pino from "pino";

const isProduction = env.NODE_ENV === "production";
const logDir = path.join(process.cwd(), "logs");

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

let logger: pino.Logger;

if (!isProduction) {
  // Development: Pretty printed to console only
  logger = pino({
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
    level: env.LOG_LEVEL || "debug",
  });
} else {
  // Production: Console + file with rotation
  const streams: pino.StreamEntry[] = [
    // Console output
    {
      stream: process.stdout,
      level: env.LOG_LEVEL || "info",
    },
    // All logs to daily rotated files (14 day retention)
    {
      stream: pino.transport({
        target: "pino-roll",
        options: {
          file: path.join(logDir, "app"),
          frequency: "daily",
          mkdir: true,
          dateFormat: "yyyy-MM-dd",
          limit: {
            count: 14,
          },
        },
      }),
      level: env.LOG_LEVEL || "info",
    },
    // Error logs to separate daily rotated files (30 day retention)
    {
      stream: pino.transport({
        target: "pino-roll",
        options: {
          file: path.join(logDir, "error"),
          frequency: "daily",
          mkdir: true,
          dateFormat: "yyyy-MM-dd",
          limit: {
            count: 30,
          },
        },
      }),
      level: "error",
    },
  ];

  logger = pino(
    {
      level: env.LOG_LEVEL || "info",
    },
    pino.multistream(streams),
  );
}

export { logger };
