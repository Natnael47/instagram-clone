import { baseApi } from "../baseApi";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  RefreshResponse,
} from "@/types/auth";
import type { ApiResponse } from "@/types/api";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<ApiResponse<AuthResponse>, LoginPayload>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        data: credentials,
      }),
      invalidatesTags: ["Auth", "User", "Feed"],
    }),

    register: builder.mutation<ApiResponse<AuthResponse>, RegisterPayload>({
      query: (userData) => ({
        url: "/auth/register",
        method: "POST",
        data: userData,
      }),
      invalidatesTags: ["Auth", "User"],
    }),

    getCurrentUser: builder.query<ApiResponse<{ user: AuthResponse["user"] }>, void>({
      query: () => ({
        url: "/auth/me",
        method: "GET",
      }),
      providesTags: ["Auth"],
    }),

    refreshToken: builder.mutation<ApiResponse<RefreshResponse>, { refreshToken: string }>({
      query: (data) => ({
        url: "/auth/refresh",
        method: "POST",
        data,
      }),
    }),

    logout: builder.mutation<ApiResponse<null>, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["Auth"],
    }),

    changePassword: builder.mutation<
      ApiResponse<null>,
      { currentPassword: string; newPassword: string }
    >({
      query: (data) => ({
        url: "/auth/change-password",
        method: "PUT",
        data,
      }),
    }),

    updateProfile: builder.mutation<
      ApiResponse<{ user: AuthResponse["user"] }>,
      FormData | Partial<RegisterPayload>
    >({
      query: (data) => ({
        url: "/auth/profile",
        method: "PUT",
        data,
        headers: data instanceof FormData
          ? { "Content-Type": "multipart/form-data" }
          : undefined,
      }),
      invalidatesTags: ["Auth", "User"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetCurrentUserQuery,
  useRefreshTokenMutation,
  useLogoutMutation,
  useChangePasswordMutation,
  useUpdateProfileMutation,
} = authApi;