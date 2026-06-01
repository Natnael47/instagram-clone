import { describe, expect, it } from "bun:test";
import jwt from "jsonwebtoken";
import {
  extractTokenFromHeader,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "../../../src/utils/generateToken";

const TEST_USER_ID = "507f1f77bcf86cd799439011";

describe("generateToken Utilities", () => {
  describe("generateAccessToken()", () => {
    it("should generate a valid JWT access token", () => {
      const token = generateAccessToken(TEST_USER_ID);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should include user ID and type in payload", () => {
      const token = generateAccessToken(TEST_USER_ID);

      // Decode without verification to inspect payload
      const decoded = jwt.decode(token) as {
        id: string;
        type: string;
      };

      expect(decoded).not.toBeNull();
      expect(decoded.id).toBe(TEST_USER_ID);
      expect(decoded.type).toBe("access");
    });

    it("should set expiration time", () => {
      const token = generateAccessToken(TEST_USER_ID);
      const decoded = jwt.decode(token) as { exp: number; iat: number };

      // Access tokens expire in 15 minutes (900 seconds)
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp - decoded.iat).toBe(900); // 15 minutes in seconds
    });

    it("should generate tokens with different timestamps after delay", async () => {
      const token1 = generateAccessToken(TEST_USER_ID);

      // Wait 1 second to get different iat
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const token2 = generateAccessToken(TEST_USER_ID);

      // Tokens should be different due to different iat
      expect(token1).not.toBe(token2);
    });
  });

  describe("generateRefreshToken()", () => {
    it("should generate a valid JWT refresh token", () => {
      const token = generateRefreshToken(TEST_USER_ID);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
    });

    it("should include user ID and type in payload", () => {
      const token = generateRefreshToken(TEST_USER_ID);

      const decoded = jwt.decode(token) as {
        id: string;
        type: string;
      };

      expect(decoded).not.toBeNull();
      expect(decoded.id).toBe(TEST_USER_ID);
      expect(decoded.type).toBe("refresh");
    });

    it("should have longer expiration than access token", () => {
      const accessToken = generateAccessToken(TEST_USER_ID);
      const refreshToken = generateRefreshToken(TEST_USER_ID);

      const accessDecoded = jwt.decode(accessToken) as { exp: number };
      const refreshDecoded = jwt.decode(refreshToken) as { exp: number };

      // Refresh token should expire after access token
      expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);
    });

    it("should expire in 30 days by default (matching .env.example)", () => {
      const token = generateRefreshToken(TEST_USER_ID);
      const decoded = jwt.decode(token) as { exp: number; iat: number };

      // 30 days = 2592000 seconds (matching JWT_REFRESH_EXPIRES_IN=30d)
      expect(decoded.exp - decoded.iat).toBe(2592000);
    });
  });

  describe("verifyToken()", () => {
    it("should verify a valid token", () => {
      const token = generateAccessToken(TEST_USER_ID);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.id).toBe(TEST_USER_ID);
      expect(decoded?.type).toBe("access");
    });

    it("should return null for invalid token", () => {
      const decoded = verifyToken("invalid-token");
      expect(decoded).toBeNull();
    });

    it("should return null for empty string", () => {
      const decoded = verifyToken("");
      expect(decoded).toBeNull();
    });

    it("should return null for malformed JWT", () => {
      const decoded = verifyToken("not.a.jwt");
      expect(decoded).toBeNull();
    });

    it("should return null for token signed with wrong secret", () => {
      // Create token with different secret
      const wrongToken = jwt.sign(
        { id: TEST_USER_ID, type: "access" },
        "wrong-secret-key-that-is-different-!!",
        { expiresIn: "15m" },
      );

      const decoded = verifyToken(wrongToken);
      expect(decoded).toBeNull();
    });

    it("should handle null input gracefully", () => {
      const decoded = verifyToken(null as unknown as string);
      expect(decoded).toBeNull();
    });
  });

  describe("extractTokenFromHeader()", () => {
    it("should extract token from valid Bearer header", () => {
      const token = generateAccessToken(TEST_USER_ID);
      const extracted = extractTokenFromHeader(`Bearer ${token}`);

      expect(extracted).toBe(token);
    });

    it("should return null for missing header", () => {
      expect(extractTokenFromHeader()).toBeNull();
      expect(extractTokenFromHeader(undefined)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(extractTokenFromHeader("")).toBeNull();
    });

    it("should return null for header without Bearer prefix", () => {
      const token = generateAccessToken(TEST_USER_ID);
      expect(extractTokenFromHeader(token)).toBeNull();
    });

    it("should return null for header with wrong prefix", () => {
      const token = generateAccessToken(TEST_USER_ID);
      expect(extractTokenFromHeader(`Basic ${token}`)).toBeNull();
      expect(extractTokenFromHeader(`Token ${token}`)).toBeNull();
    });

    it("should handle Bearer with lowercase (strict check)", () => {
      const token = generateAccessToken(TEST_USER_ID);
      const extracted = extractTokenFromHeader(`bearer ${token}`);

      // Your implementation checks for exact "Bearer " prefix
      expect(extracted).toBeNull();
    });

    it("should return null for double spaces (actual behavior)", () => {
      const token = generateAccessToken(TEST_USER_ID);
      const extracted = extractTokenFromHeader(`Bearer  ${token}`);

      // Double space means split creates ["Bearer", "", "token..."]
      // So split(" ")[1] is empty string, not the token
      // This is the actual behavior of your implementation
      expect(extracted).toBeNull();
    });

    it("should return null if only Bearer without token", () => {
      expect(extractTokenFromHeader("Bearer ")).toBeNull();
    });
  });

  describe("Integration - Full Token Flow", () => {
    it("should work through full generate → extract → verify cycle", () => {
      // 1. Generate token
      const accessToken = generateAccessToken(TEST_USER_ID);

      // 2. Simulate client sending in header
      const authHeader = `Bearer ${accessToken}`;

      // 3. Extract token from header
      const extractedToken = extractTokenFromHeader(authHeader);
      expect(extractedToken).toBe(accessToken);

      // 4. Verify the extracted token
      const decoded = verifyToken(extractedToken!);
      expect(decoded).not.toBeNull();
      expect(decoded?.id).toBe(TEST_USER_ID);
      expect(decoded?.type).toBe("access");
    });

    it("should distinguish between access and refresh tokens", () => {
      const accessToken = generateAccessToken(TEST_USER_ID);
      const refreshToken = generateRefreshToken(TEST_USER_ID);

      const accessDecoded = verifyToken(accessToken);
      const refreshDecoded = verifyToken(refreshToken);

      expect(accessDecoded?.type).toBe("access");
      expect(refreshDecoded?.type).toBe("refresh");
    });
  });
});
