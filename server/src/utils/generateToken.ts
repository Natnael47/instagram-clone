import { env } from "@config/env";
import jwt from "jsonwebtoken";

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ id: userId, type: "access" }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ id: userId, type: "refresh" }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
};

export const verifyToken = (
  token: string,
): { id: string; type: string } | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      type: string;
    };
    return decoded;
  } catch (error) {
    return null;
  }
};

export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  return token || null;
};
