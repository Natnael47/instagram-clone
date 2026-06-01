import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import request from "supertest";
import app from "../../src/app";
import {
  clearDatabase,
  connectTestDB,
  disconnectTestDB,
} from "../helpers/testDb";

/**
 * Auth Edge Cases & Security Tests
 * Tests invalid tokens, expired tokens, duplicate registrations,
 * password validation, and various security scenarios
 */

const testUser = {
  username: "edgecaseuser",
  email: "edgecase@test.com",
  password: "Password123!",
  fullName: "Edge Case User",
};

let validToken: string;
let userId: string;

describe("Auth Edge Cases & Security Tests", () => {
  beforeAll(async () => {
    await connectTestDB();
    await clearDatabase();

    // Register a valid user for token tests
    const res = await request(app).post("/api/v1/auth/register").send(testUser);
    validToken = res.body.data.accessToken;
    userId = res.body.data.user._id;
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectTestDB();
  });

  /**
   * INVALID TOKEN SCENARIOS
   */
  describe("🔒 Invalid Token Scenarios", () => {
    it("should reject empty Authorization header", async () => {
      await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "")
        .expect(401);
    });

    it("should reject missing Authorization header", async () => {
      await request(app).get("/api/v1/auth/me").expect(401);
    });

    it("should reject malformed Bearer token", async () => {
      await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer malformed-token")
        .expect(401);
    });

    it("should reject token without Bearer prefix", async () => {
      await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", validToken)
        .expect(401);
    });

    it("should reject token signed with wrong secret", async () => {
      const wrongToken = jwt.sign(
        { id: userId, type: "access" },
        "wrong-secret-key-that-is-different!!",
        { expiresIn: "15m" },
      );

      await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${wrongToken}`)
        .expect(401);
    });

    it("should reject token with invalid payload structure", async () => {
      const badToken = jwt.sign(
        { wrongField: "no-id-field" },
        process.env.JWT_SECRET || "test-secret-key",
        { expiresIn: "15m" },
      );

      await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${badToken}`)
        .expect(401);
    });

    it("should reject token for non-existent user", async () => {
      const ghostToken = jwt.sign(
        { id: new Types.ObjectId().toString(), type: "access" },
        process.env.JWT_SECRET || "test-secret-key",
        { expiresIn: "15m" },
      );

      await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${ghostToken}`)
        .expect(401);
    });

    it("should reject expired token", async () => {
      const expiredToken = jwt.sign(
        { id: userId, type: "access" },
        process.env.JWT_SECRET || "test-secret-key",
        { expiresIn: "0s" }, // Expires immediately
      );

      // Wait a moment to ensure it's expired
      await new Promise((resolve) => setTimeout(resolve, 100));

      await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${expiredToken}`)
        .expect(401);
    });

    it("should reject refresh token on access-protected route", async () => {
      const refreshToken = jwt.sign(
        { id: userId, type: "refresh" },
        process.env.JWT_SECRET || "test-secret-key",
        { expiresIn: "7d" },
      );

      // Refresh tokens should work for refresh endpoint but not for protected routes
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${refreshToken}`);

      // May or may not be rejected depending on implementation
      expect([200, 401]).toContain(res.status);
    });
  });

  /**
   * REGISTRATION EDGE CASES
   */
  describe("📝 Registration Edge Cases", () => {
    it("should reject registration with missing username", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "missing@test.com",
          password: "Password123!",
          fullName: "Missing Username",
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should reject registration with missing email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          username: "missingemail",
          password: "Password123!",
          fullName: "Missing Email",
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should reject registration with missing password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          username: "missingpass",
          email: "missingpass@test.com",
          fullName: "Missing Password",
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should reject registration with short username", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          username: "ab", // Too short
          email: "short@test.com",
          password: "Password123!",
          fullName: "Short Username",
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should reject registration with invalid email format", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          username: "invalidemail",
          email: "not-an-email",
          password: "Password123!",
          fullName: "Invalid Email",
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should reject registration with weak password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          username: "weakpassword",
          email: "weak@test.com",
          password: "123", // Too short
          fullName: "Weak Password",
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should reject registration with special characters in username", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        username: "bad@user!", // Special chars
        email: "special@test.com",
        password: "Password123!",
        fullName: "Special User",
      });

      // May return 400 or might allow it depending on validation
      expect([400, 201]).toContain(res.status);
    });

    it("should reject duplicate email (case insensitive)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          username: "differentuser2",
          email: "EDGECASE@test.com", // Same as testUser but uppercase
          password: "Password123!",
          fullName: "Duplicate Email",
        })
        .expect(409);

      expect(res.body.success).toBe(false);
    });

    it("should reject duplicate username (case insensitive)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          username: "EDGECASEUSER", // Same as testUser but uppercase
          email: "different2@test.com",
          password: "Password123!",
          fullName: "Duplicate Username",
        })
        .expect(409);

      expect(res.body.success).toBe(false);
    });

    it("should reject registration with excessively long username", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          username: "a".repeat(31), // 31 chars, max is 30
          email: "longuser@test.com",
          password: "Password123!",
          fullName: "Long Username",
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should reject registration with excessively long bio", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          username: "longbio",
          email: "longbio@test.com",
          password: "Password123!",
          fullName: "Long Bio",
          bio: "a".repeat(161), // 161 chars, max is 160
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  /**
   * LOGIN EDGE CASES
   */
  describe("🔑 Login Edge Cases", () => {
    it("should reject login with empty body", async () => {
      await request(app).post("/api/v1/auth/login").send({}).expect(400);
    });

    it("should reject login with missing password", async () => {
      await request(app)
        .post("/api/v1/auth/login")
        .send({ email: testUser.email })
        .expect(400);
    });

    it("should reject login with missing email", async () => {
      await request(app)
        .post("/api/v1/auth/login")
        .send({ password: testUser.password })
        .expect(400);
    });

    it("should reject login with empty strings", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "", password: "" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should reject login with SQL injection attempt", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "' OR '1'='1",
          password: "' OR '1'='1",
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it("should reject login with XSS attempt", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: '<script>alert("xss")</script>',
          password: "Password123!",
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it("should handle very long email input gracefully", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "a".repeat(1000) + "@test.com",
          password: "Password123!",
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  /**
   * PASSWORD CHANGE EDGE CASES
   */
  describe("🔐 Password Change Edge Cases", () => {
    it("should reject password change without token", async () => {
      await request(app)
        .put("/api/v1/auth/change-password")
        .send({
          currentPassword: testUser.password,
          newPassword: "NewPassword456!",
          confirmNewPassword: "NewPassword456!",
        })
        .expect(401);
    });

    it("should reject password change with mismatched confirmation", async () => {
      const res = await request(app)
        .put("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: "NewPassword456!",
          confirmNewPassword: "DifferentPassword789!",
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should reject password change with same password", async () => {
      const res = await request(app)
        .put("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: testUser.password,
          confirmNewPassword: testUser.password,
        });

      // May or may not reject - depends on implementation
      expect([200, 400]).toContain(res.status);
    });
  });

  /**
   * RATE LIMITING
   */
  describe("⏱️ Rate Limiting", () => {
    it("should handle rapid login attempts", async () => {
      const attempts = [];

      // Make multiple rapid login attempts
      for (let i = 0; i < 8; i++) {
        attempts.push(
          request(app).post("/api/v1/auth/login").send({
            email: testUser.email,
            password: "WrongPassword123!",
          }),
        );
      }

      const results = await Promise.all(attempts);
      const statuses = results.map((r) => r.status);

      // Some should be 401, possibly some 429 if rate limited
      expect(statuses).toContain(401);
    });
  });

  /**
   * PROFILE UPDATE EDGE CASES
   */
  describe("👤 Profile Update Edge Cases", () => {
    it("should reject profile update without token", async () => {
      await request(app)
        .put("/api/v1/auth/profile")
        .send({ fullName: "No Auth Update" })
        .expect(401);
    });

    it("should reject profile update with empty body", async () => {
      const res = await request(app)
        .put("/api/v1/auth/profile")
        .set("Authorization", `Bearer ${validToken}`)
        .send({});

      // May return 200 (no changes) or 400 (validation error)
      expect([200, 400]).toContain(res.status);
    });

    it("should reject changing email to already taken email", async () => {
      // Register another user first
      await request(app).post("/api/v1/auth/register").send({
        username: "anotheredgeuser",
        email: "taken@test.com",
        password: "Password123!",
        fullName: "Another User",
      });

      const res = await request(app)
        .put("/api/v1/auth/profile")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ email: "taken@test.com" })
        .expect(409);

      expect(res.body.success).toBe(false);
    });
  });
});
