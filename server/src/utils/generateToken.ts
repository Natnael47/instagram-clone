import { env } from "@config/env";
import jwt from "jsonwebtoken";

/**
 * Generates a JWT token for authenticated users
 * @param userId - The user's ID to encode in the token
 * @returns JWT token string
 */
export const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
};

/**
 * Verifies and decodes a JWT token
 * @param token - The JWT token to verify
 * @returns Decoded token payload or null if invalid
 */
export const verifyToken = (token: string): { id: string } | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Extracts token from Authorization header
 * @param authHeader - The Authorization header value
 * @returns Token string or null if not found
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  return token || null;
};
