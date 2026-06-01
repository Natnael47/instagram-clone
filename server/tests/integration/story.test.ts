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
  username: "storyuser1",
  email: "storyuser1@test.com",
  password: "Password123!",
  fullName: "Story User One",
};

const user2 = {
  username: "storyuser2",
  email: "storyuser2@test.com",
  password: "Password123!",
  fullName: "Story User Two",
};

let token1: string;
let token2: string;
let userId1: string;
let userId2: string;
let storyId: string;

const testImagePath = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "test-image.png",
);

describe("Story Integration Tests", () => {
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

    // User2 follows User1 to see their stories
    await request(app)
      .post(`/api/v1/users/${userId1}/follow`)
      .set("Authorization", `Bearer ${token2}`);
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectTestDB();
  });

  describe("POST /api/v1/stories - Create Story", () => {
    it("should create a story with image", async () => {
      const response = await request(app)
        .post("/api/v1/stories")
        .set("Authorization", `Bearer ${token1}`)
        .attach("image", testImagePath)
        .expect(201);

      expect(response.body.success).toBe(true);

      // Save story ID
      storyId = response.body.data?._id || response.body.data?.story?._id;
    });

    it("should return 401 without token", async () => {
      await request(app)
        .post("/api/v1/stories")
        .attach("image", testImagePath)
        .expect(401);
    });
  });

  describe("GET /api/v1/stories - Get Followed Stories", () => {
    it("should return stories from followed users", async () => {
      const response = await request(app)
        .get("/api/v1/stories")
        .set("Authorization", `Bearer ${token2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should return 401 without token", async () => {
      await request(app).get("/api/v1/stories").expect(401);
    });
  });

  describe("GET /api/v1/stories/my - Get My Stories", () => {
    it("should return user own stories", async () => {
      const response = await request(app)
        .get("/api/v1/stories/my")
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("GET /api/v1/stories/user/:userId - Get User Stories", () => {
    it("should get stories for a specific user", async () => {
      const response = await request(app)
        .get(`/api/v1/stories/user/${userId1}`)
        .set("Authorization", `Bearer ${token2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should return empty for user with no stories", async () => {
      const response = await request(app)
        .get(`/api/v1/stories/user/${userId2}`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("POST /api/v1/stories/:storyId/view - View Story", () => {
    it("should mark story as viewed", async () => {
      if (!storyId) return;

      const response = await request(app)
        .post(`/api/v1/stories/${storyId}/view`)
        .set("Authorization", `Bearer ${token2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("DELETE /api/v1/stories/:storyId - Delete Story", () => {
    it("should return 403 when non-author tries to delete", async () => {
      if (!storyId) return;

      await request(app)
        .delete(`/api/v1/stories/${storyId}`)
        .set("Authorization", `Bearer ${token2}`)
        .expect(403);
    });

    it("should delete own story", async () => {
      if (!storyId) return;

      const response = await request(app)
        .delete(`/api/v1/stories/${storyId}`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
