import { baseApi } from "../baseApi";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Message, Conversation } from "@/types/message";

export const messageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getConversations: builder.query<ApiResponse<PaginatedResponse<Conversation>>, { page?: number; limit?: number }>({
      query: (params) => ({
        url: "/messages/conversations",
        method: "GET",
        params,
      }),
      providesTags: ["Conversation"],
    }),

    getMessages: builder.query<ApiResponse<PaginatedResponse<Message>>, { conversationId: string; page?: number; limit?: number }>({
      query: ({ conversationId, ...params }) => ({
        url: `/messages/${conversationId}`,
        method: "GET",
        params,
      }),
      providesTags: ["Message"],
    }),

    sendMessage: builder.mutation<ApiResponse<{ message: Message; conversation: Conversation }>, { conversationId?: string; recipientId?: string; text: string }>({
      query: (data) => ({
        url: "/messages",
        method: "POST",
        data,
      }),
      invalidatesTags: ["Message", "Conversation"],
    }),

    markAsRead: builder.mutation<ApiResponse<null>, string>({
      query: (messageId) => ({
        url: `/messages/${messageId}/read`,
        method: "PUT",
      }),
      invalidatesTags: ["Message", "Conversation"],
    }),

    deleteMessage: builder.mutation<ApiResponse<null>, string>({
      query: (messageId) => ({
        url: `/messages/${messageId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Message"],
    }),

    getUnreadCount: builder.query<ApiResponse<{ count: number }>, void>({
      query: () => ({
        url: "/messages/unread/count",
        method: "GET",
      }),
      providesTags: ["Conversation"],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useMarkAsReadMutation,
  useDeleteMessageMutation,
  useGetUnreadCountQuery,
} = messageApi;