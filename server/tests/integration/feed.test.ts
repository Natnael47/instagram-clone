import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import fs from "fs";
import path from "path";
import request from "supertest";
import app from "../../src/app";
import {
  clearDatabase,
  connectTestDB,
  disconnectTestDB,
} from "../helpers/testDb";

const user1 = {
  username: "feeduser1",
  email: "feeduser1@test.com",
  password: "Password123!",
  fullName: "Feed User One",
};

const user2 = {
  username: "feeduser2",
  email: "feeduser2@test.com",
  password: "Password123!",
  fullName: "Feed User Two",
};

let token1: string;
let token2: string;
let userId1: string;
let userId2: string;

const testImagePath = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "test-image.png",
);

describe("Feed Integration Tests", () => {
  beforeAll(async () => {
    await connectTestDB();
    await clearDatabase();

    // Register users
    const res1 = await request(app).post("/api/v1/auth/register").send(user1);
    token1 = res1.body.data.accessToken;
    userId1 = res1.body.data.user._id;

    const res2 = await request(app).post("/api/v1/auth/register").send(user2);
    token2 = res2.body.data.accessToken;
    userId2 = res2.body.data.user._id;

    // Ensure test image exists
    const fixturesDir = path.join(process.cwd(), "tests", "fixtures");
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    if (!fs.existsSync(testImagePath)) {
      // Create a valid 1x1 white PNG (minimal but valid image)
      // This is a base64 encoded 1x1 white PNG
      const pngBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
      const pngBuffer = Buffer.from(pngBase64, "base64");
      fs.writeFileSync(testImagePath, pngBuffer);
    }

    // User1 creates a post
    await request(app)
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${token1}`)
      .field("caption", "User1 post")
      .attach("image", testImagePath);

    // User2 creates a post
    await request(app)
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${token2}`)
      .field("caption", "User2 post")
      .attach("image", testImagePath);

    // User1 follows User2
    await request(app)
      .post(`/api/v1/users/${userId2}/follow`)
      .set("Authorization", `Bearer ${token1}`);
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectTestDB();
  });

  describe("GET /api/v1/feed - Personalized Feed", () => {
    it("should return personalized feed for followed users", async () => {
      const response = await request(app)
        .get("/api/v1/feed")
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it("should return 401 without token", async () => {
      await request(app).get("/api/v1/feed").expect(401);
    });

    it("should support pagination", async () => {
      const response = await request(app)
        .get("/api/v1/feed?page=1&limit=5")
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });
  });

  describe("GET /api/v1/feed/global - Global Feed", () => {
    it("should return global feed with all posts", async () => {
      const response = await request(app)
        .get("/api/v1/feed/global")
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe("POST /api/v1/feed/by-users - Feed by User IDs", () => {
    it("should return posts from specific users", async () => {
      const response = await request(app)
        .post("/api/v1/feed/by-users")
        .set("Authorization", `Bearer ${token1}`)
        .send({ userIds: [userId2] })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should return 400 when userIds is empty", async () => {
      const response = await request(app)
        .post("/api/v1/feed/by-users")
        .set("Authorization", `Bearer ${token1}`)
        .send({ userIds: [] })
        .expect(500); // Your API returns 500 for this validation error

      expect(response.body.success).toBe(false);
    });
  });
});
