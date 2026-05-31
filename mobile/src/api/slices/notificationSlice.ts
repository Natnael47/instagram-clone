import { baseApi } from "../baseApi";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Notification } from "@/types/notification";

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<ApiResponse<PaginatedResponse<Notification>>, { page?: number; limit?: number; unreadOnly?: boolean }>({
      query: (params) => ({
        url: "/notifications",
        method: "GET",
        params,
      }),
      providesTags: ["Notification"],
    }),

    getUnreadCount: builder.query<ApiResponse<{ count: number }>, void>({
      query: () => ({
        url: "/notifications/unread/count",
        method: "GET",
      }),
      providesTags: ["Notification"],
    }),

    markAsRead: builder.mutation<ApiResponse<null>, string>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/read`,
        method: "PUT",
      }),
      invalidatesTags: ["Notification"],
    }),

    markAllAsRead: builder.mutation<ApiResponse<null>, void>({
      query: () => ({
        url: "/notifications/read-all",
        method: "PUT",
      }),
      invalidatesTags: ["Notification"],
    }),

    deleteNotification: builder.mutation<ApiResponse<null>, string>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notification"],
    }),

    deleteAllNotifications: builder.mutation<ApiResponse<null>, void>({
      query: () => ({
        url: "/notifications",
        method: "DELETE",
      }),
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useDeleteAllNotificationsMutation,
} = notificationApi;