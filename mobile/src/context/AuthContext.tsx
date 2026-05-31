import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { storage } from "@/utils/storage";
import { useGetCurrentUserQuery, useLoginMutation, useLogoutMutation, useRegisterMutation } from "@/api/slices/authSlice";
import type { User } from "@/types/user";
import type { LoginPayload, RegisterPayload } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUser: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [loginMutation] = useLoginMutation();
  const [registerMutation] = useRegisterMutation();
  const [logoutMutation] = useLogoutMutation();

  const { data: currentUserData, isLoading: isUserLoading } = useGetCurrentUserQuery(undefined, {
    skip: !token,
  });

  useEffect(() => {
    if (currentUserData?.data?.user) {
      setUser(currentUserData.data.user);
    }
  }, [currentUserData]);

  useEffect(() => {
    const loadStoredAuth = async (): Promise<void> => {
      try {
        const storedToken = await storage.getToken();
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (error) {
        console.error("Failed to load stored auth:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    loadStoredAuth();
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<void> => {
    const result = await loginMutation(payload).unwrap();
    const { accessToken, refreshToken, user: userData } = result.data;
    await storage.setToken(accessToken);
    await storage.setRefreshToken(refreshToken);
    await storage.setUser(userData);
    setToken(accessToken);
    setUser(userData);
  }, [loginMutation]);

  const register = useCallback(async (payload: RegisterPayload): Promise<void> => {
    const result = await registerMutation(payload).unwrap();
    const { accessToken, refreshToken, user: userData } = result.data;
    await storage.setToken(accessToken);
    await storage.setRefreshToken(refreshToken);
    await storage.setUser(userData);
    setToken(accessToken);
    setUser(userData);
  }, [registerMutation]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutMutation().unwrap();
    } catch {
      // Proceed with local logout even if server call fails
    }
    await storage.clearAll();
    setToken(null);
    setUser(null);
  }, [logoutMutation]);

  const updateUser = useCallback((updatedUser: User): void => {
    setUser(updatedUser);
    storage.setUser(updatedUser);
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isLoading: isInitialLoading || isUserLoading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    updateUser,
  }), [user, token, isInitialLoading, isUserLoading, login, register, logout, updateUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};