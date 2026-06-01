import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { connectTestDB, clearDatabase, disconnectTestDB } from '../helpers/testDb';
import app from '../../src/app';
import request from 'supertest';

// Test user data
const testUser = {
  username: 'integrationtest',
  email: 'integration@test.com',
  password: 'Password123!',
  fullName: 'Integration Test User',
  bio: 'Testing integration',
};

let accessToken: string;
let refreshToken: string;
let userId: string;

describe('Auth Integration Tests', () => {
  
  // Connect to test database before all tests
  beforeAll(async () => {
    await connectTestDB();
    await clearDatabase();
  });

  // Clean up after all tests
  afterAll(async () => {
    await clearDatabase();
    await disconnectTestDB();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return 201', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('registered');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.username).toBe(testUser.username);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Save tokens for later tests
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
      userId = response.body.data.user._id;
    });

    it('should return 409 for duplicate email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          username: 'differentuser',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email');
    });

    it('should return 409 for duplicate username', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          email: 'different@test.com',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Username');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'incomplete',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Login');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user).toBeDefined();

      // Update tokens
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should login with username instead of email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.username,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 401 for wrong password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user profile', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.username).toBe(testUser.username);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/auth/profile', () => {
    it('should update user profile', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fullName: 'Updated Name',
          bio: 'Updated bio for testing',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.fullName).toBe('Updated Name');
      expect(response.body.data.user.bio).toBe('Updated bio for testing');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .send({
          fullName: 'No Auth',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/auth/change-password', () => {
    it('should change password successfully', async () => {
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: 'NewPassword456!',
          confirmNewPassword: 'NewPassword456!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should login with new password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'NewPassword456!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      accessToken = response.body.data.accessToken;
    });

    it('should return 400 for incorrect current password', async () => {
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongCurrentPassword',
          newPassword: 'AnotherPassword789!',
          confirmNewPassword: 'AnotherPassword789!', 
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should return 401 with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});