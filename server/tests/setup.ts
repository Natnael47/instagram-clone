// tests/setup.ts
import { afterAll, beforeAll } from "bun:test";

// Set test environment variables BEFORE any imports
beforeAll(() => {
  // Core environment
  process.env.NODE_ENV = "test";
  process.env.PORT = "5001";

  // Database
  process.env.MONGODB_URI = "mongodb://localhost:27017/instagram-clone-test";

  // JWT - Must be at least 32 characters for Zod validation
  process.env.JWT_SECRET = "test-secret-key-that-is-32chars!!";
  process.env.JWT_ACCESS_EXPIRES_IN = "15m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";

  // Cloudinary (optional for tests)
  process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  process.env.CLOUDINARY_API_KEY = "test-api-key";
  process.env.CLOUDINARY_API_SECRET = "test-api-secret";

  // Client
  process.env.CLIENT_URL = "http://localhost:19000";

  // Logging - Silent during tests
  process.env.LOG_LEVEL = "error";

  console.log("🧪 Test environment configured");
});

// Clean up after all tests
afterAll(async () => {
  console.log("🧹 Test cleanup complete");
});
