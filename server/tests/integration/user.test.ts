import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import request from "supertest";
import app from "../../src/app";
import {
  clearDatabase,
  connectTestDB,
  disconnectTestDB,
} from "../helpers/testDb";

// Test users
const user1 = {
  username: "userone",
  email: "userone@test.com",
  password: "Password123!",
  fullName: "User One",
};

const user2 = {
  username: "usertwo",
  email: "usertwo@test.com",
  password: "Password123!",
  fullName: "User Two",
};

const user3 = {
  username: "userthree",
  email: "userthree@test.com",
  password: "Password123!",
  fullName: "User Three",
};

let token1: string;
let token2: string;
let token3: string;
let userId1: string;
let userId2: string;
let userId3: string;

describe("User Integration Tests", () => {
  beforeAll(async () => {
    await connectTestDB();
    await clearDatabase();

    // Register all 3 test users - rate limiter is disabled in test mode
    const res1 = await request(app).post("/api/v1/auth/register").send(user1);
    token1 = res1.body.data.accessToken;
    userId1 = res1.body.data.user._id;

    const res2 = await request(app).post("/api/v1/auth/register").send(user2);
    token2 = res2.body.data.accessToken;
    userId2 = res2.body.data.user._id;

    const res3 = await request(app).post("/api/v1/auth/register").send(user3);
    token3 = res3.body.data.accessToken;
    userId3 = res3.body.data.user._id;

    if (!token1 || !token2 || !token3) {
      console.warn("⚠️  Some test users failed to register");
    }
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectTestDB();
  });

  describe("GET /api/v1/users/:id", () => {
    it("should get user profile by ID", async () => {
      const response = await request(app)
        .get(`/api/v1/users/${userId2}`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.username).toBe(user2.username);
      expect(response.body.data.user.email).toBe(user2.email);
    });

    it("should return 404 for non-existent user", async () => {
      const response = await request(app)
        .get("/api/v1/users/507f1f77bcf86cd799439099")
        .set("Authorization", `Bearer ${token1}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it("should work without authentication (optional auth)", async () => {
      const response = await request(app)
        .get(`/api/v1/users/${userId2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("POST /api/v1/users/:id/follow", () => {
    it("should follow another user", async () => {
      const response = await request(app)
        .post(`/api/v1/users/${userId2}/follow`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("followed");
    });

    it("should return 400 when following yourself", async () => {
      const response = await request(app)
        .post(`/api/v1/users/${userId1}/follow`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it("should return 400 when already following", async () => {
      const response = await request(app)
        .post(`/api/v1/users/${userId2}/follow`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it("should return 401 without token", async () => {
      const response = await request(app)
        .post(`/api/v1/users/${userId2}/follow`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/users/:id/unfollow", () => {
    it("should unfollow a user", async () => {
      const response = await request(app)
        .post(`/api/v1/users/${userId2}/unfollow`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("unfollowed");
    });

    it("should return 400 when unfollowing yourself", async () => {
      const response = await request(app)
        .post(`/api/v1/users/${userId1}/unfollow`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/users/search", () => {
    it("should search users by query", async () => {
      const response = await request(app)
        .get("/api/v1/users/search?q=user")
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toBeDefined();
      expect(response.body.data.data.length).toBeGreaterThan(0);
    });

    it("should return paginated results", async () => {
      const response = await request(app)
        .get("/api/v1/users/search?q=user&page=1&limit=2")
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it("should return empty array for no matches", async () => {
      const response = await request(app)
        .get("/api/v1/users/search?q=zzzznonexistent")
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.data.data).toEqual([]);
    });
  });

  describe("GET /api/v1/users/:id/followers", () => {
    beforeAll(async () => {
      // Make user2 and user3 follow user1
      await request(app)
        .post(`/api/v1/users/${userId1}/follow`)
        .set("Authorization", `Bearer ${token2}`);
      await request(app)
        .post(`/api/v1/users/${userId1}/follow`)
        .set("Authorization", `Bearer ${token3}`);
    });

    it("should get user followers", async () => {
      const response = await request(app)
        .get(`/api/v1/users/${userId1}/followers`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toBeDefined();
      expect(response.body.data.data.length).toBe(2);
    });
  });

  describe("GET /api/v1/users/:id/following", () => {
    it("should get users that a user follows", async () => {
      const response = await request(app)
        .get(`/api/v1/users/${userId2}/following`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toBeDefined();
    });
  });

  describe("GET /api/v1/users/suggestions", () => {
    it("should get suggested users", async () => {
      const response = await request(app)
        .get("/api/v1/users/suggestions?limit=5")
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toBeDefined();
    });
  });
});
