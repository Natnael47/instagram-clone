import { createApi } from "@reduxjs/toolkit/query/react";
import type { AxiosRequestConfig } from "axios";
import api from "./client/axiosInstance";
import type { ApiResponse } from "@/types/api";

const axiosBaseQuery =
  () =>
  async ({
    url,
    method,
    data,
    params,
    headers,
  }: {
    url: string;
    method: AxiosRequestConfig["method"];
    data?: unknown;
    params?: unknown;
    headers?: Record<string, string>;
  }) => {
    try {
      const result = await api({
        url,
        method,
        data,
        params,
        headers,
      });
      return { data: result.data };
    } catch (axiosError: any) {
      return {
        error: {
          status: axiosError.response?.status,
          data: axiosError.response?.data || axiosError.message,
        },
      };
    }
  };

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: axiosBaseQuery(),
  tagTypes: [
    "Auth",
    "User",
    "Post",
    "Feed",
    "Story",
    "Comment",
    "Message",
    "Conversation",
    "Notification",
  ],
  endpoints: () => ({}),
});