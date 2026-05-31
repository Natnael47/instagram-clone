import { baseApi } from "../baseApi";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Post } from "@/types/post";
import type { Comment } from "@/types/comment";

export const postApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFeed: builder.query<ApiResponse<PaginatedResponse<Post>>, { page?: number; limit?: number }>({
      query: (params) => ({
        url: "/feed",
        method: "GET",
        params,
      }),
      providesTags: ["Feed"],
    }),

    getGlobalFeed: builder.query<ApiResponse<PaginatedResponse<Post>>, { page?: number; limit?: number }>({
      query: (params) => ({
        url: "/feed/global",
        method: "GET",
        params,
      }),
      providesTags: ["Feed"],
    }),

    getPost: builder.query<ApiResponse<{ post: Post }>, string>({
      query: (postId) => ({
        url: `/posts/${postId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, postId) => [{ type: "Post", id: postId }],
    }),

    createPost: builder.mutation<ApiResponse<{ post: Post }>, FormData>({
      query: (formData) => ({
        url: "/posts",
        method: "POST",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      }),
      invalidatesTags: ["Feed", "Post", "User"],
    }),

    deletePost: builder.mutation<ApiResponse<null>, string>({
      query: (postId) => ({
        url: `/posts/${postId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Feed", "Post", "User"],
    }),

    likePost: builder.mutation<ApiResponse<null>, string>({
      query: (postId) => ({
        url: `/posts/${postId}/like`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, postId) => [{ type: "Post", id: postId }, "Feed"],
    }),

    unlikePost: builder.mutation<ApiResponse<null>, string>({
      query: (postId) => ({
        url: `/posts/${postId}/unlike`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, postId) => [{ type: "Post", id: postId }, "Feed"],
    }),

    getUserPosts: builder.query<ApiResponse<PaginatedResponse<Post>>, { userId: string; page?: number; limit?: number }>({
      query: ({ userId, ...params }) => ({
        url: `/posts/user/${userId}`,
        method: "GET",
        params,
      }),
      providesTags: ["Post", "User"],
    }),

    updateCaption: builder.mutation<ApiResponse<{ post: Post }>, { postId: string; caption: string }>({
      query: ({ postId, caption }) => ({
        url: `/posts/${postId}/caption`,
        method: "PUT",
        data: { caption },
      }),
      invalidatesTags: (_result, _error, { postId }) => [{ type: "Post", id: postId }],
    }),
  }),
});

export const {
  useGetFeedQuery,
  useGetGlobalFeedQuery,
  useGetPostQuery,
  useCreatePostMutation,
  useDeletePostMutation,
  useLikePostMutation,
  useUnlikePostMutation,
  useGetUserPostsQuery,
  useUpdateCaptionMutation,
} = postApi;