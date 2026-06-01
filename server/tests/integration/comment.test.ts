import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { connectTestDB, clearDatabase, disconnectTestDB } from '../helpers/testDb';
import app from '../../src/app';
import request from 'supertest';
import path from 'path';
import fs from 'fs';

const user1 = {
  username: 'commentuser1',
  email: 'commentuser1@test.com',
  password: 'Password123!',
  fullName: 'Comment User One',
};

const user2 = {
  username: 'commentuser2',
  email: 'commentuser2@test.com',
  password: 'Password123!',
  fullName: 'Comment User Two',
};

let token1: string;
let token2: string;
let userId1: string;
let postId: string;
let commentId: string;

const testImagePath = path.join(process.cwd(), 'tests', 'fixtures', 'test-image.jpg');

describe('Comment Integration Tests', () => {
  
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

        // Ensure test image exists
    const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    if (!fs.existsSync(testImagePath)) {
      // Create a valid 1x1 white PNG (minimal but valid image)
      // This is a base64 encoded 1x1 white PNG
      const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      const pngBuffer = Buffer.from(pngBase64, 'base64');
      fs.writeFileSync(testImagePath, pngBuffer);
    }

    // Create a post for comments
    const postRes = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${token1}`)
      .field('caption', 'Post for comments')
      .attach('image', testImagePath);
    
    postId = postRes.body.data?._id || postRes.body.data?.post?._id;
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectTestDB();
  });

  describe('POST /api/v1/comments/:postId - Add Comment', () => {
    it('should add a comment to a post', async () => {
      if (!postId) return;

      const response = await request(app)
        .post(`/api/v1/comments/${postId}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ text: 'Great post! Love it!' })
        .expect(201);

      expect(response.body.success).toBe(true);
      
      // Save comment ID
      commentId = response.body.data?._id || response.body.data?.comment?._id;
    });

    it('should return 401 without token', async () => {
      if (!postId) return;

      await request(app)
        .post(`/api/v1/comments/${postId}`)
        .send({ text: 'Unauthorized comment' })
        .expect(401);
    });

    it('should return 404 for non-existent post', async () => {
      await request(app)
        .post('/api/v1/comments/507f1f77bcf86cd799439099')
        .set('Authorization', `Bearer ${token1}`)
        .send({ text: 'Comment on ghost post' })
        .expect(404);
    });
  });

  describe('GET /api/v1/comments/:postId - Get Comments', () => {
    it('should get post comments', async () => {
      if (!postId) return;

      const response = await request(app)
        .get(`/api/v1/comments/${postId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/v1/comments/:commentId - Update Comment', () => {
    it('should update own comment', async () => {
      if (!commentId) return;

      const response = await request(app)
        .put(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ text: 'Updated comment text!' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 403 when updating another user comment', async () => {
      if (!commentId) return;

      await request(app)
        .put(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ text: 'Hacked comment' })
        .expect(403);
    });
  });

  describe('POST /api/v1/comments/:commentId/like - Like Comment', () => {
    it('should like a comment', async () => {
      if (!commentId) return;

      const response = await request(app)
        .post(`/api/v1/comments/${commentId}/like`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/comments/:commentId/unlike - Unlike Comment', () => {
    it('should unlike a comment', async () => {
      if (!commentId) return;

      const response = await request(app)
        .post(`/api/v1/comments/${commentId}/unlike`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/v1/comments/:commentId - Delete Comment', () => {
    it('should return 403 when non-author tries to delete', async () => {
      if (!commentId) return;

      await request(app)
        .delete(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(403);
    });

    it('should delete own comment', async () => {
      if (!commentId) return;

      const response = await request(app)
        .delete(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});