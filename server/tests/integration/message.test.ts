import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { connectTestDB, clearDatabase, disconnectTestDB } from '../helpers/testDb';
import app from '../../src/app';
import request from 'supertest';

const user1 = {
  username: 'messageuser1',
  email: 'messageuser1@test.com',
  password: 'Password123!',
  fullName: 'Message User One',
};

const user2 = {
  username: 'messageuser2',
  email: 'messageuser2@test.com',
  password: 'Password123!',
  fullName: 'Message User Two',
};

let token1: string;
let token2: string;
let userId1: string;
let userId2: string;
let conversationId: string;
let messageId: string;

describe('Message Integration Tests', () => {
  
  beforeAll(async () => {
    await connectTestDB();
    await clearDatabase();

    // Register users
    const res1 = await request(app)
      .post('/api/v1/auth/register')
      .send(user1);
    token1 = res1.body.data.accessToken;
    userId1 = res1.body.data.user._id;

    const res2 = await request(app)
      .post('/api/v1/auth/register')
      .send(user2);
    token2 = res2.body.data.accessToken;
    userId2 = res2.body.data.user._id;
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectTestDB();
  });

  describe('POST /api/v1/messages - Send Message', () => {
    it('should send a message to another user', async () => {
      const response = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          recipientId: userId2,
          text: 'Hey! How are you?',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Save IDs
      messageId = response.body.data.message?._id || response.body.data._id;
      conversationId = response.body.data.conversation?._id || response.body.data.conversationId;
    });

    it('should send message to existing conversation', async () => {
      if (!conversationId) return;

      const response = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          conversationId: conversationId,
          text: 'Another message!',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 when sending to yourself', async () => {
      await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          recipientId: userId1,
          text: 'Talking to myself',
        })
        .expect(400);
    });

    it('should return 401 without token', async () => {
      await request(app)
        .post('/api/v1/messages')
        .send({
          recipientId: userId2,
          text: 'Unauthorized message',
        })
        .expect(401);
    });

    it('should return 404 for non-existent recipient', async () => {
      await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          recipientId: '507f1f77bcf86cd799439099',
          text: 'Ghost message',
        })
        .expect(404);
    });
  });

  describe('GET /api/v1/messages/conversations - Get Conversations', () => {
    it('should return user conversations', async () => {
      const response = await request(app)
        .get('/api/v1/messages/conversations')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return 401 without token', async () => {
      await request(app)
        .get('/api/v1/messages/conversations')
        .expect(401);
    });
  });

  describe('GET /api/v1/messages/:conversationId - Get Messages', () => {
    it('should return conversation messages', async () => {
      if (!conversationId) return;

      const response = await request(app)
        .get(`/api/v1/messages/${conversationId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 403 for non-participant', async () => {
      // Register a third user who's not in the conversation
      const res3 = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'outsider',
          email: 'outsider@test.com',
          password: 'Password123!',
          fullName: 'Outsider',
        });
      
      if (!conversationId) return;

      await request(app)
        .get(`/api/v1/messages/${conversationId}`)
        .set('Authorization', `Bearer ${res3.body.data.accessToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/messages/unread/count - Unread Count', () => {
    it('should return unread message count', async () => {
      const response = await request(app)
        .get('/api/v1/messages/unread/count')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/v1/messages/:messageId/read - Mark as Read', () => {
    it('should mark message as read', async () => {
      if (!messageId) return;

      const response = await request(app)
        .put(`/api/v1/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 when marking own message as read', async () => {
      if (!messageId) return;

      await request(app)
        .put(`/api/v1/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(400);
    });
  });

  describe('DELETE /api/v1/messages/:messageId - Delete Message', () => {
    it('should return 403 when non-sender tries to delete', async () => {
      if (!messageId) return;

      await request(app)
        .delete(`/api/v1/messages/${messageId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);
    });

    it('should delete own message', async () => {
      if (!messageId) return;

      const response = await request(app)
        .delete(`/api/v1/messages/${messageId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});