import { baseApi } from "../baseApi";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Comment } from "@/types/comment";

export const commentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPostComments: builder.query<ApiResponse<PaginatedResponse<Comment>>, { postId: string; page?: number; limit?: number }>({
      query: ({ postId, ...params }) => ({
        url: `/comments/${postId}`,
        method: "GET",
        params,
      }),
      providesTags: ["Comment"],
    }),

    addComment: builder.mutation<ApiResponse<{ comment: Comment }>, { postId: string; text: string }>({
      query: ({ postId, text }) => ({
        url: `/comments/${postId}`,
        method: "POST",
        data: { text },
      }),
      invalidatesTags: ["Comment", "Post", "Feed"],
    }),

    updateComment: builder.mutation<ApiResponse<{ comment: Comment }>, { commentId: string; text: string }>({
      query: ({ commentId, text }) => ({
        url: `/comments/${commentId}`,
        method: "PUT",
        data: { text },
      }),
      invalidatesTags: ["Comment"],
    }),

    deleteComment: builder.mutation<ApiResponse<null>, string>({
      query: (commentId) => ({
        url: `/comments/${commentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Comment", "Post"],
    }),

    likeComment: builder.mutation<ApiResponse<null>, string>({
      query: (commentId) => ({
        url: `/comments/${commentId}/like`,
        method: "POST",
      }),
      invalidatesTags: ["Comment"],
    }),

    unlikeComment: builder.mutation<ApiResponse<null>, string>({
      query: (commentId) => ({
        url: `/comments/${commentId}/unlike`,
        method: "POST",
      }),
      invalidatesTags: ["Comment"],
    }),
  }),
});

export const {
  useGetPostCommentsQuery,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useLikeCommentMutation,
  useUnlikeCommentMutation,
} = commentApi;