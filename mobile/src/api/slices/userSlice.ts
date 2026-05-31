import { baseApi } from "../baseApi";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { User } from "@/types/user";

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserProfile: builder.query<ApiResponse<{ user: User }>, string>({
      query: (userId) => ({
        url: `/users/${userId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, userId) => [{ type: "User", id: userId }],
    }),

    searchUsers: builder.query<ApiResponse<PaginatedResponse<User>>, { q: string; page?: number; limit?: number }>({
      query: (params) => ({
        url: "/users/search",
        method: "GET",
        params,
      }),
      providesTags: ["User"],
    }),

    followUser: builder.mutation<ApiResponse<null>, string>({
      query: (userId) => ({
        url: `/users/${userId}/follow`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, userId) => [{ type: "User", id: userId }, "Feed"],
    }),

    unfollowUser: builder.mutation<ApiResponse<null>, string>({
      query: (userId) => ({
        url: `/users/${userId}/unfollow`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, userId) => [{ type: "User", id: userId }, "Feed"],
    }),

    getFollowers: builder.query<ApiResponse<PaginatedResponse<User>>, { userId: string; page?: number; limit?: number }>({
      query: ({ userId, ...params }) => ({
        url: `/users/${userId}/followers`,
        method: "GET",
        params,
      }),
      providesTags: ["User"],
    }),

    getFollowing: builder.query<ApiResponse<PaginatedResponse<User>>, { userId: string; page?: number; limit?: number }>({
      query: ({ userId, ...params }) => ({
        url: `/users/${userId}/following`,
        method: "GET",
        params,
      }),
      providesTags: ["User"],
    }),

    getSuggestedUsers: builder.query<ApiResponse<{ suggestions: User[] }>, { limit?: number }>({
      query: (params) => ({
        url: "/users/suggestions",
        method: "GET",
        params,
      }),
      providesTags: ["User"],
    }),
  }),
});

export const {
  useGetUserProfileQuery,
  useSearchUsersQuery,
  useFollowUserMutation,
  useUnfollowUserMutation,
  useGetFollowersQuery,
  useGetFollowingQuery,
  useGetSuggestedUsersQuery,
} = userApi;