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
  username: "notifuser1",
  email: "notifuser1@test.com",
  password: "Password123!",
  fullName: "Notification User One",
};

const user2 = {
  username: "notifuser2",
  email: "notifuser2@test.com",
  password: "Password123!",
  fullName: "Notification User Two",
};

let token1: string;
let token2: string;
let userId1: string;
let userId2: string;
let notificationId: string;

const testImagePath = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "test-image.png",
);

describe("Notification Integration Tests", () => {
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

    // Generate notifications: User2 follows User1, likes post, comments
    // User2 follows User1
    await request(app)
      .post(`/api/v1/users/${userId1}/follow`)
      .set("Authorization", `Bearer ${token2}`);

    // User1 creates a post
    const postRes = await request(app)
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${token1}`)
      .field("caption", "Post for notifications")
      .attach("image", testImagePath);

    const postId = postRes.body.data?._id || postRes.body.data?.post?._id;

    // User2 likes the post
    if (postId) {
      await request(app)
        .post(`/api/v1/posts/${postId}/like`)
        .set("Authorization", `Bearer ${token2}`);

      // User2 comments on the post
      await request(app)
        .post(`/api/v1/comments/${postId}`)
        .set("Authorization", `Bearer ${token2}`)
        .send({ text: "Nice post!" });
    }
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectTestDB();
  });

  describe("GET /api/v1/notifications - Get Notifications", () => {
    it("should return user notifications", async () => {
      const response = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // Save first notification ID
      const notifications =
        response.body.data.data || response.body.data.notifications || [];
      if (notifications.length > 0) {
        notificationId = notifications[0]._id;
      }
    });

    it("should support unreadOnly filter", async () => {
      const response = await request(app)
        .get("/api/v1/notifications?unreadOnly=true")
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should return 401 without token", async () => {
      await request(app).get("/api/v1/notifications").expect(401);
    });
  });

  describe("GET /api/v1/notifications/unread/count - Unread Count", () => {
    it("should return unread notification count", async () => {
      const response = await request(app)
        .get("/api/v1/notifications/unread/count")
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe("PUT /api/v1/notifications/:notificationId/read - Mark as Read", () => {
    it("should mark notification as read", async () => {
      if (!notificationId) return;

      const response = await request(app)
        .put(`/api/v1/notifications/${notificationId}/read`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should return 403 for non-recipient", async () => {
      if (!notificationId) return;

      await request(app)
        .put(`/api/v1/notifications/${notificationId}/read`)
        .set("Authorization", `Bearer ${token2}`)
        .expect(403);
    });
  });

  describe("PUT /api/v1/notifications/read-all - Mark All as Read", () => {
    it("should mark all notifications as read", async () => {
      const response = await request(app)
        .put("/api/v1/notifications/read-all")
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("DELETE /api/v1/notifications/:notificationId - Delete Notification", () => {
    it("should return 403 for non-recipient", async () => {
      if (!notificationId) return;

      await request(app)
        .delete(`/api/v1/notifications/${notificationId}`)
        .set("Authorization", `Bearer ${token2}`)
        .expect(403);
    });

    it("should delete notification", async () => {
      if (!notificationId) return;

      const response = await request(app)
        .delete(`/api/v1/notifications/${notificationId}`)
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("DELETE /api/v1/notifications - Delete All", () => {
    it("should delete all notifications", async () => {
      const response = await request(app)
        .delete("/api/v1/notifications")
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
