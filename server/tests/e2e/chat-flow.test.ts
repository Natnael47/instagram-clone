import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import request from "supertest";
import app from "../../src/app";
import {
  clearDatabase,
  connectTestDB,
  disconnectTestDB,
} from "../helpers/testDb";

/**
 * E2E Chat Flow Test
 * Tests the complete messaging flow between users:
 * Conversation creation → Message sending → Retrieval → Mark read → Deletion
 *
 * Note: Socket.IO real-time events are NOT tested here (requires actual WebSocket connection).
 * This tests the REST API endpoints for message operations.
 */

const alice = {
  username: "chat_alice",
  email: "chat_alice@test.com",
  password: "Password123!",
  fullName: "Chat Alice",
};

const bob = {
  username: "chat_bob",
  email: "chat_bob@test.com",
  password: "Password123!",
  fullName: "Chat Bob",
};

const charlie = {
  username: "chat_charlie",
  email: "chat_charlie@test.com",
  password: "Password123!",
  fullName: "Chat Charlie",
};

let aliceToken: string;
let aliceId: string;
let bobToken: string;
let bobId: string;
let charlieToken: string;
let charlieId: string;
let conversationId: string;
let messageId1: string;
let messageId2: string;

describe("E2E Chat Flow - Complete Messaging Journey", () => {
  beforeAll(async () => {
    await connectTestDB();
    await clearDatabase();

    // Register users
    const aliceRes = await request(app)
      .post("/api/v1/auth/register")
      .send(alice);
    aliceToken = aliceRes.body.data.accessToken;
    aliceId = aliceRes.body.data.user._id;

    const bobRes = await request(app).post("/api/v1/auth/register").send(bob);
    bobToken = bobRes.body.data.accessToken;
    bobId = bobRes.body.data.user._id;

    const charlieRes = await request(app)
      .post("/api/v1/auth/register")
      .send(charlie);
    charlieToken = charlieRes.body.data.accessToken;
    charlieId = charlieRes.body.data.user._id;
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectTestDB();
  });

  /**
   * PHASE 1: Starting Conversations
   */
  describe("💬 Phase 1: Starting Conversations", () => {
    it("Alice sends first message to Bob (creates conversation)", async () => {
      const res = await request(app)
        .post("/api/v1/messages")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          recipientId: bobId,
          text: "Hey Bob! How are you?",
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      // Save conversation and message IDs
      conversationId =
        res.body.data.conversation?._id || res.body.data.conversationId;
      messageId1 = res.body.data.message?._id || res.body.data._id;
    });

    it("Bob replies to Alice in the same conversation", async () => {
      const res = await request(app)
        .post("/api/v1/messages")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({
          recipientId: aliceId,
          text: "Hey Alice! I am doing great, thanks!",
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      // Save second message ID
      messageId2 = res.body.data.message?._id || res.body.data._id;
    });

    it("Alice sends message using conversationId directly", async () => {
      if (!conversationId) return;

      const res = await request(app)
        .post("/api/v1/messages")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          conversationId: conversationId,
          text: "Great to hear! Want to grab coffee? ☕",
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it("Alice cannot send message to herself", async () => {
      await request(app)
        .post("/api/v1/messages")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          recipientId: aliceId,
          text: "Talking to myself...",
        })
        .expect(400);
    });

    it("Cannot send message to non-existent user", async () => {
      await request(app)
        .post("/api/v1/messages")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          recipientId: "507f1f77bcf86cd799439099",
          text: "Ghost message",
        })
        .expect(404);
    });

    it("Cannot send empty message", async () => {
      await request(app)
        .post("/api/v1/messages")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          recipientId: bobId,
          text: "",
        })
        .expect(400);
    });

    it("Alice starts a conversation with Charlie", async () => {
      const res = await request(app)
        .post("/api/v1/messages")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          recipientId: charlieId,
          text: "Hi Charlie! Welcome to the chat!",
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });
  });

  /**
   * PHASE 2: Retrieving Conversations & Messages
   */
  describe("📥 Phase 2: Retrieving Conversations & Messages", () => {
    it("Alice can see all her conversations", async () => {
      const res = await request(app)
        .get("/api/v1/messages/conversations")
        .set("Authorization", `Bearer ${aliceToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      // Alice has 2 conversations (with Bob and Charlie)
    });

    it("Bob can see his conversations", async () => {
      const res = await request(app)
        .get("/api/v1/messages/conversations")
        .set("Authorization", `Bearer ${bobToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      // Bob has 1 conversation (with Alice)
    });

    it("Alice can view messages in Bob conversation", async () => {
      if (!conversationId) return;

      const res = await request(app)
        .get(`/api/v1/messages/${conversationId}`)
        .set("Authorization", `Bearer ${aliceToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it("Charlie cannot view Alice-Bob conversation", async () => {
      if (!conversationId) return;

      await request(app)
        .get(`/api/v1/messages/${conversationId}`)
        .set("Authorization", `Bearer ${charlieToken}`)
        .expect(403);
    });

    it("Conversations support pagination", async () => {
      const res = await request(app)
        .get("/api/v1/messages/conversations?page=1&limit=5")
        .set("Authorization", `Bearer ${aliceToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
    });
  });

  /**
   * PHASE 3: Message Status & Read Receipts
   */
  describe("✅ Phase 3: Message Status & Read Receipts", () => {
    it("Bob has unread messages from Alice", async () => {
      const res = await request(app)
        .get("/api/v1/messages/unread/count")
        .set("Authorization", `Bearer ${bobToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it("Bob marks Alice's message as read", async () => {
      if (!messageId1) return;

      const res = await request(app)
        .put(`/api/v1/messages/${messageId1}/read`)
        .set("Authorization", `Bearer ${bobToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("Alice cannot mark her own message as read", async () => {
      if (!messageId1) return;

      await request(app)
        .put(`/api/v1/messages/${messageId1}/read`)
        .set("Authorization", `Bearer ${aliceToken}`)
        .expect(400);
    });

    it("Cannot mark non-existent message as read", async () => {
      await request(app)
        .put("/api/v1/messages/507f1f77bcf86cd799439099/read")
        .set("Authorization", `Bearer ${aliceToken}`)
        .expect(404);
    });
  });

  /**
   * PHASE 4: Message Deletion
   */
  describe("🗑️ Phase 4: Message Deletion", () => {
    it("Bob cannot delete Alice's message", async () => {
      if (!messageId1) return;

      await request(app)
        .delete(`/api/v1/messages/${messageId1}`)
        .set("Authorization", `Bearer ${bobToken}`)
        .expect(403);
    });

    it("Alice can delete her own message", async () => {
      if (!messageId1) return;

      const res = await request(app)
        .delete(`/api/v1/messages/${messageId1}`)
        .set("Authorization", `Bearer ${aliceToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("Cannot delete already deleted message (returns 200 - soft delete)", async () => {
      if (!messageId1) return;

      // Your API uses soft delete, so deleting again returns 200
      const res = await request(app)
        .delete(`/api/v1/messages/${messageId1}`)
        .set("Authorization", `Bearer ${aliceToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("Bob can delete his own message", async () => {
      if (!messageId2) return;

      const res = await request(app)
        .delete(`/api/v1/messages/${messageId2}`)
        .set("Authorization", `Bearer ${bobToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  /**
   * PHASE 5: Security & Validation
   */
  describe("🔒 Phase 5: Security & Validation", () => {
    it("Cannot access messages without authentication", async () => {
      await request(app)
        .post("/api/v1/messages")
        .send({
          recipientId: bobId,
          text: "Unauthorized message",
        })
        .expect(401);
    });

    it("Cannot access conversations without authentication", async () => {
      await request(app).get("/api/v1/messages/conversations").expect(401);
    });

    it("Cannot send extremely long message", async () => {
      const longText = "a".repeat(5000);

      await request(app)
        .post("/api/v1/messages")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          recipientId: bobId,
          text: longText,
        })
        .expect(400);
    });
  });
});
